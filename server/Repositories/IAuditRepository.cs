using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;

namespace Onboardly.Server.Repositories;

// Data-access contract for the audit log table screen. Kept separate from
// IAuditService (which writes entries and builds short activity timelines) —
// this owns the paged/sortable/searchable query behind the audit grid.
public interface IAuditRepository
{
    // Paged audit rows. When canViewAllTenants is true and the caller is on the
    // platform-wide view (no active org), every organization's logs are returned;
    // otherwise results are limited to the active organization.
    Task<PagedResult<AuditLogListItem>> GetAll(DataTableRequest request, bool canViewAllTenants);
}
