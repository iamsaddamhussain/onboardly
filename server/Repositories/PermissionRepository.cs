using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;
using Onboardly.Server.Models;

namespace Onboardly.Server.Repositories;

// EF Core implementation of IPermissionRepository — all query/persist logic for
// permissions lives here so controllers stay focused on HTTP concerns.
public class PermissionRepository : IPermissionRepository
{
    private readonly AppDbContext _db;

    public PermissionRepository(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<PermissionListItem>> GetAll() =>
        await _db.Permissions
            .OrderBy(p => p.Name)
            .Select(p => new PermissionListItem(p.Id, p.Name))
            .ToListAsync();

    public async Task<Permission> Create(CreatePermissionRequest request)
    {
        var permission = new Permission { Name = request.Name.Trim() };
        _db.Permissions.Add(permission);
        await _db.SaveChangesAsync();
        return permission;
    }

    public Task<bool> NameExistsAsync(string name) =>
        _db.Permissions.AnyAsync(p => p.Name == name);
}
