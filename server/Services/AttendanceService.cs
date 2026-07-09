using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Authorization;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;
using Onboardly.Server.Models;
using Onboardly.Server.Repositories;

namespace Onboardly.Server.Services;

// Business logic for the attendance module: self-service punches (check in/out,
// break start/end), HR manual entry, and the correction request/approval flow.
// Daily totals (worked/break/overtime) are derived here so the stored record and
// its reports stay a simple read. Fixed office-hours constants stand in for the
// future shift/policy engine and are the single place to make that pluggable.
public interface IAttendanceService
{
    Task<MyAttendanceToday> GetMyTodayAsync();
    Task<AttendanceDetail> CheckInAsync(PunchRequest request);
    Task<AttendanceDetail> CheckOutAsync(PunchRequest request);
    Task<AttendanceDetail> BreakStartAsync(PunchRequest request);
    Task<AttendanceDetail> BreakEndAsync(PunchRequest request);

    // The signed-in user's linked employee id (for self-service history).
    Task<int> CurrentEmployeeIdAsync();

    // Null when the signed-in user has no employee record (unlinked account).
    Task<int?> TryCurrentEmployeeIdAsync();

    Task<int> SaveManualAsync(SaveAttendanceRequest request);
    Task<bool> DeleteAsync(int id);

    Task<AttendanceCorrection> RequestCorrectionAsync(SaveCorrectionRequest request, bool onBehalf);
    Task<bool> ReviewCorrectionAsync(int id, bool approve, string? reviewNotes);
}

public class AttendanceService : IAttendanceService
{
    // Placeholder policy values until the shift/holiday/policy engine lands.
    private const int StandardWorkMinutes = 8 * 60;
    private static readonly TimeOnly LateThreshold = new(9, 15);

    private readonly AppDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly IEmployeeRepository _employees;

    public AttendanceService(AppDbContext db, ITenantContext tenant, IEmployeeRepository employees)
    {
        _db = db;
        _tenant = tenant;
        _employees = employees;
    }

    public async Task<MyAttendanceToday> GetMyTodayAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // Not every user is an employee (e.g. platform/admin accounts). Rather
        // than erroring, report an "unlinked" snapshot the UI can explain.
        var employee = await TryCurrentEmployeeAsync();
        if (employee is null)
            return new MyAttendanceToday(null, today, null, null, 0, 0,
                AttendanceStatus.Absent.ToString(), false, false, false, IsLinked: false);

        var record = await TrackedRecordAsync(employee.Id, today);

        if (record is null)
            return new MyAttendanceToday(null, today, null, null, 0, 0,
                AttendanceStatus.Absent.ToString(), false, false, false, IsLinked: true);

        return new MyAttendanceToday(
            record.Id,
            record.Date,
            record.CheckInAt,
            record.CheckOutAt,
            record.WorkedMinutes,
            record.BreakMinutes,
            record.Status.ToString(),
            IsCheckedIn: record.CheckInAt != null && record.CheckOutAt == null,
            IsOnBreak: IsOnBreak(record),
            HasCheckedOut: record.CheckOutAt != null,
            IsLinked: true,
            CurrentBreakStartedAt: CurrentBreakStart(record));
    }

    public async Task<AttendanceDetail> CheckInAsync(PunchRequest request)
    {
        var employee = await CurrentEmployeeAsync();
        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);
        var record = await TrackedRecordAsync(employee.Id, today);

        if (record is not null && record.CheckOutAt is not null)
            throw new AttendanceException("You have already checked out for today.");
        if (record is not null && record.CheckInAt is not null)
            throw new AttendanceException("You are already checked in.");

        if (record is null)
        {
            record = new AttendanceRecord { EmployeeId = employee.Id, Date = today };
            _db.AttendanceRecords.Add(record);
        }

        record.CheckInAt = now;
        // Auto-classify late arrivals; leave explicit HR statuses (leave/holiday…)
        // untouched if they were pre-set.
        if (record.Status is AttendanceStatus.Present or AttendanceStatus.Absent or AttendanceStatus.Late)
            record.Status = TimeOnly.FromDateTime(now) > LateThreshold
                ? AttendanceStatus.Late
                : AttendanceStatus.Present;

        AddEvent(record, AttendanceEventType.CheckIn, now, request);
        Recompute(record);
        await _db.SaveChangesAsync();
        return await DetailAsync(record.Id);
    }

    public async Task<AttendanceDetail> CheckOutAsync(PunchRequest request)
    {
        var (record, now) = await RequireOpenRecordAsync();

        // Close any dangling break so break time is accounted for at checkout.
        if (IsOnBreak(record))
            AddEvent(record, AttendanceEventType.BreakEnd, now, request);

        record.CheckOutAt = now;
        AddEvent(record, AttendanceEventType.CheckOut, now, request);
        Recompute(record);
        await _db.SaveChangesAsync();
        return await DetailAsync(record.Id);
    }

    public async Task<AttendanceDetail> BreakStartAsync(PunchRequest request)
    {
        var (record, now) = await RequireOpenRecordAsync();
        if (IsOnBreak(record))
            throw new AttendanceException("You are already on a break.");

        AddEvent(record, AttendanceEventType.BreakStart, now, request);
        await _db.SaveChangesAsync();
        return await DetailAsync(record.Id);
    }

    public async Task<AttendanceDetail> BreakEndAsync(PunchRequest request)
    {
        var (record, now) = await RequireOpenRecordAsync();
        if (!IsOnBreak(record))
            throw new AttendanceException("You are not currently on a break.");

        AddEvent(record, AttendanceEventType.BreakEnd, now, request);
        Recompute(record);
        await _db.SaveChangesAsync();
        return await DetailAsync(record.Id);
    }

    public async Task<int> SaveManualAsync(SaveAttendanceRequest request)
    {
        if (!Enum.TryParse<AttendanceStatus>(request.Status, ignoreCase: true, out var status))
            throw new AttendanceException("Invalid attendance status.");

        var record = await TrackedRecordAsync(request.EmployeeId, request.Date)
            ?? AddNewRecord(request.EmployeeId, request.Date);

        record.CheckInAt = AsUtc(request.CheckInAt);
        record.CheckOutAt = AsUtc(request.CheckOutAt);
        record.BreakMinutes = request.BreakMinutes;
        record.Status = status;
        record.Remarks = string.IsNullOrWhiteSpace(request.Remarks) ? null : request.Remarks.Trim();
        RecomputeTotals(record);

        await _db.SaveChangesAsync();
        return record.Id;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var record = await _db.AttendanceRecords.FirstOrDefaultAsync(a => a.Id == id);
        if (record is null)
            return false;

        record.IsDeleted = true;
        record.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<AttendanceCorrection> RequestCorrectionAsync(SaveCorrectionRequest request, bool onBehalf)
    {
        // HR may raise on behalf of an employee; otherwise resolve from the user.
        var employeeId = onBehalf && request.EmployeeId is int given
            ? given
            : (await CurrentEmployeeAsync()).Id;

        AttendanceStatus? requestedStatus = null;
        if (!string.IsNullOrWhiteSpace(request.RequestedStatus))
        {
            if (!Enum.TryParse<AttendanceStatus>(request.RequestedStatus, ignoreCase: true, out var parsed))
                throw new AttendanceException("Invalid requested status.");
            requestedStatus = parsed;
        }

        var existing = await TrackedRecordAsync(employeeId, request.Date);

        var correction = new AttendanceCorrection
        {
            EmployeeId = employeeId,
            Date = request.Date,
            AttendanceRecordId = existing?.Id,
            RequestedCheckInAt = AsUtc(request.RequestedCheckInAt),
            RequestedCheckOutAt = AsUtc(request.RequestedCheckOutAt),
            RequestedStatus = requestedStatus,
            Reason = request.Reason.Trim(),
            Status = CorrectionStatus.Pending,
        };
        _db.AttendanceCorrections.Add(correction);
        await _db.SaveChangesAsync();
        return correction;
    }

    public async Task<bool> ReviewCorrectionAsync(int id, bool approve, string? reviewNotes)
    {
        var correction = await _db.AttendanceCorrections.FirstOrDefaultAsync(c => c.Id == id);
        if (correction is null)
            return false;
        if (correction.Status != CorrectionStatus.Pending)
            throw new AttendanceException("This correction has already been reviewed.");

        correction.Status = approve ? CorrectionStatus.Approved : CorrectionStatus.Rejected;
        correction.ReviewedByUserId = _tenant.UserId;
        correction.ReviewNotes = string.IsNullOrWhiteSpace(reviewNotes) ? null : reviewNotes.Trim();
        correction.ReviewedAt = DateTime.UtcNow;

        if (approve)
            await ApplyCorrectionAsync(correction);

        await _db.SaveChangesAsync();
        return true;
    }

    // --- helpers ---

    // Apply an approved correction's requested values onto the day's record,
    private async Task ApplyCorrectionAsync(AttendanceCorrection correction)
    {
        var record = await TrackedRecordAsync(correction.EmployeeId, correction.Date)
            ?? AddNewRecord(correction.EmployeeId, correction.Date);

        if (correction.RequestedCheckInAt is DateTime checkIn)
            record.CheckInAt = checkIn;
        if (correction.RequestedCheckOutAt is DateTime checkOut)
            record.CheckOutAt = checkOut;
        if (correction.RequestedStatus is AttendanceStatus status)
            record.Status = status;

        RecomputeTotals(record);
        correction.AttendanceRecordId = record.Id;
    }

    private async Task<Employee> CurrentEmployeeAsync()
    {
        if (_tenant.UserId is not int userId)
            throw new AttendanceException("You must be signed in to record attendance.");

        var employee = await _employees.GetByUserIdAsync(userId)
            ?? throw new AttendanceException("Your account is not linked to an employee record.");
        return employee;
    }

    // Non-throwing variant for read paths (self snapshot / history) where an
    // unlinked user is a valid, expected state rather than an error.
    private async Task<Employee?> TryCurrentEmployeeAsync() =>
        _tenant.UserId is int userId ? await _employees.GetByUserIdAsync(userId) : null;

    public async Task<int> CurrentEmployeeIdAsync() => (await CurrentEmployeeAsync()).Id;

    public async Task<int?> TryCurrentEmployeeIdAsync() => (await TryCurrentEmployeeAsync())?.Id;

    private async Task<(AttendanceRecord Record, DateTime Now)> RequireOpenRecordAsync()
    {
        var employee = await CurrentEmployeeAsync();
        var now = DateTime.UtcNow;
        var record = await TrackedRecordAsync(employee.Id, DateOnly.FromDateTime(now));

        if (record is null || record.CheckInAt is null)
            throw new AttendanceException("You need to check in first.");
        if (record.CheckOutAt is not null)
            throw new AttendanceException("You have already checked out for today.");

        return (record, now);
    }

    private Task<AttendanceRecord?> TrackedRecordAsync(int employeeId, DateOnly date) =>
        _db.AttendanceRecords
            .Include(a => a.Events)
            .FirstOrDefaultAsync(a => a.EmployeeId == employeeId && a.Date == date);

    private AttendanceRecord AddNewRecord(int employeeId, DateOnly date)
    {
        var record = new AttendanceRecord { EmployeeId = employeeId, Date = date };
        _db.AttendanceRecords.Add(record);
        return record;
    }

    private static void AddEvent(AttendanceRecord record, AttendanceEventType type, DateTime at, PunchRequest request)
    {
        var source = AttendanceSource.Web;
        if (!string.IsNullOrWhiteSpace(request.Source))
            Enum.TryParse(request.Source, ignoreCase: true, out source);

        record.Events.Add(new AttendanceEvent
        {
            EmployeeId = record.EmployeeId,
            Type = type,
            OccurredAt = at,
            Source = source,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
        });
    }

    private static bool IsOnBreak(AttendanceRecord record)
    {
        var last = record.Events
            .Where(e => e.Type is AttendanceEventType.BreakStart or AttendanceEventType.BreakEnd)
            .OrderBy(e => e.OccurredAt)
            .LastOrDefault();
        return last?.Type == AttendanceEventType.BreakStart;
    }

    // The start time of the currently-open break (null when not on a break).
    private static DateTime? CurrentBreakStart(AttendanceRecord record)
    {
        var last = record.Events
            .Where(e => e.Type is AttendanceEventType.BreakStart or AttendanceEventType.BreakEnd)
            .OrderBy(e => e.OccurredAt)
            .LastOrDefault();
        return last?.Type == AttendanceEventType.BreakStart ? last.OccurredAt : null;
    }

    // Recompute break/worked/overtime from the punch timeline.
    private static void Recompute(AttendanceRecord record)
    {
        record.BreakMinutes = SumBreakMinutes(record);
        RecomputeTotals(record);
    }

    // Recompute worked/overtime from check in/out and the current break total.
    private static void RecomputeTotals(AttendanceRecord record)
    {
        if (record.CheckInAt is DateTime start && record.CheckOutAt is DateTime end && end > start)
        {
            var gross = (int)(end - start).TotalMinutes;
            record.WorkedMinutes = Math.Max(0, gross - record.BreakMinutes);
            record.OvertimeMinutes = Math.Max(0, record.WorkedMinutes - StandardWorkMinutes);
        }
        else
        {
            record.WorkedMinutes = 0;
            record.OvertimeMinutes = 0;
        }
    }

    private static int SumBreakMinutes(AttendanceRecord record)
    {
        var total = 0;
        DateTime? openedAt = null;
        foreach (var e in record.Events
            .Where(e => e.Type is AttendanceEventType.BreakStart or AttendanceEventType.BreakEnd)
            .OrderBy(e => e.OccurredAt))
        {
            if (e.Type == AttendanceEventType.BreakStart)
                openedAt = e.OccurredAt;
            else if (openedAt is DateTime open && e.OccurredAt > open)
            {
                total += (int)(e.OccurredAt - open).TotalMinutes;
                openedAt = null;
            }
        }
        return total;
    }

    private async Task<AttendanceDetail> DetailAsync(int recordId)
    {
        // Re-read through the projection so the response matches the list/detail
        // endpoints exactly (names, ordered events).
        var record = await _db.AttendanceRecords
            .Where(a => a.Id == recordId)
            .Select(a => new AttendanceDetail(
                a.Id,
                a.EmployeeId,
                a.Employee.EmployeeNumber,
                a.Employee.User.FirstName + " " + a.Employee.User.LastName,
                a.Employee.Department != null ? a.Employee.Department.Name : null,
                a.Date,
                a.CheckInAt,
                a.CheckOutAt,
                a.WorkedMinutes,
                a.BreakMinutes,
                a.OvertimeMinutes,
                a.Status.ToString(),
                a.Remarks,
                a.Events
                    .OrderBy(e => e.OccurredAt)
                    .Select(e => new AttendanceEventItem(
                        e.Id, e.Type.ToString(), e.OccurredAt, e.Source.ToString(), e.Notes))
                    .ToList()))
            .FirstAsync();
        return record;
    }

    private static DateTime? AsUtc(DateTime? value) =>
        value is DateTime dt ? DateTime.SpecifyKind(dt, DateTimeKind.Utc) : null;
}
