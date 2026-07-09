using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Onboardly.Server.Repositories;

namespace Onboardly.Server.Controllers;

[ApiController]
[Authorize]
[Route("api/dashboard")]
public class DashboardController : ApiControllerBase
{
    private readonly IDashboardRepository _dashboard;

    public DashboardController(IDashboardRepository dashboard) => _dashboard = dashboard;

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats() => Ok(await _dashboard.GetStats());
}
