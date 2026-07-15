namespace Onboardly.Server.Models;

// The daily attendance aggregate: exactly one row per employee per calendar day
// within a tenant. Check in/out and break totals are maintained as punches
// arrive; worked/overtime minutes are derived so reporting stays a simple read.
// Tenant-owned and soft-deletable. Designed as the foundation that leave,
// payroll, shift and device-capture modules extend.
public class AttendanceRecord : IEntity, IOrgOwned, ISoftDeletable
{
    public int Id { get; set; }
    public int OrganizationId { get; set; }

    public int EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;

    // Calendar day this record covers (tenant local date).
    public DateOnly Date { get; set; }

    public DateTime? CheckInAt { get; set; }
    public DateTime? CheckOutAt { get; set; }

    // Derived totals (minutes) kept denormalised for fast reporting.
    public int WorkedMinutes { get; set; }
    public int BreakMinutes { get; set; }
    public int OvertimeMinutes { get; set; }
    // Minutes late vs the scheduled start, and minutes left before scheduled end.
    // Derived from the actual punches against the org schedule; punches are never
    // altered to "fix" these.
    public int LateMinutes { get; set; }
    public int EarlyLeaveMinutes { get; set; }

    public AttendanceStatus Status { get; set; } = AttendanceStatus.Present;
    public string? Remarks { get; set; }

    // Individual punches backing this day (check in/out, break start/end).
    public ICollection<AttendanceEvent> Events { get; set; } = new List<AttendanceEvent>();

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
