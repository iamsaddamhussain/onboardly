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
    IReadOnlyList<AuditLogListItem> RecentActivity,
    string TimeZone,
    IReadOnlyList<string> WorkDays,
    TimeOnly WorkdayStart,
    TimeOnly WorkdayEnd,
    int BreakMinutes,
    bool FlagMissingPunches);

// HR-managed attendance policy for the active organization: the office time zone,
// working days and window, and whether open days are flagged for review.
public record UpdateAttendanceSettingsRequest(
    [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Time zone is required.")]
    [System.ComponentModel.DataAnnotations.MaxLength(64)]
    string TimeZone,
    IReadOnlyList<string> WorkDays,
    TimeOnly WorkdayStart,
    TimeOnly WorkdayEnd,
    [System.ComponentModel.DataAnnotations.Range(0, 1440, ErrorMessage = "Break minutes must be between 0 and 1440.")]
    int BreakMinutes,
    bool FlagMissingPunches);
