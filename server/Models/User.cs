namespace Onboardly.Server.Models;

public class User : IEntity
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? Mobile { get; set; }
    public string? City { get; set; }
    public string? JobTitle { get; set; }
    // Preferred UI language (ISO 639-1). Supported: "en" (default), "fr".
    public string Language { get; set; } = "en";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Tenant membership. Null => platform/global user (not tied to any org).
    public int? OrganizationId { get; set; }
    public Organization? Organization { get; set; }

    public ICollection<Role> Roles { get; set; } = new List<Role>();
}
