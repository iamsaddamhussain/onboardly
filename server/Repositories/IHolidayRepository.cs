using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Models;

namespace Onboardly.Server.Repositories;

// Data-access contract for company holidays.
public interface IHolidayRepository
{
    Task<PagedResult<HolidayListItem>> GetAll(DataTableRequest request, int? year, bool? isActive);
    Task<Holiday?> GetByIdAsync(int id);
    Task<HolidayListItem?> GetRowAsync(int id);
    Task<Holiday> Create(SaveHolidayRequest request);
    Task Update(Holiday holiday, SaveHolidayRequest request);
    Task SoftDelete(Holiday holiday);
    // Active holiday dates within an inclusive range (for leave day counting).
    Task<IReadOnlyList<DateOnly>> GetDatesInRangeAsync(DateOnly start, DateOnly end);
}
