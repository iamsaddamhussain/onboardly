using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Models;

namespace Onboardly.Server.Repositories;

// EF Core implementation of ILeaveRequestRepository (queries only).
public class LeaveRequestRepository : ILeaveRequestRepository
{
    private readonly AppDbContext _db;

    public LeaveRequestRepository(AppDbContext db) => _db = db;

    public Task<PagedResult<LeaveRequestListItem>> GetAll(
        DataTableRequest request, string? status, int? employeeId, int? leaveTypeId)
    {
        var query = _db.LeaveRequests.AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<LeaveStatus>(status, true, out var parsed))
            query = query.Where(r => r.Status == parsed);
        if (employeeId is int empId)
            query = query.Where(r => r.EmployeeId == empId);
        if (leaveTypeId is int typeId)
            query = query.Where(r => r.LeaveTypeId == typeId);

        return query
            .ToDataTable(request)
            .Searchable(term => r =>
                EF.Functions.ILike(r.Employee.User.FirstName + " " + r.Employee.User.LastName, $"%{term}%") ||
                EF.Functions.ILike(r.LeaveType.Name, $"%{term}%") ||
                EF.Functions.ILike(r.Reason, $"%{term}%"))
            .Sortable("startDate", (q, desc) => desc ? q.OrderByDescending(r => r.StartDate) : q.OrderBy(r => r.StartDate))
            .Sortable("status", (q, desc) => desc ? q.OrderByDescending(r => r.Status) : q.OrderBy(r => r.Status))
            .Sortable("totalDays", (q, desc) => desc ? q.OrderByDescending(r => r.TotalDays) : q.OrderBy(r => r.TotalDays))
            .Sortable("createdAt", (q, desc) => desc ? q.OrderByDescending(r => r.CreatedAt) : q.OrderBy(r => r.CreatedAt))
            .DefaultSort(q => q.OrderByDescending(r => r.CreatedAt))
            .ToPagedResultAsync(ToListItem);
    }

    public Task<LeaveRequest?> GetByIdAsync(int id) =>
        _db.LeaveRequests.FirstOrDefaultAsync(r => r.Id == id);

    public Task<LeaveRequestListItem?> GetRowAsync(int id) =>
        _db.LeaveRequests.Where(r => r.Id == id).Select(ToListItem).FirstOrDefaultAsync();

    public Task<bool> HasOverlapAsync(int employeeId, DateOnly start, DateOnly end, int? excludeId = null) =>
        _db.LeaveRequests.AnyAsync(r =>
            r.EmployeeId == employeeId &&
            (excludeId == null || r.Id != excludeId) &&
            (r.Status == LeaveStatus.Pending || r.Status == LeaveStatus.Approved || r.Status == LeaveStatus.Submitted) &&
            r.StartDate <= end && r.EndDate >= start);

    private static readonly System.Linq.Expressions.Expression<Func<LeaveRequest, LeaveRequestListItem>> ToListItem =
        r => new LeaveRequestListItem(
            r.Id,
            r.EmployeeId,
            r.Employee.User.FirstName + " " + r.Employee.User.LastName,
            r.LeaveTypeId,
            r.LeaveType.Name,
            r.LeaveType.Color,
            r.StartDate,
            r.EndDate,
            r.StartPortion.ToString(),
            r.EndPortion.ToString(),
            r.TotalDays,
            r.Reason,
            r.Status.ToString(),
            r.ReviewNotes,
            r.ReviewedAt,
            r.CreatedAt);
}
