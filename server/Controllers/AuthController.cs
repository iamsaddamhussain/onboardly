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
        return Ok(new UserResponse(user.Id, user.Email, roles.ToArray(), permissions.ToArray()));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _auth.ValidateCredentialsAsync(request.Email, request.Password);
        if (user is null)
            return Unauthorized(new { message = "Invalid email or password." });

        await SignInAsync(user.Id, user.Email);
        var roles = await _access.GetRolesAsync(user.Id);
        var permissions = await _access.GetPermissionsAsync(user.Id);
        return Ok(new UserResponse(user.Id, user.Email, roles.ToArray(), permissions.ToArray()));
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
        var roles = await _access.GetRolesAsync(id);
        var permissions = await _access.GetPermissionsAsync(id);
        return Ok(new UserResponse(id, email, roles.ToArray(), permissions.ToArray()));
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

    private static ProfileResponse ToProfile(Onboardly.Server.Models.User user) => new(
        user.Id,
        user.FirstName,
        user.LastName,
        user.Email,
        user.Mobile,
        user.City,
        user.JobTitle,
        user.IsActive,
        user.CreatedAt);

    private async Task SignInAsync(int userId, string email)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new(ClaimTypes.Email, email),
        };

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
