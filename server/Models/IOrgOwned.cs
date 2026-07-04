namespace Onboardly.Server.Models;

// Marks a tenant-owned aggregate. Any entity implementing this is automatically:
//   * filtered to the active tenant on read (EF global query filter), and
//   * stamped with the active OrganizationId on insert.
// Platform-wide reads bypass the filter via IgnoreQueryFilters() behind a
// global-only policy.
public interface IOrgOwned
{
    int OrganizationId { get; set; }
}
