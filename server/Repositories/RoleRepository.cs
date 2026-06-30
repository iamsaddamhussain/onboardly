using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;
using Onboardly.Server.Models;

namespace Onboardly.Server.Repositories;

// EF Core implementation of IRoleRepository — all query/persist logic for roles
// lives here so controllers stay focused on HTTP concerns.
public class RoleRepository : IRoleRepository
{
    private readonly AppDbContext _db;

    public RoleRepository(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<RoleListItem>> GetAll() =>
        await _db.Roles
            .OrderBy(r => r.Name)
            .Select(r => new RoleListItem(
                r.Id,
                r.Name,
                r.Permissions.Select(p => p.Id).ToArray(),
                r.Permissions.Select(p => p.Name).OrderBy(n => n).ToArray(),
                r.Users.Count))
            .ToListAsync();

    public Task<Role?> GetById(int id) =>
        _db.Roles.FirstOrDefaultAsync(r => r.Id == id);

    public Task<Role?> GetByIdWithPermissions(int id) =>
        _db.Roles.Include(r => r.Permissions).FirstOrDefaultAsync(r => r.Id == id);

    public async Task<Role> Create(CreateRoleRequest request)
    {
        var role = new Role { Name = request.Name.Trim() };
        _db.Roles.Add(role);
        await _db.SaveChangesAsync();
        return role;
    }

    public async Task SetPermissions(Role role, int[] permissionIds)
    {
        var permissions = await _db.Permissions
            .Where(p => permissionIds.Contains(p.Id))
            .ToListAsync();

        role.Permissions.Clear();
        foreach (var permission in permissions)
            role.Permissions.Add(permission);

        await _db.SaveChangesAsync();
    }

    public async Task Delete(Role role)
    {
        _db.Roles.Remove(role);
        await _db.SaveChangesAsync();
    }

    public Task<bool> NameExistsAsync(string name) =>
        _db.Roles.AnyAsync(r => r.Name == name);
}
