using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Onboardly.Server.Authorization;
using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Repositories;
using Onboardly.Server.Services;

namespace Onboardly.Server.Controllers;

// Leave — request/approval workflow. Employees apply for their own leave;
// approvers (leave.approve) review; HR with leave.apply may act on behalf.
[ApiController]
[Authorize]
[Route("api/leave-requests")]
public class LeaveRequestsController : ApiControllerBase
{
    private readonly ILeaveRequestRepository _requests;
    private readonly ILeaveService _service;

    public LeaveRequestsController(ILeaveRequestRepository requests, ILeaveService service)
    {
        _requests = requests;
        _service = service;
    }

    [HttpGet]
    [RequirePermission(Permissions.ViewLeave, Permissions.ApproveLeave)]
    public async Task<IActionResult> GetAll(
        [FromQuery] DataTableRequest request,
        [FromQuery] string? status,
        [FromQuery] int? employeeId,
        [FromQuery] int? leaveTypeId) =>
        Ok(await _requests.GetAll(request, status, employeeId, leaveTypeId));

    // Self-service history of the caller's own leave requests.
    [HttpGet("mine")]
    public async Task<IActionResult> Mine(
        [FromQuery] DataTableRequest request,
        [FromQuery] string? status)
    {
        var employeeId = await _service.TryCurrentEmployeeIdAsync();
        if (employeeId is null)
            return Ok(new PagedResult<LeaveRequestListItem>(Array.Empty<LeaveRequestListItem>(), 1, request.PageSize, 0, 0));

        return Ok(await _requests.GetAll(request, status, employeeId, leaveTypeId: null));
    }

    [HttpGet("{id:int}")]
    [RequirePermission(Permissions.ViewLeave, Permissions.ApproveLeave, Permissions.ApplyLeave)]
    public async Task<IActionResult> GetById(int id)
    {
        var row = await _requests.GetRowAsync(id);
        return row is null ? NotFound(new { message = "Leave request not found." }) : Ok(row);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveLeaveRequest request)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var onBehalf = request.EmployeeId is not null && CanAny(Permissions.ApplyLeave);

        try
        {
            var leave = await _service.ApplyAsync(request, onBehalf);
            return Created($"/api/leave-requests/{leave.Id}", await _requests.GetRowAsync(leave.Id));
        }
        catch (LeaveException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:int}/approve")]
    [RequirePermission(Permissions.ApproveLeave)]
    public Task<IActionResult> Approve(int id, [FromBody] ReviewLeaveRequest? request) =>
        Review(id, approve: true, request);

    [HttpPost("{id:int}/reject")]
    [RequirePermission(Permissions.ApproveLeave)]
    public Task<IActionResult> Reject(int id, [FromBody] ReviewLeaveRequest? request) =>
        Review(id, approve: false, request);

    // Cancel/withdraw. Managers (leave.approve) may cancel anyone's; employees
    // may withdraw their own.
    [HttpPost("{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id)
    {
        var asManager = CanAny(Permissions.ApproveLeave);
        if (!asManager)
        {
            var leave = await _requests.GetByIdAsync(id);
            var employeeId = await _service.TryCurrentEmployeeIdAsync();
            if (leave is null || employeeId is null || leave.EmployeeId != employeeId)
                return Forbid();
        }

        try
        {
            var ok = await _service.CancelAsync(id, asManager);
            return ok ? NoContent() : NotFound(new { message = "Leave request not found." });
        }
        catch (LeaveException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private async Task<IActionResult> Review(int id, bool approve, ReviewLeaveRequest? request)
    {
        try
        {
            var ok = await _service.ReviewAsync(id, approve, request?.ReviewNotes);
            return ok ? NoContent() : NotFound(new { message = "Leave request not found." });
        }
        catch (LeaveException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
