using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Onboardly.Server.Dtos;
using Onboardly.Server.Services;

namespace Onboardly.Server.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth) => _auth = auth;

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
        return Ok(new UserResponse(user.Id, user.Email));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _auth.ValidateCredentialsAsync(request.Email, request.Password);
        if (user is null)
            return Unauthorized(new { message = "Invalid email or password." });

        await SignInAsync(user.Id, user.Email);
        return Ok(new UserResponse(user.Id, user.Email));
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
    public IActionResult Me()
    {
        var id = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var email = User.FindFirstValue(ClaimTypes.Email)!;
        return Ok(new UserResponse(id, email));
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

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity));
    }
}
