namespace Onboardly.Server.Dtos;

public record DashboardStats(
    int TotalUsers,
    int ActiveUsers,
    int InactiveUsers,
    int NewThisMonth,
    // Tenant totals, populated only for the platform-wide (all organizations)
    // view; null when scoped to a single organization.
    int? TotalOrganizations = null,
    int? ActiveOrganizations = null,
    int? InactiveOrganizations = null
);
