namespace Onboardly.Server.Services;

// Signals a business-rule violation in the attendance workflow (e.g. checking in
// twice, checking out before checking in, or a user with no employee record).
// Controllers translate this into a 400 with the supplied message.
public class AttendanceException : Exception
{
    public AttendanceException(string message) : base(message) { }
}
