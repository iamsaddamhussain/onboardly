using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Models;

namespace Onboardly.Server.Repositories;

// Data-access contract for job titles. Automatically tenant-scoped and
// soft-delete filtered by the global query filter.
public interface IJobTitleRepository
{
    Task<PagedResult<JobTitleListItem>> GetAll(DataTableRequest request, bool? isActive);

    Task<IReadOnlyList<JobTitleLookupItem>> SearchAsync(string? search);

    Task<JobTitle?> GetByIdAsync(int id);

    Task<JobTitleListItem?> GetRowAsync(int id);

    Task<bool> ExistsAsync(int id);

    Task<JobTitle> Create(SaveJobTitleRequest request);

    Task Update(JobTitle jobTitle, SaveJobTitleRequest request);

    Task SoftDelete(JobTitle jobTitle);
}
