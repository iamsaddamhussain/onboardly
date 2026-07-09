using Microsoft.AspNetCore.Mvc;
using Onboardly.Server.Authorization;
using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Repositories;

namespace Onboardly.Server.Controllers;

// Human Resources — departments. Organization-scoped CRUD with soft delete;
// tenant isolation and audit logging are handled by the shared infrastructure.
[ApiController]
[Route("api/departments")]
public class DepartmentsController : ApiControllerBase
{
    private readonly IDepartmentRepository _departments;
    private readonly IEmployeeRepository _employees;

    public DepartmentsController(IDepartmentRepository departments, IEmployeeRepository employees)
    {
        _departments = departments;
        _employees = employees;
    }

    [HttpGet]
    [RequirePermission(Permissions.ViewDepartments)]
    public async Task<IActionResult> GetAll(
        [FromQuery] DataTableRequest request,
        [FromQuery] bool? isActive,
        [FromQuery] int? parentDepartmentId) =>
        Ok(await _departments.GetAll(request, isActive, parentDepartmentId));

    // Typeahead options (parent selector, manager's department, filters).
    [HttpGet("lookup")]
    [RequirePermission(Permissions.ViewDepartments)]
    public async Task<IActionResult> Lookup([FromQuery] string? search, [FromQuery] int? excludeId) =>
        Ok(await _departments.SearchAsync(search, excludeId));

    [HttpGet("{id:int}")]
    [RequirePermission(Permissions.ViewDepartments)]
    public async Task<IActionResult> GetById(int id)
    {
        var row = await _departments.GetRowAsync(id);
        return row is null ? NotFound(new { message = "Department not found." }) : Ok(row);
    }

    [HttpPost]
    [RequirePermission(Permissions.CreateDepartments)]
    public async Task<IActionResult> Create([FromBody] SaveDepartmentRequest request)
    {
        await ValidateAsync(request, null);
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var department = await _departments.Create(request);
        var row = await _departments.GetRowAsync(department.Id);
        return Created($"/api/departments/{department.Id}", row);
    }

    [HttpPut("{id:int}")]
    [RequirePermission(Permissions.EditDepartments)]
    public async Task<IActionResult> Update(int id, [FromBody] SaveDepartmentRequest request)
    {
        var department = await _departments.GetByIdAsync(id);
        if (department is null)
            return NotFound(new { message = "Department not found." });

        await ValidateAsync(request, id);
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        await _departments.Update(department, request);
        return Ok(await _departments.GetRowAsync(id));
    }

    [HttpDelete("{id:int}")]
    [RequirePermission(Permissions.DeleteDepartments)]
    public async Task<IActionResult> Delete(int id)
    {
        var department = await _departments.GetByIdAsync(id);
        if (department is null)
            return NotFound(new { message = "Department not found." });

        await _departments.SoftDelete(department);
        return NoContent();
    }

    // Cross-field rules the attributes can't express: valid parent, valid
    // manager, no self/cyclic parenting. The Code is auto-generated.
    private async Task ValidateAsync(SaveDepartmentRequest request, int? id)
    {
        if (request.ParentDepartmentId is int parentId)
        {
            if (id is int self && parentId == self)
                ModelState.AddModelError(nameof(request.ParentDepartmentId), "A department cannot be its own parent.");
            else if (!await _departments.ExistsAsync(parentId))
                ModelState.AddModelError(nameof(request.ParentDepartmentId), "Selected parent department was not found.");
            else if (id is int current && await _departments.WouldCreateCycleAsync(current, parentId))
                ModelState.AddModelError(nameof(request.ParentDepartmentId), "That parent would create a circular hierarchy.");
        }

        if (request.ManagerEmployeeId is int managerId && !await _employees.ExistsAsync(managerId))
            ModelState.AddModelError(nameof(request.ManagerEmployeeId), "Selected manager was not found.");
    }
}
