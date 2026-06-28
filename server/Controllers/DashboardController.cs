using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;

namespace Onboardly.Server.Controllers;

[ApiController]
[Authorize]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;

    public DashboardController(AppDbContext db) => _db = db;

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var startOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var total = await _db.Users.CountAsync();
        var active = await _db.Users.CountAsync(u => u.IsActive);
        var newThisMonth = await _db.Users.CountAsync(u => u.CreatedAt >= startOfMonth);

        return Ok(new DashboardStats(total, active, total - active, newThisMonth));
    }
}
