using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Onboardly.Server.Authorization;
using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Repositories;

namespace Onboardly.Server.Controllers;

// Leave — configurable leave types (the Leave Rules Engine catalogue).
// Organization-scoped CRUD with soft delete.
[ApiController]
[Route("api/leave-types")]
public class LeaveTypesController : ApiControllerBase
{
    private readonly ILeaveTypeRepository _leaveTypes;

    public LeaveTypesController(ILeaveTypeRepository leaveTypes) => _leaveTypes = leaveTypes;

    [HttpGet]
    [RequirePermission(Permissions.ViewLeave, Permissions.ManageLeaveTypes)]
    public async Task<IActionResult> GetAll(
        [FromQuery] DataTableRequest request,
        [FromQuery] bool? isActive) =>
        Ok(await _leaveTypes.GetAll(request, isActive));

    // Self-service: any authenticated employee needs the active leave types to
    // apply for leave, so this lookup is not gated behind a leave permission.
    [HttpGet("lookup")]
    [Authorize]
    public async Task<IActionResult> Lookup([FromQuery] string? search) =>
        Ok(await _leaveTypes.SearchAsync(search));

    [HttpGet("{id:int}")]
    [RequirePermission(Permissions.ViewLeave, Permissions.ManageLeaveTypes)]
    public async Task<IActionResult> GetById(int id)
    {
        var row = await _leaveTypes.GetRowAsync(id);
        return row is null ? NotFound(new { message = "Leave type not found." }) : Ok(row);
    }

    [HttpPost]
    [RequirePermission(Permissions.ManageLeaveTypes)]
    public async Task<IActionResult> Create([FromBody] SaveLeaveTypeRequest request)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var leaveType = await _leaveTypes.Create(request);
        return Created($"/api/leave-types/{leaveType.Id}", await _leaveTypes.GetRowAsync(leaveType.Id));
    }

    [HttpPut("{id:int}")]
    [RequirePermission(Permissions.ManageLeaveTypes)]
    public async Task<IActionResult> Update(int id, [FromBody] SaveLeaveTypeRequest request)
    {
        var leaveType = await _leaveTypes.GetByIdAsync(id);
        if (leaveType is null)
            return NotFound(new { message = "Leave type not found." });

        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        await _leaveTypes.Update(leaveType, request);
        return Ok(await _leaveTypes.GetRowAsync(id));
    }

    [HttpDelete("{id:int}")]
    [RequirePermission(Permissions.ManageLeaveTypes)]
    public async Task<IActionResult> Delete(int id)
    {
        var leaveType = await _leaveTypes.GetByIdAsync(id);
        if (leaveType is null)
            return NotFound(new { message = "Leave type not found." });

        await _leaveTypes.SoftDelete(leaveType);
        return NoContent();
    }
}
