using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Onboardly.Server.Authorization;
using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Models;
using Onboardly.Server.Repositories;

namespace Onboardly.Server.Controllers;

[ApiController]
[RequirePermission(Permissions.ManageUsers)]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly IUserRepository _users;
    private readonly IUserAccessService _access;

    public UsersController(IUserRepository users, IUserAccessService access)
    {
        _users = users;
        _access = access;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] DataTableRequest request)
    {
        return Ok(await _users.GetAll(request));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var user = await _users.GetByIdWithRoles(id);
        if (user is null)
            return NotFound(new { message = "User not found." });

        return Ok(ToDto(user));
    }

    // Assigning roles is a super-admin capability, so it additionally requires
    // the manage_roles permission on top of the class-level manage_users.
    [HttpPut("{id:int}/roles")]
    [RequirePermission(Permissions.ManageRoles)]
    public async Task<IActionResult> SetRoles(int id, [FromBody] SetRolesRequest request)
    {
        var user = await _users.GetByIdWithRoles(id);
        if (user is null)
            return NotFound(new { message = "User not found." });

        await _users.SetRoles(user, request.RoleIds);
        _access.Invalidate(id);
        return NoContent();
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
    public async Task<IActionResult> Update([FromRoute] User? user, [FromBody] SaveUserRequest request)
    {
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

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete([FromRoute] User? user)
    {
        if (user is null)
            return NotFound(new { message = "User not found." });

        var currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (currentUserId == user.Id)
            return BadRequest(new { message = "You cannot delete your own account." });

        await _users.Delete(user);

        return NoContent();
    }

    private static UserListItem ToDto(User user) => new(
        user.Id, user.FirstName, user.LastName, user.Email,
        user.Mobile, user.City, user.JobTitle, user.IsActive, user.CreatedAt,
        user.Roles.Select(r => r.Id).ToArray());
}
