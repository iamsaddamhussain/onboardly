using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Onboardly.Server.Authorization;
using Onboardly.Server.Dtos;
using Onboardly.Server.Services;

namespace Onboardly.Server.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ApiControllerBase
{
    private readonly IAuthService _auth;
    private readonly IAuditService _audit;
    private readonly IUserSessionService _session;

    public AuthController(
        IAuthService auth,
        IAuditService audit,
        IUserSessionService session)
    {
        _auth = auth;
        _audit = audit;
        _session = session;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _auth.ValidateCredentialsAsync(request.Email, request.Password);
        if (user is null)
            return Unauthorized(new { message = "Invalid email or password." });

        // Deactivated accounts are not allowed to sign in.
        if (!user.IsActive)
            return Unauthorized(new { message = "Your account has been deactivated. Please contact an administrator." });

        await _session.SignInAsync(HttpContext, user);
        await _audit.LogAsync("Login", nameof(Models.User), user.Id.ToString(), user.Id, user.OrganizationId);
        return Ok(await _session.BuildResponseAsync(user, impersonating: false));
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var id = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await _auth.GetByIdAsync(id);
        if (user is null)
            return Unauthorized();

        var impersonating = User.FindFirst(AppClaims.Impersonator) is not null;
        var activeOrganizationId = int.TryParse(User.FindFirstValue(AppClaims.ActiveOrganizationId), out var activeOrg)
            ? activeOrg
            : (int?)null;
        return Ok(await _session.BuildResponseAsync(user, impersonating, activeOrganizationId));
    }

    [Authorize]
    [HttpGet("profile")]
    public async Task<IActionResult> Profile()
    {
        var id = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await _auth.GetByIdAsync(id);
        if (user is null)
            return NotFound(new { message = "Profile not found." });

        return Ok(ToProfile(user));
    }

    [Authorize]
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var id = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await _auth.GetByIdAsync(id);
        if (user is null)
            return NotFound(new { message = "Profile not found." });

        await _auth.UpdateProfileAsync(user, request);
        return Ok(ToProfile(user));
    }

    [Authorize]
    [HttpPut("language")]
    public async Task<IActionResult> UpdateLanguage([FromBody] UpdateLanguageRequest request)
    {
        var id = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await _auth.GetByIdAsync(id);
        if (user is null)
            return NotFound(new { message = "Profile not found." });

        await _auth.UpdateLanguageAsync(user, request.Language);
        return NoContent();
    }

    // The signed-in user's own recent activity timeline (their audit events).
    [Authorize]
    [HttpGet("activity")]
    public async Task<IActionResult> Activity()
    {
        var id = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var events = await _audit.GetRecentForUserAsync(id);
        return Ok(events);
    }

    // Start impersonating another user. Restricted to accounts holding the
    // impersonate_users permission (super admin). The original admin id is
    // stamped onto the cookie so the session can be switched back.
    [RequirePermission(Permissions.ImpersonateUsers)]
    [HttpPost("impersonate/{userId:int}")]
    public async Task<IActionResult> Impersonate(int userId)
    {
        var currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (currentUserId == userId)
            return BadRequest(new { message = "You cannot impersonate yourself." });

        var target = await _auth.GetByIdAsync(userId);
        if (target is null)
            return NotFound(new { message = "User not found." });
        if (!target.IsActive)
            return BadRequest(new { message = "You cannot impersonate a deactivated user." });

        await _session.SignInAsync(HttpContext, target, impersonatorId: currentUserId);
        await _audit.LogAsync("ImpersonateStart", nameof(Models.User), target.Id.ToString(), currentUserId, target.OrganizationId);
        return Ok(await _session.BuildResponseAsync(target, impersonating: true));
    }

    // Stop impersonating and switch back to the original admin account.
    [Authorize]
    [HttpPost("impersonate/stop")]
    public async Task<IActionResult> StopImpersonating()
    {
        var impersonatorId = User.FindFirstValue(AppClaims.Impersonator);
        if (impersonatorId is null)
            return BadRequest(new { message = "You are not impersonating anyone." });

        var admin = await _auth.GetByIdAsync(int.Parse(impersonatorId));
        if (admin is null)
            return NotFound(new { message = "Original account not found." });

        await _session.SignInAsync(HttpContext, admin);
        await _audit.LogAsync("ImpersonateStop", nameof(Models.User), admin.Id.ToString(), admin.Id, admin.OrganizationId);
        return Ok(await _session.BuildResponseAsync(admin, impersonating: false));
    }

    private static ProfileResponse ToProfile(Onboardly.Server.Models.User user) => new(
        user.Id,
        user.FirstName,
        user.LastName,
        user.Email,
        user.Mobile,
        user.City,
        user.JobTitle,
        user.Language,
        user.IsActive,
        user.CreatedAt);
}
