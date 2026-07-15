using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Authorization;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;
using Onboardly.Server.Models;

namespace Onboardly.Server.Repositories;

// EF Core implementation of IRoleRepository — all query/persist logic for roles
// lives here so controllers stay focused on HTTP concerns.
public class RoleRepository : IRoleRepository
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenant;

    public RoleRepository(AppDbContext db, ITenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    public async Task<IReadOnlyList<RoleListItem>> GetAll()
    {
        var isPlatform = _tenant.IgnoreTenantBoundary;
        var orgId = _tenant.OrganizationId;

        // Platform view manages global (platform) roles; an org context manages
        // that org's own roles plus shared system templates (shown read-only).
        var query = _db.Roles.AsQueryable();
        query = isPlatform
            ? query.Where(r => r.Scope == RoleScope.Global)
            : query.Where(r => r.OrganizationId == orgId
                || (r.OrganizationId == null && r.Scope == RoleScope.Organization));

        var roles = await query
            .OrderBy(r => r.Name)
            .Select(r => new
            {
                r.Id,
                r.Name,
                r.Scope,
                r.OrganizationId,
                PermissionIds = r.Permissions.Select(p => p.Id).ToArray(),
                Permissions = r.Permissions.Select(p => p.Name).OrderBy(n => n).ToArray(),
                UserCount = r.Users.Count,
            })
            .ToListAsync();

        return roles
            .Select(r => new RoleListItem(
                r.Id,
                r.Name,
                r.PermissionIds,
                r.Permissions,
                r.UserCount,
                r.Scope.ToString(),
                !Authorization.Roles.System.Contains(r.Name)
                    && (isPlatform ? r.Scope == RoleScope.Global : r.OrganizationId == orgId)))
            .ToList();
    }

    public Task<Role?> GetById(int id) =>
        _db.Roles.FirstOrDefaultAsync(r => r.Id == id);

    public Task<Role?> GetByIdWithPermissions(int id) =>
        _db.Roles.Include(r => r.Permissions).FirstOrDefaultAsync(r => r.Id == id);

    public async Task<Role> Create(CreateRoleRequest request)
    {
        // A role created at platform scope is global; one created inside a tenant
        // belongs to that tenant.
        var role = new Role { Name = request.Name.Trim() };
        if (_tenant.IgnoreTenantBoundary)
        {
            role.Scope = RoleScope.Global;
            role.OrganizationId = null;
        }
        else
        {
            role.Scope = RoleScope.Organization;
            role.OrganizationId = _tenant.OrganizationId;
        }

        _db.Roles.Add(role);
        await _db.SaveChangesAsync();
        return role;
    }

    public async Task SetPermissions(Role role, int[] permissionIds)
    {
        // Only permissions matching the role's scope may be assigned: org roles
        // never hold platform (global) permissions, and vice versa.
        var permissions = await _db.Permissions
            .Where(p => permissionIds.Contains(p.Id))
            .Where(p => role.Scope == RoleScope.Global ? p.IsGlobal : !p.IsGlobal)
            .ToListAsync();

        role.Permissions.Clear();
        foreach (var permission in permissions)
            role.Permissions.Add(permission);

        await _db.SaveChangesAsync();
    }

    public async Task<IReadOnlyList<int>> GetUserIds(int roleId)
    {
        return await _db.Users
            .Where(u => u.Roles.Any(r => r.Id == roleId))
            .Select(u => u.Id)
            .ToListAsync();
    }

    public async Task Delete(Role role)
    {
        _db.Roles.Remove(role);
        await _db.SaveChangesAsync();
    }

    public Task<bool> NameExistsAsync(string name)
    {
        // Role names are unique per tenant (and per global scope), so check
        // within the active context.
        if (_tenant.IgnoreTenantBoundary)
            return _db.Roles.AnyAsync(r => r.Name == name && r.OrganizationId == null);

        var orgId = _tenant.OrganizationId;
        return _db.Roles.AnyAsync(r => r.Name == name && r.OrganizationId == orgId);
    }

    // Whether the current caller may modify the given role in the active context.
    public bool CanManage(Role role) =>
        _tenant.IgnoreTenantBoundary
            ? role.Scope == RoleScope.Global
            : role.OrganizationId == _tenant.OrganizationId;
}
