using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Models;

namespace Onboardly.Server.Repositories;

// EF Core implementation of IHolidayRepository.
public class HolidayRepository : IHolidayRepository
{
    private readonly AppDbContext _db;

    public HolidayRepository(AppDbContext db) => _db = db;

    public Task<PagedResult<HolidayListItem>> GetAll(DataTableRequest request, int? year, bool? isActive)
    {
        var query = _db.Holidays.AsQueryable();

        if (year is int y)
        {
            var from = new DateOnly(y, 1, 1);
            var to = new DateOnly(y, 12, 31);
            query = query.Where(h => h.Date >= from && h.Date <= to);
        }
        if (isActive is bool active)
            query = query.Where(h => h.IsActive == active);

        return query
            .ToDataTable(request)
            .Searchable(term => h =>
                EF.Functions.ILike(h.Name, $"%{term}%") ||
                (h.Region != null && EF.Functions.ILike(h.Region, $"%{term}%")))
            .Sortable("name", (q, desc) => desc ? q.OrderByDescending(h => h.Name) : q.OrderBy(h => h.Name))
            .Sortable("date", (q, desc) => desc ? q.OrderByDescending(h => h.Date) : q.OrderBy(h => h.Date))
            .Sortable("status", (q, desc) => desc ? q.OrderByDescending(h => h.IsActive) : q.OrderBy(h => h.IsActive))
            .DefaultSort(q => q.OrderBy(h => h.Date))
            .ToPagedResultAsync(ToListItem);
    }

    public Task<Holiday?> GetByIdAsync(int id) =>
        _db.Holidays.FirstOrDefaultAsync(h => h.Id == id);

    public Task<HolidayListItem?> GetRowAsync(int id) =>
        _db.Holidays.Where(h => h.Id == id).Select(ToListItem).FirstOrDefaultAsync();

    public async Task<Holiday> Create(SaveHolidayRequest request)
    {
        var holiday = new Holiday();
        ApplyRequest(holiday, request);
        _db.Holidays.Add(holiday);
        await _db.SaveChangesAsync();
        return holiday;
    }

    public async Task Update(Holiday holiday, SaveHolidayRequest request)
    {
        ApplyRequest(holiday, request);
        await _db.SaveChangesAsync();
    }

    public async Task SoftDelete(Holiday holiday)
    {
        holiday.IsDeleted = true;
        holiday.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    public async Task<IReadOnlyList<DateOnly>> GetDatesInRangeAsync(DateOnly start, DateOnly end) =>
        await _db.Holidays
            .Where(h => h.IsActive && h.Date >= start && h.Date <= end)
            .Select(h => h.Date)
            .ToListAsync();

    private static void ApplyRequest(Holiday h, SaveHolidayRequest r)
    {
        h.Name = r.Name.Trim();
        h.Date = r.Date;
        h.Type = Enum.TryParse<HolidayType>(r.Type, true, out var t) ? t : HolidayType.Company;
        h.Region = string.IsNullOrWhiteSpace(r.Region) ? null : r.Region.Trim();
        h.Description = string.IsNullOrWhiteSpace(r.Description) ? null : r.Description.Trim();
        h.IsActive = r.IsActive;
    }

    private static readonly System.Linq.Expressions.Expression<Func<Holiday, HolidayListItem>> ToListItem =
        h => new HolidayListItem(
            h.Id,
            h.Name,
            h.Date,
            h.Type.ToString(),
            h.Region,
            h.Description,
            h.IsActive,
            h.CreatedAt,
            h.UpdatedAt);
}
