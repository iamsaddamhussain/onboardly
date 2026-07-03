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
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    private readonly IUserAccessService _access;

    public AuthController(IAuthService auth, IUserAccessService access)
    {
        _auth = auth;
        _access = access;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Email and password are required." });

        if (request.Password.Length < 8)
            return BadRequest(new { message = "Password must be at least 8 characters." });

        var user = await _auth.RegisterAsync(request.Email, request.Password);
        if (user is null)
            return Conflict(new { message = "An account with that email already exists." });

        await SignInAsync(user.Id, user.Email);
        var roles = await _access.GetRolesAsync(user.Id);
        var permissions = await _access.GetPermissionsAsync(user.Id);
        return Ok(new UserResponse(user.Id, user.Email, user.Language, roles.ToArray(), permissions.ToArray(), user.FirstName, user.LastName, false));
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

        await SignInAsync(user.Id, user.Email);
        var roles = await _access.GetRolesAsync(user.Id);
        var permissions = await _access.GetPermissionsAsync(user.Id);
        return Ok(new UserResponse(user.Id, user.Email, user.Language, roles.ToArray(), permissions.ToArray(), user.FirstName, user.LastName, false));
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
        var email = User.FindFirstValue(ClaimTypes.Email)!;
        var user = await _auth.GetByIdAsync(id);
        var language = user?.Language ?? "en";
        var roles = await _access.GetRolesAsync(id);
        var permissions = await _access.GetPermissionsAsync(id);
        var impersonating = User.FindFirst(AppClaims.Impersonator) is not null;
        return Ok(new UserResponse(id, email, language, roles.ToArray(), permissions.ToArray(), user?.FirstName, user?.LastName, impersonating));
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

        await SignInAsync(target.Id, target.Email, impersonatorId: currentUserId);
        var roles = await _access.GetRolesAsync(target.Id);
        var permissions = await _access.GetPermissionsAsync(target.Id);
        return Ok(new UserResponse(target.Id, target.Email, target.Language, roles.ToArray(), permissions.ToArray(), target.FirstName, target.LastName, true));
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

        await SignInAsync(admin.Id, admin.Email);
        var roles = await _access.GetRolesAsync(admin.Id);
        var permissions = await _access.GetPermissionsAsync(admin.Id);
        return Ok(new UserResponse(admin.Id, admin.Email, admin.Language, roles.ToArray(), permissions.ToArray(), admin.FirstName, admin.LastName, false));
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

    private async Task SignInAsync(int userId, string email, int? impersonatorId = null)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new(ClaimTypes.Email, email),
        };

        // Preserve the original admin id while impersonating so the session can
        // be switched back without re-authenticating.
        if (impersonatorId is not null)
            claims.Add(new Claim(AppClaims.Impersonator, impersonatorId.Value.ToString()));

        // Stamp roles + permissions onto the cookie so authorization is a fast
        // claim check (this acts as the per-user permission cache).
        foreach (var role in await _access.GetRolesAsync(userId))
            claims.Add(new Claim(ClaimTypes.Role, role));
        foreach (var permission in await _access.GetPermissionsAsync(userId))
            claims.Add(new Claim(AppClaims.Permission, permission));

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity));
    }
}
