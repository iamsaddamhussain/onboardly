using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Models;

namespace Onboardly.Server.Repositories;

// EF Core implementation of IAttendanceRepository. Tenant scoping and soft-delete
// filtering come from the global query filter; this owns query shaping,
// dashboard aggregation and report projections. Writes/business rules live in
// IAttendanceService.
public class AttendanceRepository : IAttendanceRepository
{
    private readonly AppDbContext _db;

    public AttendanceRepository(AppDbContext db) => _db = db;

    public Task<PagedResult<AttendanceListItem>> GetAll(DataTableRequest request, AttendanceFilter filter) =>
        Filtered(filter)
            .ToDataTable(request)
            .Searchable(term =>
            {
                var like = $"%{term}%";
                return a =>
                    EF.Functions.ILike(a.Employee.EmployeeNumber, like) ||
                    EF.Functions.ILike(a.Employee.User.FirstName, like) ||
                    EF.Functions.ILike(a.Employee.User.LastName, like);
            })
            .Sortable("employeeNumber", (q, desc) => desc
                ? q.OrderByDescending(a => a.Employee.EmployeeNumber)
                : q.OrderBy(a => a.Employee.EmployeeNumber))
            .Sortable("name", (q, desc) => desc
                ? q.OrderByDescending(a => a.Employee.User.FirstName).ThenByDescending(a => a.Employee.User.LastName)
                : q.OrderBy(a => a.Employee.User.FirstName).ThenBy(a => a.Employee.User.LastName))
            .Sortable("date", (q, desc) => desc ? q.OrderByDescending(a => a.Date) : q.OrderBy(a => a.Date))
            .Sortable("status", (q, desc) => desc ? q.OrderByDescending(a => a.Status) : q.OrderBy(a => a.Status))
            .Sortable("worked", (q, desc) => desc ? q.OrderByDescending(a => a.WorkedMinutes) : q.OrderBy(a => a.WorkedMinutes))
            .Sortable("overtime", (q, desc) => desc ? q.OrderByDescending(a => a.OvertimeMinutes) : q.OrderBy(a => a.OvertimeMinutes))
            .DefaultSort(q => q.OrderByDescending(a => a.Date).ThenBy(a => a.Employee.EmployeeNumber))
            .ToPagedResultAsync(a => new AttendanceListItem(
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
                a.LateMinutes,
                a.EarlyLeaveMinutes,
                a.Status.ToString(),
                a.Remarks));

    public Task<AttendanceDetail?> GetDetailAsync(int id) =>
        _db.AttendanceRecords
            .Where(a => a.Id == id)
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
                a.LateMinutes,
                a.EarlyLeaveMinutes,
                a.Status.ToString(),
                a.Remarks,
                a.Events
                    .OrderBy(e => e.OccurredAt)
                    .Select(e => new AttendanceEventItem(
                        e.Id, e.Type.ToString(), e.OccurredAt, e.Source.ToString(), e.Notes))
                    .ToList()))
            .FirstOrDefaultAsync();

    public async Task<IReadOnlyList<AttendanceListItem>> GetRangeAsync(AttendanceFilter filter) =>
        await Filtered(filter)
            .OrderBy(a => a.Date)
            .ThenBy(a => a.Employee.EmployeeNumber)
            .Select(a => new AttendanceListItem(
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
                a.LateMinutes,
                a.EarlyLeaveMinutes,
                a.Status.ToString(),
                a.Remarks))
            .ToListAsync();

    public Task<PagedResult<CorrectionListItem>> GetCorrections(
        DataTableRequest request, string? status, int? employeeId)
    {
        var query = _db.AttendanceCorrections.AsQueryable();

        if (!string.IsNullOrWhiteSpace(status)
            && Enum.TryParse<CorrectionStatus>(status, ignoreCase: true, out var parsed))
            query = query.Where(c => c.Status == parsed);
        if (employeeId is int empId)
            query = query.Where(c => c.EmployeeId == empId);

        return query
            .ToDataTable(request)
            .Searchable(term =>
            {
                var like = $"%{term}%";
                return c =>
                    EF.Functions.ILike(c.Employee.EmployeeNumber, like) ||
                    EF.Functions.ILike(c.Employee.User.FirstName, like) ||
                    EF.Functions.ILike(c.Employee.User.LastName, like) ||
                    EF.Functions.ILike(c.Reason, like);
            })
            .Sortable("date", (q, desc) => desc ? q.OrderByDescending(c => c.Date) : q.OrderBy(c => c.Date))
            .Sortable("status", (q, desc) => desc ? q.OrderByDescending(c => c.Status) : q.OrderBy(c => c.Status))
            .Sortable("createdAt", (q, desc) => desc ? q.OrderByDescending(c => c.CreatedAt) : q.OrderBy(c => c.CreatedAt))
            .DefaultSort(q => q.OrderByDescending(c => c.CreatedAt))
            .ToPagedResultAsync(c => new CorrectionListItem(
                c.Id,
                c.EmployeeId,
                c.Employee.EmployeeNumber,
                c.Employee.User.FirstName + " " + c.Employee.User.LastName,
                c.Date,
                c.RequestedCheckInAt,
                c.RequestedCheckOutAt,
                c.RequestedStatus != null ? c.RequestedStatus.ToString() : null,
                c.Reason,
                c.Status.ToString(),
                c.ReviewNotes,
                c.ReviewedAt,
                c.CreatedAt));
    }

    public async Task<AttendanceDashboard> GetDashboardAsync(DateOnly date)
    {
        var totalEmployees = await _db.Employees.CountAsync();

        // Aggregate the day's records in a single grouped round-trip.
        var day = await _db.AttendanceRecords
            .Where(a => a.Date == date)
            .GroupBy(a => 1)
            .Select(g => new
            {
                Present = g.Count(a => a.Status == AttendanceStatus.Present),
                Absent = g.Count(a => a.Status == AttendanceStatus.Absent),
                Late = g.Count(a => a.Status == AttendanceStatus.Late),
                OnLeave = g.Count(a => a.Status == AttendanceStatus.Leave),
                Wfh = g.Count(a => a.Status == AttendanceStatus.WorkFromHome),
                MissingCheckOut = g.Count(a => a.CheckInAt != null && a.CheckOutAt == null),
            })
            .FirstOrDefaultAsync();

        var pendingCorrections = await _db.AttendanceCorrections
            .CountAsync(c => c.Status == CorrectionStatus.Pending);

        return new AttendanceDashboard(
            date,
            totalEmployees,
            day?.Present ?? 0,
            day?.Absent ?? 0,
            day?.Late ?? 0,
            day?.OnLeave ?? 0,
            day?.Wfh ?? 0,
            day?.MissingCheckOut ?? 0,
            pendingCorrections);
    }

    public async Task<IReadOnlyList<AttendanceTrendPoint>> GetTrendAsync(DateOnly from, DateOnly to)
    {
        var rows = await _db.AttendanceRecords
            .Where(a => a.Date >= from && a.Date <= to)
            .GroupBy(a => a.Date)
            .Select(g => new AttendanceTrendPoint(
                g.Key,
                g.Count(a => a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.WorkFromHome),
                g.Count(a => a.Status == AttendanceStatus.Absent),
                g.Count(a => a.Status == AttendanceStatus.Late)))
            .ToListAsync();

        return rows.OrderBy(r => r.Date).ToList();
    }

    // Shared filter for list, range and report queries.
    private IQueryable<AttendanceRecord> Filtered(AttendanceFilter filter)
    {
        var query = _db.AttendanceRecords.AsQueryable();

        if (filter.EmployeeId is int employeeId)
            query = query.Where(a => a.EmployeeId == employeeId);
        if (filter.DepartmentId is int departmentId)
            query = query.Where(a => a.Employee.DepartmentId == departmentId);
        if (!string.IsNullOrWhiteSpace(filter.Status)
            && Enum.TryParse<AttendanceStatus>(filter.Status, ignoreCase: true, out var status))
            query = query.Where(a => a.Status == status);
        if (filter.DateFrom is DateOnly from)
            query = query.Where(a => a.Date >= from);
        if (filter.DateTo is DateOnly to)
            query = query.Where(a => a.Date <= to);

        return query;
    }
}
