using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Models;

namespace Onboardly.Server.Repositories;

// Data-access contract for leave policies and their per-type entitlement lines.
public interface ILeavePolicyRepository
{
    Task<PagedResult<LeavePolicyListItem>> GetAll(DataTableRequest request, bool? isActive);
    Task<IReadOnlyList<LeavePolicyLookupItem>> SearchAsync(string? search);
    Task<LeavePolicy?> GetByIdAsync(int id);
    Task<LeavePolicyDetail?> GetDetailAsync(int id);
    Task<bool> ExistsAsync(int id);
    // The tenant's default policy id, if one is configured.
    Task<int?> GetDefaultIdAsync();
    Task<LeavePolicy> Create(SaveLeavePolicyRequest request);
    Task Update(LeavePolicy policy, SaveLeavePolicyRequest request);
    Task SoftDelete(LeavePolicy policy);
    // Clears IsDefault on every policy except the given one (kept single-default).
    Task ClearOtherDefaultsAsync(int keepPolicyId);
}
