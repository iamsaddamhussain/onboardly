using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Onboardly.Server.Authorization;
using Onboardly.Server.Dtos;
using Onboardly.Server.Repositories;
using Onboardly.Server.Services;

namespace Onboardly.Server.Controllers;

// Leave — balance ledger. Reads per-type balance summaries and records manual
// balance movements (opening credits, corrections, encashment…).
[ApiController]
[Authorize]
[Route("api/leave-balances")]
public class LeaveBalancesController : ApiControllerBase
{
    private readonly ILeaveBalanceRepository _balances;
    private readonly ILeaveService _service;

    public LeaveBalancesController(ILeaveBalanceRepository balances, ILeaveService service)
    {
        _balances = balances;
        _service = service;
    }

    // Balance summary for a specific employee (HR/approver view).
    [HttpGet("employee/{employeeId:int}")]
    [RequirePermission(Permissions.ViewLeave, Permissions.ApproveLeave, Permissions.ManageLeaveBalances)]
    public async Task<IActionResult> ForEmployee(int employeeId, [FromQuery] int? year) =>
        Ok(await _balances.GetSummariesAsync(employeeId, year ?? DateTime.UtcNow.Year));

    // The caller's own balances.
    [HttpGet("mine")]
    public async Task<IActionResult> Mine([FromQuery] int? year)
    {
        var employeeId = await _service.TryCurrentEmployeeIdAsync();
        if (employeeId is null)
            return Ok(Array.Empty<LeaveBalanceSummary>());

        return Ok(await _balances.GetSummariesAsync(employeeId.Value, year ?? DateTime.UtcNow.Year));
    }

    // Append a manual balance movement.
    [HttpPost("adjust")]
    [RequirePermission(Permissions.ManageLeaveBalances)]
    public async Task<IActionResult> Adjust([FromBody] AdjustLeaveBalanceRequest request)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        try
        {
            var transaction = await _service.AdjustBalanceAsync(request);
            return Created($"/api/leave-balances/employee/{request.EmployeeId}", new { transaction.Id });
        }
        catch (LeaveException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
