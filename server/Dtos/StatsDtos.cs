namespace Onboardly.Server.Dtos;

public record DashboardStats(
    int TotalUsers,
    int ActiveUsers,
    int InactiveUsers,
    int NewThisMonth
);
