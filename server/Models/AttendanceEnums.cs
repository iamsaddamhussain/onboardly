namespace Onboardly.Server.Models;

// Daily attendance status. A deliberately broad lookup so the same record shape
// serves office, remote and field workforces. Shift/holiday/leave modules will
// later drive some of these automatically.
public enum AttendanceStatus
{
    Present = 0,
    Absent = 1,
    Late = 2,
    HalfDay = 3,
    Leave = 4,
    Holiday = 5,
    Weekend = 6,
    WorkFromHome = 7,
    OnDuty = 8,
}

// A single punch on a day. Break events bracket unpaid time; check in/out bound
// the working window.
public enum AttendanceEventType
{
    CheckIn = 0,
    CheckOut = 1,
    BreakStart = 2,
    BreakEnd = 3,
}

// Where a punch originated. Kept extensible so biometric/RFID/GPS/face capture
// devices can be added later without a schema change.
public enum AttendanceSource
{
    Web = 0,
    Manual = 1,
    Biometric = 2,
    Rfid = 3,
    Gps = 4,
    FaceRecognition = 5,
    Import = 6,
}

// State of an employee-raised attendance correction request.
public enum CorrectionStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
}
