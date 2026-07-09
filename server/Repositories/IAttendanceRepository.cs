using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Models;

namespace Onboardly.Server.Repositories;

// Filters accepted by the attendance datatable, bound from the query string
// alongside the standard DataTableRequest.
public record AttendanceFilter(
    int? EmployeeId = null,
    int? DepartmentId = null,
    string? Status = null,
    DateOnly? DateFrom = null,
    DateOnly? DateTo = null);

// Data-access contract for the attendance module reads. All queries are
// automatically tenant-scoped and (for records/corrections) exclude soft-deleted
// rows via the global query filter.
public interface IAttendanceRepository
{
    Task<PagedResult<AttendanceListItem>> GetAll(DataTableRequest request, AttendanceFilter filter);

    Task<AttendanceDetail?> GetDetailAsync(int id);

    // Report rows for a date range (used by CSV export and monthly reports).
    Task<IReadOnlyList<AttendanceListItem>> GetRangeAsync(AttendanceFilter filter);

    Task<PagedResult<CorrectionListItem>> GetCorrections(
        DataTableRequest request, string? status, int? employeeId);

    // HR dashboard tiles for a given day.
    Task<AttendanceDashboard> GetDashboardAsync(DateOnly date);

    // Daily present/absent/late counts across a date range (trend chart).
    Task<IReadOnlyList<AttendanceTrendPoint>> GetTrendAsync(DateOnly from, DateOnly to);
}
