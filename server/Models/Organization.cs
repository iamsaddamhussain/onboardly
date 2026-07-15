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

    // --- Attendance policy (HR-managed, per tenant) ---
    // IANA/Windows time zone the office hours below are expressed in.
    public string TimeZone { get; set; } = "UTC";
    // The days of the week the organization operates on.
    public WorkDays WorkDays { get; set; } = WorkDays.Weekdays;
    // Office check-in / check-out times (local to TimeZone).
    public TimeOnly WorkdayStart { get; set; } = new(9, 0);
    public TimeOnly WorkdayEnd { get; set; } = new(18, 0);
    // Unpaid break deducted from the scheduled/worked day, in minutes.
    public int BreakMinutes { get; set; } = 60;
    // When true, days left open past WorkdayEnd are flagged MissingPunch for HR
    // review (actual times are never auto-filled).
    public bool FlagMissingPunches { get; set; } = true;

    public ICollection<User> Users { get; set; } = new List<User>();
}
