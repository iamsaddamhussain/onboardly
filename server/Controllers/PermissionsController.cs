using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Authorization;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;
using Onboardly.Server.Models;

namespace Onboardly.Server.Controllers;

[ApiController]
[RequirePermission(Permissions.ManagePermissions)]
[Route("api/permissions")]
public class PermissionsController : ControllerBase
{
    private readonly AppDbContext _db;

    public PermissionsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok(await _db.Permissions
            .Select(p => new { p.Id, p.Name })
            .OrderBy(p => p.Name)
            .ToListAsync());

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePermissionRequest request)
    {
        var name = request.Name.Trim();
        if (await _db.Permissions.AnyAsync(p => p.Name == name))
        {
            ModelState.AddModelError(nameof(request.Name), "A permission with that name already exists.");
            return ValidationProblem(ModelState);
        }

        var permission = new Permission { Name = name };
        _db.Permissions.Add(permission);
        await _db.SaveChangesAsync();
        return Created($"/api/permissions/{permission.Id}", new { permission.Id, permission.Name });
    }
}
