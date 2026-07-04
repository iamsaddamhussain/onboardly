namespace Onboardly.Server.Models;

// Immutable record of an auditable action. Organization-aware: platform actions
// have a null OrganizationId; tenant actions carry the acting organization.
// Not IOrgOwned — visibility is enforced explicitly so global admins can read
// across tenants while org users are restricted to their own organization.
public class AuditLog
{
    public long Id { get; set; }
    public int? OrganizationId { get; set; }
    public int? UserId { get; set; }
    // Create / Update / Delete / StatusChange / Approve / Login / Impersonate...
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    // JSON snapshots. Old is null for creates; New is null for deletes.
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
}
