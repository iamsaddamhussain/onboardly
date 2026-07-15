using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Models;

namespace Onboardly.Server.Repositories;

// Filters accepted by the employees datatable, bound from the query string
// alongside the standard DataTableRequest.
public record EmployeeFilter(
    int? DepartmentId = null,
    int? JobTitleId = null,
    string? EmploymentStatus = null,
    int? ReportingManagerId = null,
    DateTime? JoiningDateFrom = null,
    DateTime? JoiningDateTo = null);

// Data-access contract for employees. Automatically tenant-scoped and
// soft-delete filtered by the global query filter.
public interface IEmployeeRepository
{
    Task<PagedResult<EmployeeListItem>> GetAll(DataTableRequest request, EmployeeFilter filter);

    Task<IReadOnlyList<EmployeeLookupItem>> SearchAsync(string? search, int? excludeId = null);

    // Users in the active tenant that don't yet have an employee record (plus,
    // optionally, the one already linked to the employee being edited).
    Task<IReadOnlyList<AssignableUserItem>> AssignableUsersAsync(string? search, int? includeUserId = null);

    Task<Employee?> GetByIdAsync(int id);

    // The employee record linked to a user account (self-service resolution).
    Task<Employee?> GetByUserIdAsync(int userId);

    Task<EmployeeDetail?> GetDetailAsync(int id);

    // The full reporting hierarchy for the tenant, as a flat node list.
    Task<IReadOnlyList<OrgChartNode>> GetOrgChartAsync();

    Task<bool> ExistsAsync(int id);

    Task<bool> UserLinkedAsync(int userId, int? excludeId = null);

    Task<bool> UserInTenantAsync(int userId);

    Task<Employee> Create(SaveEmployeeRequest request);

    Task Update(Employee employee, SaveEmployeeRequest request);

    Task SoftDelete(Employee employee);
}
