using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Onboardly.Server.Authorization;
using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Repositories;
using Onboardly.Server.Services;

namespace Onboardly.Server.Controllers;

// Attendance correction requests and their manager approval workflow. Employees
// raise corrections for their own days; approvers (attendance.approve) review
// them, and an approval applies the requested values to the day's record.
[ApiController]
[Authorize]
[Route("api/attendance-corrections")]
public class AttendanceCorrectionsController : ApiControllerBase
{
    private readonly IAttendanceRepository _attendance;
    private readonly IAttendanceService _service;

    public AttendanceCorrectionsController(IAttendanceRepository attendance, IAttendanceService service)
    {
        _attendance = attendance;
        _service = service;
    }

    [HttpGet]
    [RequirePermission(Permissions.ViewAttendance, Permissions.ApproveAttendance)]
    public async Task<IActionResult> GetAll(
        [FromQuery] DataTableRequest request,
        [FromQuery] string? status,
        [FromQuery] int? employeeId) =>
        Ok(await _attendance.GetCorrections(request, status, employeeId));

    // Self-service history of the caller's own correction requests.
    [HttpGet("mine")]
    public async Task<IActionResult> Mine([FromQuery] DataTableRequest request)
    {
        // Unlinked accounts (e.g. platform admins) have no corrections.
        var employeeId = await _service.TryCurrentEmployeeIdAsync();
        if (employeeId is null)
            return Ok(new PagedResult<CorrectionListItem>(Array.Empty<CorrectionListItem>(), 1, request.PageSize, 0, 0));

        return Ok(await _attendance.GetCorrections(request, status: null, employeeId));
    }

    // Raise a correction. HR with create permission may submit on behalf of an
    // employee (EmployeeId supplied); everyone else corrects their own day.
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveCorrectionRequest request)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var onBehalf = request.EmployeeId is not null && CanAny(Permissions.CreateAttendance, Permissions.EditAttendance);

        try
        {
            var correction = await _service.RequestCorrectionAsync(request, onBehalf);
            return Created($"/api/attendance-corrections/{correction.Id}", new { correction.Id });
        }
        catch (AttendanceException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:int}/approve")]
    [RequirePermission(Permissions.ApproveAttendance)]
    public Task<IActionResult> Approve(int id, [FromBody] ReviewCorrectionRequest? request) =>
        Review(id, approve: true, request);

    [HttpPost("{id:int}/reject")]
    [RequirePermission(Permissions.ApproveAttendance)]
    public Task<IActionResult> Reject(int id, [FromBody] ReviewCorrectionRequest? request) =>
        Review(id, approve: false, request);

    private async Task<IActionResult> Review(int id, bool approve, ReviewCorrectionRequest? request)
    {
        try
        {
            var ok = await _service.ReviewCorrectionAsync(id, approve, request?.ReviewNotes);
            return ok ? NoContent() : NotFound(new { message = "Correction not found." });
        }
        catch (AttendanceException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
