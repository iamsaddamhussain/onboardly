namespace Onboardly.Server.Models;

// An immutable punch belonging to a day's AttendanceRecord. Storing raw events
// (rather than only aggregated totals) preserves an audit-grade timeline and
// lets future capture sources (biometric, RFID, GPS, face) append without
// changing the daily aggregate. Tenant-owned.
public class AttendanceEvent : IEntity, IOrgOwned
{
    public int Id { get; set; }
    public int OrganizationId { get; set; }

    public int AttendanceRecordId { get; set; }
    public AttendanceRecord AttendanceRecord { get; set; } = null!;

    // Denormalised for straightforward per-employee event queries.
    public int EmployeeId { get; set; }

    public AttendanceEventType Type { get; set; }
    public DateTime OccurredAt { get; set; }
    public AttendanceSource Source { get; set; } = AttendanceSource.Web;

    // Optional capture metadata (e.g. device id, geo string) — free-form for now.
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
