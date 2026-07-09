using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Models;

namespace Onboardly.Server.Repositories;

// Data-access contract for departments. All queries are automatically scoped to
// the active tenant and exclude soft-deleted rows via the global query filter.
public interface IDepartmentRepository
{
    Task<PagedResult<DepartmentListItem>> GetAll(DataTableRequest request, bool? isActive, int? parentDepartmentId);

    Task<IReadOnlyList<DepartmentLookupItem>> SearchAsync(string? search, int? excludeId = null);

    Task<Department?> GetByIdAsync(int id);

    Task<DepartmentListItem?> GetRowAsync(int id);

    Task<bool> ExistsAsync(int id);

    // True when making `parentId` the parent of `departmentId` would form a cycle.
    Task<bool> WouldCreateCycleAsync(int departmentId, int parentId);

    Task<Department> Create(SaveDepartmentRequest request);

    Task Update(Department department, SaveDepartmentRequest request);

    Task SoftDelete(Department department);
}
