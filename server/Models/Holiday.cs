namespace Onboardly.Server.Models;

// A non-working company holiday. Used by the leave engine to exclude holidays
// from a request's working-day count and to render the team calendar.
// Tenant-owned and soft-deletable.
public class Holiday : IEntity, IOrgOwned, ISoftDeletable
{
    public int Id { get; set; }
    public int OrganizationId { get; set; }

    public string Name { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public HolidayType Type { get; set; } = HolidayType.Company;

    // Optional region/state label for regional holidays.
    public string? Region { get; set; }
    public string? Description { get; set; }

    // Optional holidays are not auto-excluded from leave counts by default.
    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
