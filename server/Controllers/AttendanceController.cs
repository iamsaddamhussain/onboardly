using System.Globalization;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Onboardly.Server.Authorization;
using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Repositories;
using Onboardly.Server.Services;

namespace Onboardly.Server.Controllers;

// Attendance management: daily records (HR CRUD + filtering), employee
// self-service punches, the HR dashboard, trends and CSV export. Organization
// isolation and change auditing are handled by the shared infrastructure.
[ApiController]
[Authorize]
[Route("api/attendance")]
public class AttendanceController : ApiControllerBase
{
    private readonly IAttendanceRepository _attendance;
    private readonly IAttendanceService _service;

    public AttendanceController(IAttendanceRepository attendance, IAttendanceService service)
    {
        _attendance = attendance;
        _service = service;
    }

    [HttpGet]
    [RequirePermission(Permissions.ViewAttendance)]
    public async Task<IActionResult> GetAll(
        [FromQuery] DataTableRequest request,
        [FromQuery] AttendanceFilter filter) =>
        Ok(await _attendance.GetAll(request, filter));

    [HttpGet("{id:int}")]
    [RequirePermission(Permissions.ViewAttendance)]
    public async Task<IActionResult> GetById(int id)
    {
        var detail = await _attendance.GetDetailAsync(id);
        return detail is null ? NotFound(new { message = "Attendance record not found." }) : Ok(detail);
    }

    // HR manual create/update of a day's attendance.
    [HttpPost]
    [RequirePermission(Permissions.CreateAttendance, Permissions.EditAttendance)]
    public async Task<IActionResult> Save([FromBody] SaveAttendanceRequest request)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        try
        {
            var id = await _service.SaveManualAsync(request);
            return Ok(await _attendance.GetDetailAsync(id));
        }
        catch (AttendanceException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    [RequirePermission(Permissions.DeleteAttendance)]
    public async Task<IActionResult> Delete(int id) =>
        await _service.DeleteAsync(id)
            ? NoContent()
            : NotFound(new { message = "Attendance record not found." });

    // --- Self-service ---
    // Punching only ever affects the signed-in employee's own record, so these
    // require authentication (via the class-level [Authorize]) rather than a
    // management permission — every employee can record their own attendance.

    [HttpGet("me")]
    public Task<MyAttendanceToday> Me() => _service.GetMyTodayAsync();

    [HttpGet("me/history")]
    public async Task<IActionResult> MyHistory([FromQuery] DataTableRequest request)
    {
        // Unlinked accounts (e.g. platform admins) simply have no history.
        var employeeId = await _service.TryCurrentEmployeeIdAsync();
        if (employeeId is null)
            return Ok(new PagedResult<AttendanceListItem>(Array.Empty<AttendanceListItem>(), 1, request.PageSize, 0, 0));

        return Ok(await _attendance.GetAll(request, new AttendanceFilter(EmployeeId: employeeId)));
    }

    [HttpPost("check-in")]
    public Task<IActionResult> CheckIn([FromBody] PunchRequest? request) => Punch(() => _service.CheckInAsync(request ?? new PunchRequest()));

    [HttpPost("check-out")]
    public Task<IActionResult> CheckOut([FromBody] PunchRequest? request) => Punch(() => _service.CheckOutAsync(request ?? new PunchRequest()));

    [HttpPost("break-start")]
    public Task<IActionResult> BreakStart([FromBody] PunchRequest? request) => Punch(() => _service.BreakStartAsync(request ?? new PunchRequest()));

    [HttpPost("break-end")]
    public Task<IActionResult> BreakEnd([FromBody] PunchRequest? request) => Punch(() => _service.BreakEndAsync(request ?? new PunchRequest()));

    // --- HR dashboard & reporting ---

    [HttpGet("dashboard")]
    [RequirePermission(Permissions.ViewAttendance)]
    public async Task<IActionResult> Dashboard([FromQuery] DateOnly? date)
    {
        var day = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        return Ok(await _attendance.GetDashboardAsync(day));
    }

    [HttpGet("trend")]
    [RequirePermission(Permissions.ViewAttendance)]
    public async Task<IActionResult> Trend([FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        var end = to ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var start = from ?? end.AddDays(-29);
        return Ok(await _attendance.GetTrendAsync(start, end));
    }

    // CSV export (opens directly in Excel). Honours the same filters as the grid.
    [HttpGet("export")]
    [RequirePermission(Permissions.ExportAttendance)]
    public async Task<IActionResult> Export([FromQuery] AttendanceFilter filter)
    {
        var rows = await _attendance.GetRangeAsync(filter);
        var csv = BuildCsv(rows);
        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(csv)).ToArray();
        var fileName = $"attendance-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv";
        return File(bytes, "text/csv", fileName);
    }

    // --- helpers ---

    private async Task<IActionResult> Punch(Func<Task<AttendanceDetail>> action)
    {
        try
        {
            return Ok(await action());
        }
        catch (AttendanceException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // Builds a CSV document from attendance rows. Times are ISO 8601 (UTC);
    // durations are rendered as H:MM for readability in a spreadsheet.
    private static string BuildCsv(IReadOnlyList<AttendanceListItem> rows)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Employee Number,Employee,Department,Date,Check In,Check Out,Worked,Break,Overtime,Status,Remarks");
        foreach (var r in rows)
        {
            sb.Append(Csv(r.EmployeeNumber)).Append(',')
              .Append(Csv(r.EmployeeName)).Append(',')
              .Append(Csv(r.DepartmentName ?? string.Empty)).Append(',')
              .Append(Csv(r.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture))).Append(',')
              .Append(Csv(r.CheckInAt?.ToString("u", CultureInfo.InvariantCulture) ?? string.Empty)).Append(',')
              .Append(Csv(r.CheckOutAt?.ToString("u", CultureInfo.InvariantCulture) ?? string.Empty)).Append(',')
              .Append(Csv(Hours(r.WorkedMinutes))).Append(',')
              .Append(Csv(Hours(r.BreakMinutes))).Append(',')
              .Append(Csv(Hours(r.OvertimeMinutes))).Append(',')
              .Append(Csv(r.Status)).Append(',')
              .Append(Csv(r.Remarks ?? string.Empty)).Append('\n');
        }
        return sb.ToString();
    }

    private static string Hours(int minutes) =>
        $"{minutes / 60}:{minutes % 60:D2}";

    // Minimal RFC 4180 quoting: wrap in quotes and double any embedded quotes
    // when the value contains a comma, quote or newline.
    private static string Csv(string value)
    {
        if (value.IndexOfAny(new[] { ',', '"', '\n', '\r' }) < 0)
            return value;
        return $"\"{value.Replace("\"", "\"\"")}\"";
    }
}
