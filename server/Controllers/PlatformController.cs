using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Authorization;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;
using Onboardly.Server.Services;

namespace Onboardly.Server.Controllers;

// Platform-layer endpoints for global users: browse organizations and switch the
// tenant the current session is acting in (the header org selector). All actions
// require the global platform.switch_organization permission.
[ApiController]
[RequirePermission(Permissions.PlatformSwitchOrganization)]
[Route("api/platform")]
public class PlatformController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuthService _auth;
    private readonly IUserSessionService _session;

    public PlatformController(AppDbContext db, IAuthService auth, IUserSessionService session)
    {
        _db = db;
        _auth = auth;
        _session = session;
    }

    [HttpGet("organizations")]
    public async Task<IActionResult> Organizations([FromQuery] string? search)
    {
        var query = _db.Organizations.AsQueryable();

        // Optional server-side filter so the client can drive a typeahead lookup.
        if (!string.IsNullOrWhiteSpace(search))
        {
            var like = $"%{search.Trim()}%";
            query = query.Where(o =>
                EF.Functions.ILike(o.Name, like) || EF.Functions.ILike(o.Slug, like));
        }

        var organizations = await query
            .OrderBy(o => o.Name)
            .Select(o => new OrganizationListItem(o.Id, o.Name, o.Slug, o.IsActive))
            .ToListAsync();
        return Ok(organizations);
    }

    // Switch the current global session into a specific tenant. Re-issues the
    // cookie with an active-organization claim so tenant-scoped queries and
    // policies bind to it.
    [HttpPost("switch-org/{organizationId:int}")]
    public async Task<IActionResult> Switch(int organizationId)
    {
        var user = await CurrentUserAsync();
        if (user is null)
            return Unauthorized();
        if (user.OrganizationId is not null)
            return BadRequest(new { message = "Only platform users can switch organizations." });

        var org = await _db.Organizations.FirstOrDefaultAsync(o => o.Id == organizationId);
        if (org is null)
            return NotFound(new { message = "Organization not found." });
        if (!org.IsActive)
            return BadRequest(new { message = "That organization is inactive." });

        var impersonatorId = ImpersonatorId();
        await _session.SignInAsync(HttpContext, user, impersonatorId, activeOrganizationId: organizationId);
        return Ok(await _session.BuildResponseAsync(user, impersonating: impersonatorId is not null, activeOrganizationId: organizationId));
    }

    // Exit the tenant view and return to the platform-wide scope.
    [HttpPost("switch-org/stop")]
    public async Task<IActionResult> StopSwitch()
    {
        var user = await CurrentUserAsync();
        if (user is null)
            return Unauthorized();

        var impersonatorId = ImpersonatorId();
        await _session.SignInAsync(HttpContext, user, impersonatorId, activeOrganizationId: null);
        return Ok(await _session.BuildResponseAsync(user, impersonating: impersonatorId is not null));
    }

    private Task<Models.User?> CurrentUserAsync()
    {
        var id = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return _auth.GetByIdAsync(id);
    }

    private int? ImpersonatorId() =>
        int.TryParse(User.FindFirstValue(AppClaims.Impersonator), out var id) ? id : null;
}
