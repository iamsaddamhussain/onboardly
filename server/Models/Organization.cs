namespace Onboardly.Server.Models;

// A tenant in the multi-tenant SaaS model. Organization-scoped users, roles and
// (future) business data belong to exactly one Organization. Platform/global
// users are not tied to an organization (User.OrganizationId is null).
public class Organization : IEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    // Short, URL/header-friendly identifier (e.g. "onboardly").
    public string Slug { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    // Subscription tier for billing/feature gating; null until onboarded.
    public string? SubscriptionTier { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<User> Users { get; set; } = new List<User>();
}
