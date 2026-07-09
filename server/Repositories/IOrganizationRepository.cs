using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Models;

namespace Onboardly.Server.Repositories;

// Data-access contract for organizations. Organizations are not tenant-scoped
// (they are the tenants), so these queries intentionally see every organization.
// Shared by the platform-admin management screen, the org selector, and the
// read-only company profile.
public interface IOrganizationRepository
{
    // Paged rows for the platform-admin organizations table.
    Task<PagedResult<OrganizationRow>> GetAll(DataTableRequest request);

    // Lightweight options for the global-user org selector (optional filter).
    Task<IReadOnlyList<OrganizationListItem>> SearchAsync(string? search);

    // The tracked entity, for update/switch flows.
    Task<Organization?> GetByIdAsync(int id);

    // A read-only projection (with user count) for the company profile.
    Task<OrganizationRow?> GetRowAsync(int id);

    Task<bool> SlugExistsAsync(string slug);

    Task<Organization> Create(string name, string slug, string? subscriptionTier);

    Task Update(Organization organization, UpdateOrganizationRequest request);
}
