using Microsoft.AspNetCore.Mvc;
using Onboardly.Server.Authorization;
using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Repositories;

namespace Onboardly.Server.Controllers;

// Leave — company holidays used by the leave engine (excluded from working-day
// counts) and the team calendar.
[ApiController]
[Route("api/holidays")]
public class HolidaysController : ApiControllerBase
{
    private readonly IHolidayRepository _holidays;

    public HolidaysController(IHolidayRepository holidays) => _holidays = holidays;

    [HttpGet]
    [RequirePermission(Permissions.ViewHolidays, Permissions.ManageHolidays, Permissions.ViewLeave)]
    public async Task<IActionResult> GetAll(
        [FromQuery] DataTableRequest request,
        [FromQuery] int? year,
        [FromQuery] bool? isActive) =>
        Ok(await _holidays.GetAll(request, year, isActive));

    [HttpGet("{id:int}")]
    [RequirePermission(Permissions.ViewHolidays, Permissions.ManageHolidays)]
    public async Task<IActionResult> GetById(int id)
    {
        var row = await _holidays.GetRowAsync(id);
        return row is null ? NotFound(new { message = "Holiday not found." }) : Ok(row);
    }

    [HttpPost]
    [RequirePermission(Permissions.ManageHolidays)]
    public async Task<IActionResult> Create([FromBody] SaveHolidayRequest request)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var holiday = await _holidays.Create(request);
        return Created($"/api/holidays/{holiday.Id}", await _holidays.GetRowAsync(holiday.Id));
    }

    [HttpPut("{id:int}")]
    [RequirePermission(Permissions.ManageHolidays)]
    public async Task<IActionResult> Update(int id, [FromBody] SaveHolidayRequest request)
    {
        var holiday = await _holidays.GetByIdAsync(id);
        if (holiday is null)
            return NotFound(new { message = "Holiday not found." });

        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        await _holidays.Update(holiday, request);
        return Ok(await _holidays.GetRowAsync(id));
    }

    [HttpDelete("{id:int}")]
    [RequirePermission(Permissions.ManageHolidays)]
    public async Task<IActionResult> Delete(int id)
    {
        var holiday = await _holidays.GetByIdAsync(id);
        if (holiday is null)
            return NotFound(new { message = "Holiday not found." });

        await _holidays.SoftDelete(holiday);
        return NoContent();
    }
}
