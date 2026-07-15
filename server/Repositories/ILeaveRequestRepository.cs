using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Models;

namespace Onboardly.Server.Repositories;

// Read/query shaping for leave requests. Writes and workflow transitions live in
// LeaveService so balance ledger side-effects stay in one place.
public interface ILeaveRequestRepository
{
    Task<PagedResult<LeaveRequestListItem>> GetAll(
        DataTableRequest request, string? status, int? employeeId, int? leaveTypeId);

    Task<LeaveRequest?> GetByIdAsync(int id);
    Task<LeaveRequestListItem?> GetRowAsync(int id);

    // Approved/pending requests for an employee that overlap the given range
    // (used to block double-booking).
    Task<bool> HasOverlapAsync(int employeeId, DateOnly start, DateOnly end, int? excludeId = null);
}
