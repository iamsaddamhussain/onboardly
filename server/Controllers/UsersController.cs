using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Models;
using Onboardly.Server.Repositories;

namespace Onboardly.Server.Controllers;

[ApiController]
[Authorize]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly IUserRepository _users;

    public UsersController(IUserRepository users)
    {
        _users = users;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] DataTableRequest request)
    {
        return Ok(await _users.GetAll(request));
    }

    [HttpGet("{id:int}")]
    public IActionResult GetById([FromRoute] User? user)
    {
        if (user is null)
            return NotFound(new { message = "User not found." });

        return Ok(ToDto(user));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveUserRequest request)
    {
        // Field-level rules (required/email/length) are enforced by the
        // attributes on SaveUserRequest. Only the rules they can't express live
        // here, returned in the same per-field shape via ValidationProblem.
        if (string.IsNullOrWhiteSpace(request.Password))
            ModelState.AddModelError(nameof(request.Password), "Password is required.");

        var email = request.Email.Trim().ToLowerInvariant();

        if (await _users.EmailExistsAsync(email))
            ModelState.AddModelError(nameof(request.Email), "An account with that email already exists.");

        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var user = await _users.Create(request);

        return Created($"/api/users/{user.Id}", ToDto(user));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] SaveUserRequest request)
    {
        var user = await _users.GetById(id);
        if (user is null)
            return NotFound(new { message = "User not found." });

        var email = request.Email.Trim().ToLowerInvariant();

        if (await _users.EmailExistsAsync(email, user.Id))
        {
            ModelState.AddModelError(nameof(request.Email), "An account with that email already exists.");
            return ValidationProblem(ModelState);
        }

        await _users.Update(user, request);

        return Ok(ToDto(user));
    }

    private static UserListItem ToDto(User user) => new(
        user.Id, user.FirstName, user.LastName, user.Email,
        user.Mobile, user.City, user.JobTitle, user.IsActive, user.CreatedAt);
}
