namespace Onboardly.Server.Dtos;

// A single day's activity count for the GitHub-style contribution heatmap.
public record ActivityHeatmapPoint(DateOnly Date, int Count);

// A single audit-trail row for the audit log screen.
public record AuditLogListItem(
    long Id,
    int? OrganizationId,
    int? UserId,
    string Action,
    string EntityType,
    string EntityId,
    string? OldValues,
    string? NewValues,
    DateTime Timestamp,
    string? IpAddress,
    string? UserAgent);
