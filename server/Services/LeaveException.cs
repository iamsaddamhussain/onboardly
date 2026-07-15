namespace Onboardly.Server.Services;

// Domain error for the leave module. Thrown for rule violations (invalid dates,
// insufficient balance, overlapping requests…) and translated to a 400 by the
// controllers, mirroring AttendanceException.
public class LeaveException : Exception
{
    public LeaveException(string message) : base(message) { }
}
