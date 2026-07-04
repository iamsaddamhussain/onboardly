namespace Onboardly.Server.Models;

public class Permission : IEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    // Platform-level permission ("platform.*"). Only assignable to global roles.
    public bool IsGlobal { get; set; }

    public ICollection<Role> Roles { get; set; } = new List<Role>();
}
