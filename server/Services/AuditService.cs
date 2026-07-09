using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;
using Onboardly.Server.Models;

namespace Onboardly.Server.Services;

// Writes audit entries for actions that aren't plain entity changes and so
// aren't captured by AuditInterceptor — e.g. login and impersonation. Callers
// supply the acting user/org explicitly since the tenant context may not be
// resolved yet (login happens before the auth cookie is established).
public interface IAuditService
{
    Task LogAsync(
        string action,
        string entityType,
        string entityId,
        int? userId,
        int? organizationId,
        object? newValues = null,
        CancellationToken ct = default);

    // Recent audit entries for a single user's timeline (their own activity).
    Task<IReadOnlyList<AuditLogListItem>> GetRecentForUserAsync(int userId, int take = 20);

    // Recent audit entries for an organization's timeline (company activity).
    Task<IReadOnlyList<AuditLogListItem>> GetRecentForOrganizationAsync(int organizationId, int take = 20);

    // Daily activity counts for a user's contribution heatmap (since a date).
    Task<IReadOnlyList<ActivityHeatmapPoint>> GetHeatmapForUserAsync(int userId, DateTime since);

    // Daily activity counts for an organization's contribution heatmap.
    Task<IReadOnlyList<ActivityHeatmapPoint>> GetHeatmapForOrganizationAsync(int organizationId, DateTime since);
}

public class AuditService : IAuditService
{
    private readonly AppDbContext _db;
    private readonly IHttpContextAccessor _http;

    public AuditService(AppDbContext db, IHttpContextAccessor http)
    {
        _db = db;
        _http = http;
    }

    public async Task LogAsync(
        string action,
        string entityType,
        string entityId,
        int? userId,
        int? organizationId,
        object? newValues = null,
        CancellationToken ct = default)
    {
        var userAgent = _http.HttpContext?.Request.Headers.UserAgent.ToString();

        _db.AuditLogs.Add(new AuditLog
        {
            OrganizationId = organizationId,
            UserId = userId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            NewValues = newValues is null ? null : JsonSerializer.Serialize(newValues),
            Timestamp = DateTime.UtcNow,
            IpAddress = _http.HttpContext?.Connection.RemoteIpAddress?.ToString(),
            UserAgent = string.IsNullOrEmpty(userAgent) ? null : userAgent,
        });

        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<AuditLogListItem>> GetRecentForUserAsync(int userId, int take = 20) =>
        await RecentQuery(_db.AuditLogs.Where(a => a.UserId == userId), take);

    public async Task<IReadOnlyList<AuditLogListItem>> GetRecentForOrganizationAsync(int organizationId, int take = 20) =>
        await RecentQuery(_db.AuditLogs.Where(a => a.OrganizationId == organizationId), take);

    public Task<IReadOnlyList<ActivityHeatmapPoint>> GetHeatmapForUserAsync(int userId, DateTime since) =>
        HeatmapQuery(_db.AuditLogs.Where(a => a.UserId == userId), since);

    public Task<IReadOnlyList<ActivityHeatmapPoint>> GetHeatmapForOrganizationAsync(int organizationId, DateTime since) =>
        HeatmapQuery(_db.AuditLogs.Where(a => a.OrganizationId == organizationId), since);

    // Groups audit rows by calendar day (UTC) and counts them. The DateOnly
    // conversion runs in-memory after materialisation so it stays translatable.
    private static async Task<IReadOnlyList<ActivityHeatmapPoint>> HeatmapQuery(IQueryable<AuditLog> query, DateTime since)
    {
        var rows = await query
            .AsNoTracking()
            .Where(a => a.Timestamp >= since)
            .GroupBy(a => a.Timestamp.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .ToListAsync();

        return rows
            .Select(r => new ActivityHeatmapPoint(DateOnly.FromDateTime(r.Date), r.Count))
            .ToList();
    }

    private static async Task<IReadOnlyList<AuditLogListItem>> RecentQuery(IQueryable<AuditLog> query, int take) =>
        await query
            .AsNoTracking()
            .OrderByDescending(a => a.Timestamp)
            .Take(take)
            .Select(a => new AuditLogListItem(
                a.Id, a.OrganizationId, a.UserId, a.Action, a.EntityType, a.EntityId,
                a.OldValues, a.NewValues, a.Timestamp, a.IpAddress, a.UserAgent))
            .ToListAsync();
}
