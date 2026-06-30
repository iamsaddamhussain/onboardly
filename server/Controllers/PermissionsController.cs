using Microsoft.AspNetCore.Mvc;
using Onboardly.Server.Authorization;
using Onboardly.Server.Dtos;
using Onboardly.Server.Repositories;

namespace Onboardly.Server.Controllers;

[ApiController]
[RequirePermission(Permissions.ManagePermissions)]
[Route("api/permissions")]
public class PermissionsController : ControllerBase
{
    private readonly IPermissionRepository _permissions;

    public PermissionsController(IPermissionRepository permissions) => _permissions = permissions;

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _permissions.GetAll());

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePermissionRequest request)
    {
        var name = request.Name.Trim();
        if (await _permissions.NameExistsAsync(name))
        {
            ModelState.AddModelError(nameof(request.Name), "A permission with that name already exists.");
            return ValidationProblem(ModelState);
        }

        var permission = await _permissions.Create(request);
        return Created($"/api/permissions/{permission.Id}", new { permission.Id, permission.Name });
    }
}
