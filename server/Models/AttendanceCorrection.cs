namespace Onboardly.Server.Models;

// An employee-raised request to correct a day's attendance (e.g. a missed
// check-out). Kept separate from the record so the original stays intact until a
// manager approves, and so an approval workflow/history can grow here later.
// Tenant-owned and soft-deletable.
public class AttendanceCorrection : IEntity, IOrgOwned, ISoftDeletable
{
    public int Id { get; set; }
    public int OrganizationId { get; set; }

    public int EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;

    // The day being corrected. The record may not exist yet (e.g. a fully missed
    // day), so we key on employee + date rather than requiring a record.
    public DateOnly Date { get; set; }
    public int? AttendanceRecordId { get; set; }
    public AttendanceRecord? AttendanceRecord { get; set; }

    // Requested values; null means "leave unchanged".
    public DateTime? RequestedCheckInAt { get; set; }
    public DateTime? RequestedCheckOutAt { get; set; }
    public AttendanceStatus? RequestedStatus { get; set; }

    public string Reason { get; set; } = string.Empty;

    public CorrectionStatus Status { get; set; } = CorrectionStatus.Pending;

    // Review outcome.
    public int? ReviewedByUserId { get; set; }
    public string? ReviewNotes { get; set; }
    public DateTime? ReviewedAt { get; set; }

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
