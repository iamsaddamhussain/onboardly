using Onboardly.Server.Dtos;

namespace Onboardly.Server.Repositories;

// Data-access contract for the dashboard — keeps the aggregate queries out of
// the controller so it stays focused on HTTP concerns.
public interface IDashboardRepository
{
    Task<DashboardStats> GetStats();
}
