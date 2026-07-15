using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Models;

namespace Onboardly.Server.Repositories;

// Data-access contract for leave types. Queries are tenant-scoped and exclude
// soft-deleted rows via the global query filter.
public interface ILeaveTypeRepository
{
    Task<PagedResult<LeaveTypeListItem>> GetAll(DataTableRequest request, bool? isActive);
    Task<IReadOnlyList<LeaveTypeLookupItem>> SearchAsync(string? search);
    Task<LeaveType?> GetByIdAsync(int id);
    Task<LeaveTypeListItem?> GetRowAsync(int id);
    Task<bool> ExistsAsync(int id);
    Task<LeaveType> Create(SaveLeaveTypeRequest request);
    Task Update(LeaveType leaveType, SaveLeaveTypeRequest request);
    Task SoftDelete(LeaveType leaveType);
}
