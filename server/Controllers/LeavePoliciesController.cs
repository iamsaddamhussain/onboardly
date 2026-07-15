using Microsoft.AspNetCore.Mvc;
using Onboardly.Server.Authorization;
using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Repositories;

namespace Onboardly.Server.Controllers;

// Leave — policies bundling leave types with per-policy entitlement. Employees
// inherit a policy, so HR maintains rules in one place.
[ApiController]
[Route("api/leave-policies")]
public class LeavePoliciesController : ApiControllerBase
{
    private readonly ILeavePolicyRepository _policies;
    private readonly ILeaveTypeRepository _leaveTypes;

    public LeavePoliciesController(ILeavePolicyRepository policies, ILeaveTypeRepository leaveTypes)
    {
        _policies = policies;
        _leaveTypes = leaveTypes;
    }

    [HttpGet]
    [RequirePermission(Permissions.ViewLeave, Permissions.ManageLeavePolicies)]
    public async Task<IActionResult> GetAll(
        [FromQuery] DataTableRequest request,
        [FromQuery] bool? isActive) =>
        Ok(await _policies.GetAll(request, isActive));

    [HttpGet("lookup")]
    [RequirePermission(Permissions.ViewLeave, Permissions.ManageLeavePolicies, Permissions.EditEmployees, Permissions.CreateEmployees)]
    public async Task<IActionResult> Lookup([FromQuery] string? search) =>
        Ok(await _policies.SearchAsync(search));

    [HttpGet("{id:int}")]
    [RequirePermission(Permissions.ViewLeave, Permissions.ManageLeavePolicies)]
    public async Task<IActionResult> GetById(int id)
    {
        var detail = await _policies.GetDetailAsync(id);
        return detail is null ? NotFound(new { message = "Leave policy not found." }) : Ok(detail);
    }

    [HttpPost]
    [RequirePermission(Permissions.ManageLeavePolicies)]
    public async Task<IActionResult> Create([FromBody] SaveLeavePolicyRequest request)
    {
        await ValidateAsync(request);
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var policy = await _policies.Create(request);
        if (policy.IsDefault)
            await _policies.ClearOtherDefaultsAsync(policy.Id);

        return Created($"/api/leave-policies/{policy.Id}", await _policies.GetDetailAsync(policy.Id));
    }

    [HttpPut("{id:int}")]
    [RequirePermission(Permissions.ManageLeavePolicies)]
    public async Task<IActionResult> Update(int id, [FromBody] SaveLeavePolicyRequest request)
    {
        var policy = await _policies.GetByIdAsync(id);
        if (policy is null)
            return NotFound(new { message = "Leave policy not found." });

        await ValidateAsync(request);
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        await _policies.Update(policy, request);
        if (policy.IsDefault)
            await _policies.ClearOtherDefaultsAsync(policy.Id);

        return Ok(await _policies.GetDetailAsync(id));
    }

    [HttpDelete("{id:int}")]
    [RequirePermission(Permissions.ManageLeavePolicies)]
    public async Task<IActionResult> Delete(int id)
    {
        var policy = await _policies.GetByIdAsync(id);
        if (policy is null)
            return NotFound(new { message = "Leave policy not found." });

        await _policies.SoftDelete(policy);
        return NoContent();
    }

    // Every referenced leave type must exist, and lines must be unique.
    private async Task ValidateAsync(SaveLeavePolicyRequest request)
    {
        var lines = request.Lines ?? Array.Empty<SaveLeavePolicyLine>();

        if (lines.Select(l => l.LeaveTypeId).Distinct().Count() != lines.Count)
            ModelState.AddModelError(nameof(request.Lines), "A leave type may only appear once in a policy.");

        foreach (var line in lines)
        {
            if (!await _leaveTypes.ExistsAsync(line.LeaveTypeId))
            {
                ModelState.AddModelError(nameof(request.Lines), "One of the selected leave types was not found.");
                break;
            }
        }
    }
}
