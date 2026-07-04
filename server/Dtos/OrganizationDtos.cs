namespace Onboardly.Server.Dtos;

// Organization option shown in the global-user org selector.
public record OrganizationListItem(
    int Id,
    string Name,
    string Slug,
    bool IsActive);

// Richer row for the platform-admin organizations management table.
public record OrganizationRow(
    int Id,
    string Name,
    string Slug,
    bool IsActive,
    string? SubscriptionTier,
    DateTime CreatedAt,
    int UserCount);

public record CreateOrganizationRequest(
    [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Organization name is required.")]
    [System.ComponentModel.DataAnnotations.MaxLength(200)]
    string Name,
    [System.ComponentModel.DataAnnotations.MaxLength(100)]
    string? Slug,
    [System.ComponentModel.DataAnnotations.MaxLength(50)]
    string? SubscriptionTier);

public record UpdateOrganizationRequest(
    [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Organization name is required.")]
    [System.ComponentModel.DataAnnotations.MaxLength(200)]
    string Name,
    bool IsActive,
    [System.ComponentModel.DataAnnotations.MaxLength(50)]
    string? SubscriptionTier);

// Read-only "company profile": the active organization's details plus a recent
// activity timeline (from the audit log).
public record OrganizationProfileResponse(
    int Id,
    string Name,
    string Slug,
    bool IsActive,
    string? SubscriptionTier,
    DateTime CreatedAt,
    int UserCount,
    IReadOnlyList<AuditLogListItem> RecentActivity);
