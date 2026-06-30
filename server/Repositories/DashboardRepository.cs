using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;

namespace Onboardly.Server.Repositories;

// EF Core implementation of IDashboardRepository — all aggregate/count queries
// for the dashboard live here so the controller stays focused on HTTP concerns.
public class DashboardRepository : IDashboardRepository
{
    private readonly AppDbContext _db;

    public DashboardRepository(AppDbContext db) => _db = db;

    public async Task<DashboardStats> GetStats()
    {
        var startOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var total = await _db.Users.CountAsync();
        var active = await _db.Users.CountAsync(u => u.IsActive);
        var newThisMonth = await _db.Users.CountAsync(u => u.CreatedAt >= startOfMonth);

        return new DashboardStats(total, active, total - active, newThisMonth);
    }
}
