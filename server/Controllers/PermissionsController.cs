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
}
