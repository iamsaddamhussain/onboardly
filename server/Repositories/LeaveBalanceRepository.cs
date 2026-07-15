using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;
using Onboardly.Server.Models;

namespace Onboardly.Server.Repositories;

// EF Core implementation of the leave balance ledger read side. The remaining
// balance is always the signed sum of transactions, and the breakdown groups the
// same transactions by their movement type (accounting style).
public class LeaveBalanceRepository : ILeaveBalanceRepository
{
    private readonly AppDbContext _db;

    public LeaveBalanceRepository(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<LeaveBalanceSummary>> GetSummariesAsync(int employeeId, int year)
    {
        // Pull the year's ledger rows grouped by leave type, summing each movement
        // kind separately so the UI can show the full breakdown.
        var grouped = await _db.LeaveBalanceTransactions
            .Where(b => b.EmployeeId == employeeId && b.Year == year)
            .GroupBy(b => new { b.LeaveTypeId, b.LeaveType.Name, b.LeaveType.Color })
            .Select(g => new
            {
                g.Key.LeaveTypeId,
                g.Key.Name,
                g.Key.Color,
                Entitlement = g.Where(x => x.Type == LeaveLedgerEntryType.Opening || x.Type == LeaveLedgerEntryType.Accrual)
                    .Sum(x => (decimal?)x.Days) ?? 0m,
                Accrued = g.Where(x => x.Type == LeaveLedgerEntryType.Accrual).Sum(x => (decimal?)x.Days) ?? 0m,
                Used = g.Where(x => x.Type == LeaveLedgerEntryType.LeaveTaken).Sum(x => (decimal?)x.Days) ?? 0m,
                Adjustment = g.Where(x => x.Type == LeaveLedgerEntryType.Adjustment || x.Type == LeaveLedgerEntryType.ManualCorrection)
                    .Sum(x => (decimal?)x.Days) ?? 0m,
                CarriedForward = g.Where(x => x.Type == LeaveLedgerEntryType.CarryForward).Sum(x => (decimal?)x.Days) ?? 0m,
                Expired = g.Where(x => x.Type == LeaveLedgerEntryType.Expiry).Sum(x => (decimal?)x.Days) ?? 0m,
                Remaining = g.Sum(x => (decimal?)x.Days) ?? 0m,
            })
            .ToListAsync();

        return grouped
            .OrderBy(x => x.Name)
            .Select(x => new LeaveBalanceSummary(
                x.LeaveTypeId,
                x.Name,
                x.Color,
                year,
                x.Entitlement,
                x.Accrued,
                // Used/Expired are stored negative; present them as positive magnitudes.
                Math.Abs(x.Used),
                x.Adjustment,
                x.CarriedForward,
                Math.Abs(x.Expired),
                x.Remaining))
            .ToList();
    }

    public async Task<decimal> GetRemainingAsync(int employeeId, int leaveTypeId, int year) =>
        await _db.LeaveBalanceTransactions
            .Where(b => b.EmployeeId == employeeId && b.LeaveTypeId == leaveTypeId && b.Year == year)
            .SumAsync(b => (decimal?)b.Days) ?? 0m;
}
