using Microsoft.AspNetCore.Mvc;
using Onboardly.Server.Authorization;
using Onboardly.Server.Dtos;
using Onboardly.Server.Models;
using Onboardly.Server.Repositories;

namespace Onboardly.Server.Controllers;

[ApiController]
[RequirePermission(Permissions.ManageRoles)]
[Route("api/roles")]
public class RolesController : ControllerBase
{
    private readonly IRoleRepository _roles;
    private readonly IPermissionRepository _permissions;

    public RolesController(IRoleRepository roles, IPermissionRepository permissions)
    {
        _roles = roles;
        _permissions = permissions;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var roles = await _roles.GetAll();
        var permissions = await _permissions.GetAll();
        return Ok(new { roles, permissions });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRoleRequest request)
    {
        var name = request.Name.Trim();
        if (await _roles.NameExistsAsync(name))
        {
            ModelState.AddModelError(nameof(request.Name), "A role with that name already exists.");
            return ValidationProblem(ModelState);
        }

        var role = await _roles.Create(request);
        return Created($"/api/roles/{role.Id}", new { role.Id, role.Name });
    }

    [HttpPut("{id:int}/permissions")]
    public async Task<IActionResult> SetPermissions(int id, [FromBody] SetPermissionsRequest request)
    {
        var role = await _roles.GetByIdWithPermissions(id);
        if (role is null)
            return NotFound(new { message = "Role not found." });

        await _roles.SetPermissions(role, request.PermissionIds);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete([FromRoute] Role? role)
    {
        if (role is null)
            return NotFound(new { message = "Role not found." });

        if (role.Name == Authorization.Roles.SuperAdmin)
            return BadRequest(new { message = "The super admin role cannot be deleted." });

        await _roles.Delete(role);
        return NoContent();
    }
}
