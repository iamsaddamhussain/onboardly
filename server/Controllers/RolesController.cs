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
    private readonly ITenantContext _tenant;

    public RolesController(IRoleRepository roles, IPermissionRepository permissions, ITenantContext tenant)
    {
        _roles = roles;
        _permissions = permissions;
        _tenant = tenant;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var roles = await _roles.GetAll();
        var permissions = await _permissions.GetAll();
        // Offer only the permissions valid for the active scope: platform view
        // exposes global permissions, an org context exposes org permissions.
        var scoped = _tenant.IgnoreTenantBoundary
            ? permissions.Where(p => p.IsGlobal)
            : permissions.Where(p => !p.IsGlobal);
        return Ok(new { roles, permissions = scoped });
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
        if (!_roles.CanManage(role))
            return Forbid();
        if (Authorization.Roles.System.Contains(role.Name))
            return BadRequest(new { message = "System roles cannot be modified." });

        // Privilege-escalation guard: a caller may only add or remove permissions
        // they personally hold. Permissions they lack stay untouched, so no one
        // can grant themselves (or strip from others) access beyond their own.
        var actorPermissions = User.FindAll(AppClaims.Permission).Select(c => c.Value).ToHashSet();
        var allPermissions = await _permissions.GetAll();
        var currentIds = role.Permissions.Select(p => p.Id).ToHashSet();
        var requestedIds = request.PermissionIds.ToHashSet();

        var finalIds = new HashSet<int>(currentIds);
        foreach (var permission in allPermissions)
        {
            var wanted = requestedIds.Contains(permission.Id);
            var current = currentIds.Contains(permission.Id);
            if (wanted == current)
                continue; // no change requested for this permission
            if (!actorPermissions.Contains(permission.Name))
                continue; // caller can't toggle a permission they don't hold
            if (wanted)
                finalIds.Add(permission.Id);
            else
                finalIds.Remove(permission.Id);
        }

        await _roles.SetPermissions(role, finalIds.ToArray());
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete([FromRoute] Role? role)
    {
        if (role is null)
            return NotFound(new { message = "Role not found." });

        if (Authorization.Roles.System.Contains(role.Name))
            return BadRequest(new { message = "System roles cannot be deleted." });
        if (!_roles.CanManage(role))
            return Forbid();

        await _roles.Delete(role);
        return NoContent();
    }
}
