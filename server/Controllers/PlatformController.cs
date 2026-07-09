using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Onboardly.Server.Authorization;
using Onboardly.Server.Repositories;
using Onboardly.Server.Services;

namespace Onboardly.Server.Controllers;

// Platform-layer endpoints for global users: browse organizations and switch the
// tenant the current session is acting in (the header org selector). All actions
// require the global platform.switch_organization permission.
[ApiController]
[RequirePermission(Permissions.PlatformSwitchOrganization)]
[Route("api/platform")]
public class PlatformController : ApiControllerBase
{
    private readonly IOrganizationRepository _organizations;
    private readonly IAuthService _auth;
    private readonly IUserSessionService _session;

    public PlatformController(IOrganizationRepository organizations, IAuthService auth, IUserSessionService session)
    {
        _organizations = organizations;
        _auth = auth;
        _session = session;
    }

    [HttpGet("organizations")]
    public async Task<IActionResult> Organizations([FromQuery] string? search) =>
        Ok(await _organizations.SearchAsync(search));

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

        var org = await _organizations.GetByIdAsync(organizationId);
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
