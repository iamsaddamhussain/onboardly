using Microsoft.AspNetCore.Mvc;
using Onboardly.Server.Authorization;
using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Models;
using Onboardly.Server.Repositories;
using Onboardly.Server.Services;

namespace Onboardly.Server.Controllers;

// Human Resources — employees. The master workforce record, linked to a User
// account. Organization-scoped CRUD with soft delete, filtering and an audit
// activity feed. Tenant isolation and change auditing are handled by the shared
// infrastructure.
[ApiController]
[Route("api/employees")]
public class EmployeesController : ApiControllerBase
{
    private readonly IEmployeeRepository _employees;
    private readonly IDepartmentRepository _departments;
    private readonly IJobTitleRepository _jobTitles;
    private readonly IAuditService _audit;

    public EmployeesController(
        IEmployeeRepository employees,
        IDepartmentRepository departments,
        IJobTitleRepository jobTitles,
        IAuditService audit)
    {
        _employees = employees;
        _departments = departments;
        _jobTitles = jobTitles;
        _audit = audit;
    }

    [HttpGet]
    [RequirePermission(Permissions.ViewEmployees)]
    public async Task<IActionResult> GetAll(
        [FromQuery] DataTableRequest request,
        [FromQuery] EmployeeFilter filter) =>
        Ok(await _employees.GetAll(request, filter));

    // Typeahead options for reporting-manager and department-manager selectors.
    [HttpGet("lookup")]
    [RequirePermission(Permissions.ViewEmployees)]
    public async Task<IActionResult> Lookup([FromQuery] string? search, [FromQuery] int? excludeId) =>
        Ok(await _employees.SearchAsync(search, excludeId));

    // The reporting hierarchy for the org chart (flat node list).
    [HttpGet("org-chart")]
    [RequirePermission(Permissions.ViewOrgChart)]
    public async Task<IActionResult> OrgChart() =>
        Ok(await _employees.GetOrgChartAsync());

    // Users in the tenant that can be linked to a new/edited employee.
    [HttpGet("assignable-users")]
    [RequirePermission(Permissions.CreateEmployees, Permissions.EditEmployees)]
    public async Task<IActionResult> AssignableUsers([FromQuery] string? search, [FromQuery] int? includeUserId) =>
        Ok(await _employees.AssignableUsersAsync(search, includeUserId));

    [HttpGet("{id:int}")]
    [RequirePermission(Permissions.ViewEmployees, Permissions.ViewOrgChart)]
    public async Task<IActionResult> GetById(int id)
    {
        var detail = await _employees.GetDetailAsync(id);
        return detail is null ? NotFound(new { message = "Employee not found." }) : Ok(detail);
    }

    // Audit history for this employee (Activity tab on the profile page).
    [HttpGet("{id:int}/activity")]
    [RequirePermission(Permissions.ViewEmployees)]
    public async Task<IActionResult> Activity(int id)
    {
        if (!await _employees.ExistsAsync(id))
            return NotFound(new { message = "Employee not found." });

        var entries = await _audit.GetForEntityAsync(nameof(Employee), id.ToString());
        return Ok(entries);
    }

    [HttpPost]
    [RequirePermission(Permissions.CreateEmployees)]
    public async Task<IActionResult> Create([FromBody] SaveEmployeeRequest request)
    {
        await ValidateAsync(request, null);
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var employee = await _employees.Create(request);
        return Created($"/api/employees/{employee.Id}", await _employees.GetDetailAsync(employee.Id));
    }

    [HttpPut("{id:int}")]
    [RequirePermission(Permissions.EditEmployees)]
    public async Task<IActionResult> Update(int id, [FromBody] SaveEmployeeRequest request)
    {
        var employee = await _employees.GetByIdAsync(id);
        if (employee is null)
            return NotFound(new { message = "Employee not found." });

        await ValidateAsync(request, id);
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        await _employees.Update(employee, request);
        return Ok(await _employees.GetDetailAsync(id));
    }

    [HttpDelete("{id:int}")]
    [RequirePermission(Permissions.DeleteEmployees)]
    public async Task<IActionResult> Delete(int id)
    {
        var employee = await _employees.GetByIdAsync(id);
        if (employee is null)
            return NotFound(new { message = "Employee not found." });

        await _employees.SoftDelete(employee);
        return NoContent();
    }

    // Cross-field/reference rules beyond the attribute validation on the request.
    private async Task ValidateAsync(SaveEmployeeRequest request, int? id)
    {
        // Linked user must belong to the active tenant and map to a single employee.
        if (!await _employees.UserInTenantAsync(request.UserId))
            ModelState.AddModelError(nameof(request.UserId), "Selected user was not found in this organization.");
        else if (await _employees.UserLinkedAsync(request.UserId, id))
            ModelState.AddModelError(nameof(request.UserId), "That user is already linked to another employee.");

        if (!Enum.TryParse<EmploymentStatus>(request.EmploymentStatus, ignoreCase: true, out _))
            ModelState.AddModelError(nameof(request.EmploymentStatus), "Invalid employment status.");
        if (!Enum.TryParse<EmploymentType>(request.EmploymentType, ignoreCase: true, out _))
            ModelState.AddModelError(nameof(request.EmploymentType), "Invalid employment type.");

        if (request.DepartmentId is int departmentId && !await _departments.ExistsAsync(departmentId))
            ModelState.AddModelError(nameof(request.DepartmentId), "Selected department was not found.");
        if (request.JobTitleId is int jobTitleId && !await _jobTitles.ExistsAsync(jobTitleId))
            ModelState.AddModelError(nameof(request.JobTitleId), "Selected job title was not found.");

        if (request.ReportingManagerId is int managerId)
        {
            if (id is int self && managerId == self)
                ModelState.AddModelError(nameof(request.ReportingManagerId), "An employee cannot report to themselves.");
            else if (!await _employees.ExistsAsync(managerId))
                ModelState.AddModelError(nameof(request.ReportingManagerId), "Selected reporting manager was not found.");
        }
    }
}
