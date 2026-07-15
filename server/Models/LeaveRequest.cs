namespace Onboardly.Server.Models;

// An employee's request to take leave of a given type over a date range. Kept
// separate from the balance ledger: an approval appends a LeaveTaken transaction
// so the original request and the balance movement each stay auditable.
// Tenant-owned and soft-deletable.
public class LeaveRequest : IEntity, IOrgOwned, ISoftDeletable
{
    public int Id { get; set; }
    public int OrganizationId { get; set; }

    public int EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;

    public int LeaveTypeId { get; set; }
    public LeaveType LeaveType { get; set; } = null!;

    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }

    // Half-day portions for the first/last day of the range. Full on both means
    // whole days throughout.
    public DayPortion StartPortion { get; set; } = DayPortion.Full;
    public DayPortion EndPortion { get; set; } = DayPortion.Full;

    // Computed working-day count for the request (excludes weekends/holidays,
    // accounts for half-day portions).
    public decimal TotalDays { get; set; }

    public string Reason { get; set; } = string.Empty;

    // Optional supporting document reference (URL/path in wwwroot or storage).
    public string? DocumentUrl { get; set; }

    public LeaveStatus Status { get; set; } = LeaveStatus.Pending;

    // Review outcome.
    public int? ReviewedByUserId { get; set; }
    public string? ReviewNotes { get; set; }
    public DateTime? ReviewedAt { get; set; }

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
