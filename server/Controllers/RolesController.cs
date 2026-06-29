using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Authorization;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;
using Onboardly.Server.Models;

namespace Onboardly.Server.Controllers;

[ApiController]
[RequirePermission(Permissions.ManageRoles)]
[Route("api/roles")]
public class RolesController : ControllerBase
{
    private readonly AppDbContext _db;

    public RolesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var roles = await _db.Roles
            .Select(r => new
            {
                r.Id,
                r.Name,
                PermissionIds = r.Permissions.Select(p => p.Id).ToList(),
                Permissions = r.Permissions.Select(p => p.Name).OrderBy(n => n).ToList(),
                UserCount = r.Users.Count,
            })
            .OrderBy(r => r.Name)
            .ToListAsync();

        var permissions = await _db.Permissions
            .Select(p => new { p.Id, p.Name })
            .OrderBy(p => p.Name)
            .ToListAsync();

        return Ok(new { roles, permissions });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRoleRequest request)
    {
        var name = request.Name.Trim();
        if (await _db.Roles.AnyAsync(r => r.Name == name))
        {
            ModelState.AddModelError(nameof(request.Name), "A role with that name already exists.");
            return ValidationProblem(ModelState);
        }

        var role = new Role { Name = name };
        _db.Roles.Add(role);
        await _db.SaveChangesAsync();
        return Created($"/api/roles/{role.Id}", new { role.Id, role.Name });
    }

    [HttpPut("{id:int}/permissions")]
    public async Task<IActionResult> SetPermissions(int id, [FromBody] SetPermissionsRequest request)
    {
        var role = await _db.Roles.Include(r => r.Permissions).FirstOrDefaultAsync(r => r.Id == id);
        if (role is null)
            return NotFound(new { message = "Role not found." });

        var permissions = await _db.Permissions
            .Where(p => request.PermissionIds.Contains(p.Id))
            .ToListAsync();

        role.Permissions.Clear();
        foreach (var permission in permissions)
            role.Permissions.Add(permission);

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Id == id);
        if (role is null)
            return NotFound(new { message = "Role not found." });

        if (role.Name == Authorization.Roles.SuperAdmin)
            return BadRequest(new { message = "The super admin role cannot be deleted." });

        _db.Roles.Remove(role);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
