namespace Onboardly.Server.Models;

// Global roles operate at the platform level and may hold global permissions;
// Organization roles are scoped to a tenant and may only hold org permissions.
public enum RoleScope
{
    Global = 0,
    Organization = 1,
}

public class Role : IEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public RoleScope Scope { get; set; } = RoleScope.Organization;
    // Owning tenant for org-specific custom roles. Null for global roles and for
    // system/template roles shared across tenants.
    public int? OrganizationId { get; set; }

    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Permission> Permissions { get; set; } = new List<Permission>();
}
