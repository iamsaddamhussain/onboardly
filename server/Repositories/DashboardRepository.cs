using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Authorization;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;
using Onboardly.Server.Models;

namespace Onboardly.Server.Repositories;

// EF Core implementation of IDashboardRepository — all aggregate/count queries
// for the dashboard live here so the controller stays focused on HTTP concerns.
public class DashboardRepository : IDashboardRepository
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenant;

    public DashboardRepository(AppDbContext db, ITenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    public async Task<DashboardStats> GetStats()
    {
        var startOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        // A global user with no active org sees platform-wide totals; everyone
        // else (org users, or a global user switched into a tenant) sees only
        // their active organization's users.
        var users = ScopedUsers();
        var total = await users.CountAsync();
        var active = await users.CountAsync(u => u.IsActive);
        var newThisMonth = await users.CountAsync(u => u.CreatedAt >= startOfMonth);

        // Tenant totals are only meaningful on the platform-wide view.
        int? totalOrgs = null, activeOrgs = null, inactiveOrgs = null;
        if (_tenant.IgnoreTenantBoundary)
        {
            totalOrgs = await _db.Organizations.CountAsync();
            activeOrgs = await _db.Organizations.CountAsync(o => o.IsActive);
            inactiveOrgs = totalOrgs - activeOrgs;
        }

        return new DashboardStats(
            total, active, total - active, newThisMonth,
            totalOrgs, activeOrgs, inactiveOrgs);
    }

    private IQueryable<User> ScopedUsers()
    {
        var query = _db.Users.AsQueryable();
        if (!_tenant.IgnoreTenantBoundary)
            query = query.Where(u => u.OrganizationId == _tenant.OrganizationId);
        return query;
    }
}

