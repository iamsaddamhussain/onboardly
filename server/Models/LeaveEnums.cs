namespace Onboardly.Server.Models;

// How a leave type's yearly entitlement is credited to employees. Phase 1
// supports Immediate (whole entitlement up front) with manual HR adjustment;
// the scheduled variants are recognised now so the accrual engine (Phase 2) can
// drive them without a schema change.
public enum AccrualMethod
{
    Immediate = 0,
    Monthly = 1,
    Quarterly = 2,
    Anniversary = 3,
    CalendarYear = 4,
}

// Lifecycle of a leave request. Draft is an unsubmitted draft; Submitted/Pending
// await approval; the remaining states are terminal outcomes.
public enum LeaveStatus
{
    Draft = 0,
    Submitted = 1,
    Pending = 2,
    Approved = 3,
    Rejected = 4,
    Cancelled = 5,
    Withdrawn = 6,
}

// Which part of a day a half-day request covers. Full means a whole working day.
public enum DayPortion
{
    Full = 0,
    FirstHalf = 1,
    SecondHalf = 2,
}

// Kinds of movement in the leave balance ledger. Balance is always the signed
// sum of a leave type's transactions for an employee in a given year, so this is
// never calculated directly — every change is an appended transaction.
public enum LeaveLedgerEntryType
{
    Opening = 0,
    Accrual = 1,
    Adjustment = 2,
    LeaveTaken = 3,
    CarryForward = 4,
    Expiry = 5,
    ManualCorrection = 6,
    Encashment = 7,
}

// Optional gender eligibility for a leave type (e.g. maternity/paternity).
public enum GenderRestriction
{
    Any = 0,
    Male = 1,
    Female = 2,
}

// Category of a company holiday for reporting/calendar colouring.
public enum HolidayType
{
    Company = 0,
    National = 1,
    Regional = 2,
    Optional = 3,
}
