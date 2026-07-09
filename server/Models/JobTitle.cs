namespace Onboardly.Server.Models;

// An organizational position/designation (e.g. "Software Engineer"). This is a
// business/HR concept and is intentionally separate from application Roles and
// Permissions (which govern access control). Tenant-owned and soft-deletable.
public class JobTitle : IEntity, IOrgOwned, ISoftDeletable
{
    public int Id { get; set; }
    public int OrganizationId { get; set; }

    public string Name { get; set; } = string.Empty;
    // Short, tenant-unique code (e.g. "SWE", "PM").
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
