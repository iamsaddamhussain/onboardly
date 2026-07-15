using Onboardly.Server.Dtos;
using Onboardly.Server.Models;

namespace Onboardly.Server.Repositories;

// Read side of the leave balance ledger: aggregates transactions into per-type
// balance summaries. Writes (appending transactions) are performed by
// LeaveService so request-driven and manual movements share one path.
public interface ILeaveBalanceRepository
{
    // Balance summary for every leave type the employee has activity or
    // entitlement for, in the given year.
    Task<IReadOnlyList<LeaveBalanceSummary>> GetSummariesAsync(int employeeId, int year);

    // The remaining balance for one leave type/year (signed sum of transactions).
    Task<decimal> GetRemainingAsync(int employeeId, int leaveTypeId, int year);
}
