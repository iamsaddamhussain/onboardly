using Microsoft.AspNetCore.Mvc;
using Onboardly.Server.Authorization;
using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Repositories;

namespace Onboardly.Server.Controllers;

// Human Resources — job titles (organizational positions). Distinct from RBAC
// roles/permissions. Organization-scoped CRUD with soft delete.
[ApiController]
[Route("api/jobtitles")]
public class JobTitlesController : ApiControllerBase
{
    private readonly IJobTitleRepository _jobTitles;

    public JobTitlesController(IJobTitleRepository jobTitles) => _jobTitles = jobTitles;

    [HttpGet]
    [RequirePermission(Permissions.ViewJobTitles)]
    public async Task<IActionResult> GetAll(
        [FromQuery] DataTableRequest request,
        [FromQuery] bool? isActive) =>
        Ok(await _jobTitles.GetAll(request, isActive));

    [HttpGet("lookup")]
    [RequirePermission(Permissions.ViewJobTitles)]
    public async Task<IActionResult> Lookup([FromQuery] string? search) =>
        Ok(await _jobTitles.SearchAsync(search));

    [HttpGet("{id:int}")]
    [RequirePermission(Permissions.ViewJobTitles)]
    public async Task<IActionResult> GetById(int id)
    {
        var row = await _jobTitles.GetRowAsync(id);
        return row is null ? NotFound(new { message = "Job title not found." }) : Ok(row);
    }

    [HttpPost]
    [RequirePermission(Permissions.CreateJobTitles)]
    public async Task<IActionResult> Create([FromBody] SaveJobTitleRequest request)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var jobTitle = await _jobTitles.Create(request);
        return Created($"/api/jobtitles/{jobTitle.Id}", await _jobTitles.GetRowAsync(jobTitle.Id));
    }

    [HttpPut("{id:int}")]
    [RequirePermission(Permissions.EditJobTitles)]
    public async Task<IActionResult> Update(int id, [FromBody] SaveJobTitleRequest request)
    {
        var jobTitle = await _jobTitles.GetByIdAsync(id);
        if (jobTitle is null)
            return NotFound(new { message = "Job title not found." });

        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        await _jobTitles.Update(jobTitle, request);
        return Ok(await _jobTitles.GetRowAsync(id));
    }

    [HttpDelete("{id:int}")]
    [RequirePermission(Permissions.DeleteJobTitles)]
    public async Task<IActionResult> Delete(int id)
    {
        var jobTitle = await _jobTitles.GetByIdAsync(id);
        if (jobTitle is null)
            return NotFound(new { message = "Job title not found." });

        await _jobTitles.SoftDelete(jobTitle);
        return NoContent();
    }
}
