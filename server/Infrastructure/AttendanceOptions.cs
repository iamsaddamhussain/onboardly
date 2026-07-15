namespace Onboardly.Server.Infrastructure;

// Global schedule for the auto-checkout sweep. The office hours and time zone
// themselves are configured per organization (HR-managed on the Organization
// entity); this only governs how often the sweep runs and an optional grace
// period after each org's office close. Bound from the "Attendance" section.
public class AttendanceOptions
{
    public const string SectionName = "Attendance";

    // Cron expression for the auto-checkout sweep. Default: every 30 minutes.
    public string AutoCheckoutCron { get; set; } = "*/30 * * * *";

    // Minutes of grace added after an organization's office close before a day
    // is force-closed.
    public int AutoCheckoutGraceMinutes { get; set; } = 0;
}
