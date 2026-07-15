using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Authorization;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;
using Onboardly.Server.Models;
using Onboardly.Server.Repositories;

namespace Onboardly.Server.Services;

// Business logic for the leave module: applying for leave, the approval
// workflow, and the balance ledger. All balance changes flow through here as
// appended LeaveBalanceTransaction rows (accounting style) so request-driven and
// manual movements share one auditable path. Phase 1 credits entitlement
// immediately (via manual adjustment/opening); the accrual engine is Phase 2.
public interface ILeaveService
{
    Task<LeaveRequest> ApplyAsync(SaveLeaveRequest request, bool onBehalf);
    Task<bool> ReviewAsync(int id, bool approve, string? reviewNotes);
    // Cancel/withdraw a request. Reverses the balance if it was already approved.
    Task<bool> CancelAsync(int id, bool asManager);

    // Append a manual balance movement (opening credit, correction, encashment…).
    Task<LeaveBalanceTransaction> AdjustBalanceAsync(AdjustLeaveBalanceRequest request);

    Task<int> CurrentEmployeeIdAsync();
    Task<int?> TryCurrentEmployeeIdAsync();
}

public class LeaveService : ILeaveService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly IEmployeeRepository _employees;
    private readonly ILeaveRequestRepository _requests;
    private readonly ILeaveBalanceRepository _balances;
    private readonly IHolidayRepository _holidays;

    public LeaveService(
        AppDbContext db,
        ITenantContext tenant,
        IEmployeeRepository employees,
        ILeaveRequestRepository requests,
        ILeaveBalanceRepository balances,
        IHolidayRepository holidays)
    {
        _db = db;
        _tenant = tenant;
        _employees = employees;
        _requests = requests;
        _balances = balances;
        _holidays = holidays;
    }

    public async Task<LeaveRequest> ApplyAsync(SaveLeaveRequest request, bool onBehalf)
    {
        var employeeId = onBehalf && request.EmployeeId is int onBehalfId
            ? onBehalfId
            : await CurrentEmployeeIdAsync();

        var employee = await _db.Employees.FirstOrDefaultAsync(e => e.Id == employeeId)
            ?? throw new LeaveException("Employee not found.");

        var leaveType = await _db.LeaveTypes.FirstOrDefaultAsync(t => t.Id == request.LeaveTypeId && t.IsActive)
            ?? throw new LeaveException("Selected leave type is not available.");

        if (request.EndDate < request.StartDate)
            throw new LeaveException("End date cannot be before the start date.");

        var startPortion = ParsePortion(request.StartPortion);
        var endPortion = ParsePortion(request.EndPortion);

        if ((startPortion != DayPortion.Full || endPortion != DayPortion.Full) && !leaveType.AllowHalfDay)
            throw new LeaveException("Half-day leave is not allowed for this leave type.");

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (leaveType.FutureOnly && request.StartDate <= today)
            throw new LeaveException("This leave type can only be applied for future dates.");
        if (!leaveType.AllowPastDays && request.StartDate < today)
            throw new LeaveException("Backdated leave is not allowed for this leave type.");

        if (leaveType.RestrictedDuringProbation && employee.EmploymentStatus == EmploymentStatus.Probation)
            throw new LeaveException("This leave type cannot be applied for during probation.");

        var totalDays = await CountWorkingDaysAsync(request.StartDate, request.EndDate, startPortion, endPortion);
        if (totalDays <= 0)
            throw new LeaveException("The selected range contains no working days.");

        if (totalDays < leaveType.MinDurationDays)
            throw new LeaveException($"Minimum duration for this leave type is {leaveType.MinDurationDays} day(s).");
        if (leaveType.MaxDurationDays is decimal max && totalDays > max)
            throw new LeaveException($"Maximum duration for this leave type is {max} day(s).");

        if (await _requests.HasOverlapAsync(employeeId, request.StartDate, request.EndDate))
            throw new LeaveException("This request overlaps an existing leave request.");

        if (leaveType.CanAttachDocument && leaveType.DocumentRequiredAfterDays is int afterDays
            && totalDays > afterDays && string.IsNullOrWhiteSpace(request.DocumentUrl))
            throw new LeaveException($"A supporting document is required for leave longer than {afterDays} day(s).");

        // Paid leave cannot exceed the available balance for the entitlement year.
        var year = request.StartDate.Year;
        if (leaveType.IsPaid)
        {
            var remaining = await _balances.GetRemainingAsync(employeeId, leaveType.Id, year);
            if (totalDays > remaining)
                throw new LeaveException($"Insufficient balance: {remaining} day(s) available, {totalDays} requested.");
        }

        var autoApprove = !leaveType.RequiresApproval;
        var leave = new LeaveRequest
        {
            EmployeeId = employeeId,
            LeaveTypeId = leaveType.Id,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            StartPortion = startPortion,
            EndPortion = endPortion,
            TotalDays = totalDays,
            Reason = request.Reason.Trim(),
            DocumentUrl = string.IsNullOrWhiteSpace(request.DocumentUrl) ? null : request.DocumentUrl.Trim(),
            Status = autoApprove ? LeaveStatus.Approved : LeaveStatus.Pending,
        };

        if (autoApprove)
        {
            leave.ReviewedByUserId = _tenant.UserId;
            leave.ReviewedAt = DateTime.UtcNow;
        }

        _db.LeaveRequests.Add(leave);
        await _db.SaveChangesAsync();

        if (autoApprove)
            await PostUsageAsync(leave, year);

        return leave;
    }

    public async Task<bool> ReviewAsync(int id, bool approve, string? reviewNotes)
    {
        var leave = await _requests.GetByIdAsync(id);
        if (leave is null)
            return false;

        if (leave.Status is not (LeaveStatus.Pending or LeaveStatus.Submitted))
            throw new LeaveException("Only pending requests can be reviewed.");

        leave.Status = approve ? LeaveStatus.Approved : LeaveStatus.Rejected;
        leave.ReviewedByUserId = _tenant.UserId;
        leave.ReviewNotes = string.IsNullOrWhiteSpace(reviewNotes) ? null : reviewNotes.Trim();
        leave.ReviewedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        if (approve)
            await PostUsageAsync(leave, leave.StartDate.Year);

        return true;
    }

    public async Task<bool> CancelAsync(int id, bool asManager)
    {
        var leave = await _requests.GetByIdAsync(id);
        if (leave is null)
            return false;

        if (leave.Status is LeaveStatus.Cancelled or LeaveStatus.Withdrawn or LeaveStatus.Rejected)
            throw new LeaveException("This request has already been closed.");

        var wasApproved = leave.Status == LeaveStatus.Approved;
        leave.Status = wasApproved ? LeaveStatus.Cancelled : LeaveStatus.Withdrawn;
        await _db.SaveChangesAsync();

        // Return the consumed balance when an approved request is cancelled.
        if (wasApproved)
        {
            _db.LeaveBalanceTransactions.Add(new LeaveBalanceTransaction
            {
                EmployeeId = leave.EmployeeId,
                LeaveTypeId = leave.LeaveTypeId,
                Year = leave.StartDate.Year,
                Type = LeaveLedgerEntryType.Adjustment,
                Days = leave.TotalDays, // positive credit back
                LeaveRequestId = leave.Id,
                CreatedByUserId = _tenant.UserId,
                Notes = "Reversal of cancelled leave.",
            });
            await _db.SaveChangesAsync();
        }

        return true;
    }

    public async Task<LeaveBalanceTransaction> AdjustBalanceAsync(AdjustLeaveBalanceRequest request)
    {
        if (!await _employees.ExistsAsync(request.EmployeeId))
            throw new LeaveException("Employee not found.");
        if (!await _db.LeaveTypes.AnyAsync(t => t.Id == request.LeaveTypeId))
            throw new LeaveException("Leave type not found.");

        var type = Enum.TryParse<LeaveLedgerEntryType>(request.Type, true, out var t)
            ? t
            : throw new LeaveException("Unknown balance movement type.");

        // Encashment/expiry are debits; store them as negative regardless of sign.
        var days = type is LeaveLedgerEntryType.Expiry or LeaveLedgerEntryType.Encashment
            ? -Math.Abs(request.Days)
            : request.Days;

        var transaction = new LeaveBalanceTransaction
        {
            EmployeeId = request.EmployeeId,
            LeaveTypeId = request.LeaveTypeId,
            Year = request.Year ?? DateTime.UtcNow.Year,
            Type = type,
            Days = days,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            CreatedByUserId = _tenant.UserId,
        };

        _db.LeaveBalanceTransactions.Add(transaction);
        await _db.SaveChangesAsync();
        return transaction;
    }

    public async Task<int> CurrentEmployeeIdAsync()
    {
        if (_tenant.UserId is not int userId)
            throw new LeaveException("You must be signed in to apply for leave.");
        var employee = await _employees.GetByUserIdAsync(userId)
            ?? throw new LeaveException("Your account is not linked to an employee record.");
        if (!employee.LeaveEligible)
            throw new LeaveException("You are not eligible to use the leave system. Please contact HR.");
        return employee.Id;
    }

    public async Task<int?> TryCurrentEmployeeIdAsync()
    {
        if (_tenant.UserId is not int userId)
            return null;
        var employee = await _employees.GetByUserIdAsync(userId);
        return employee is { LeaveEligible: true } ? employee.Id : null;
    }

    // Appends the negative usage transaction for an approved request.
    private async Task PostUsageAsync(LeaveRequest leave, int year)
    {
        _db.LeaveBalanceTransactions.Add(new LeaveBalanceTransaction
        {
            EmployeeId = leave.EmployeeId,
            LeaveTypeId = leave.LeaveTypeId,
            Year = year,
            Type = LeaveLedgerEntryType.LeaveTaken,
            Days = -leave.TotalDays,
            LeaveRequestId = leave.Id,
            CreatedByUserId = _tenant.UserId,
            Notes = "Leave taken.",
        });
        await _db.SaveChangesAsync();
    }

    // Counts working days in the inclusive range, excluding the org's non-working
    // weekdays and active holidays, and subtracting 0.5 for each half-day portion
    // on the first/last day.
    private async Task<decimal> CountWorkingDaysAsync(
        DateOnly start, DateOnly end, DayPortion startPortion, DayPortion endPortion)
    {
        var workDays = await CurrentWorkDaysAsync();
        var holidays = (await _holidays.GetDatesInRangeAsync(start, end)).ToHashSet();

        decimal total = 0;
        for (var date = start; date <= end; date = date.AddDays(1))
        {
            if (!IsWorkingDay(date, workDays) || holidays.Contains(date))
                continue;
            total += 1;
        }

        if (total <= 0)
            return 0;

        // Half-day portions only reduce the count when the boundary day is a
        // working day (single-day requests use the start portion).
        if (startPortion != DayPortion.Full && IsWorkingDay(start, workDays) && !holidays.Contains(start))
            total -= 0.5m;
        if (start != end && endPortion != DayPortion.Full && IsWorkingDay(end, workDays) && !holidays.Contains(end))
            total -= 0.5m;

        return total < 0 ? 0 : total;
    }

    private async Task<WorkDays> CurrentWorkDaysAsync()
    {
        var org = _tenant.OrganizationId is int id ? await _db.Organizations.FindAsync(id) : null;
        return org?.WorkDays is WorkDays d && d != WorkDays.None ? d : WorkDays.Weekdays;
    }

    private static bool IsWorkingDay(DateOnly date, WorkDays workDays) =>
        workDays.HasFlag(date.DayOfWeek switch
        {
            DayOfWeek.Monday => WorkDays.Monday,
            DayOfWeek.Tuesday => WorkDays.Tuesday,
            DayOfWeek.Wednesday => WorkDays.Wednesday,
            DayOfWeek.Thursday => WorkDays.Thursday,
            DayOfWeek.Friday => WorkDays.Friday,
            DayOfWeek.Saturday => WorkDays.Saturday,
            _ => WorkDays.Sunday,
        });

    private static DayPortion ParsePortion(string? value) =>
        Enum.TryParse<DayPortion>(value, true, out var p) ? p : DayPortion.Full;
}
