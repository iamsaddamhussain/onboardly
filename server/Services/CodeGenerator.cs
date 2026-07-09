using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Authorization;
using Onboardly.Server.Data;

namespace Onboardly.Server.Services;

// Generates sequential, human-readable reference codes for HR aggregates,
// prefixed with a short code derived from the active organization (e.g.
// "ONBO-EMP-00001"). Codes are unique per tenant; the sequence counts across
// live and soft-deleted rows so a value is never reused.
public interface ICodeGenerator
{
    Task<string> NextEmployeeNumberAsync();
    Task<string> NextDepartmentCodeAsync();
    Task<string> NextJobTitleCodeAsync();
}

public class CodeGenerator : ICodeGenerator
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenant;

    public CodeGenerator(AppDbContext db, ITenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    public Task<string> NextEmployeeNumberAsync() =>
        NextAsync(
            "EMP",
            padding: 5,
            countAsync: orgId => _db.Employees.IgnoreQueryFilters().CountAsync(e => e.OrganizationId == orgId),
            existsAsync: (orgId, code) => _db.Employees.IgnoreQueryFilters()
                .AnyAsync(e => e.OrganizationId == orgId && e.EmployeeNumber == code));

    public Task<string> NextDepartmentCodeAsync() =>
        NextAsync(
            "DEP",
            padding: 3,
            countAsync: orgId => _db.Departments.IgnoreQueryFilters().CountAsync(d => d.OrganizationId == orgId),
            existsAsync: (orgId, code) => _db.Departments.IgnoreQueryFilters()
                .AnyAsync(d => d.OrganizationId == orgId && d.Code == code));

    public Task<string> NextJobTitleCodeAsync() =>
        NextAsync(
            "JOB",
            padding: 3,
            countAsync: orgId => _db.JobTitles.IgnoreQueryFilters().CountAsync(j => j.OrganizationId == orgId),
            existsAsync: (orgId, code) => _db.JobTitles.IgnoreQueryFilters()
                .AnyAsync(j => j.OrganizationId == orgId && j.Code == code));

    // Builds "{PREFIX}-{KIND}-{seq}" and increments until the value is free.
    private async Task<string> NextAsync(
        string kind,
        int padding,
        Func<int, Task<int>> countAsync,
        Func<int, string, Task<bool>> existsAsync)
    {
        var orgId = _tenant.OrganizationId ?? 0;
        var prefix = await CompanyPrefixAsync(orgId);
        var seq = await countAsync(orgId);

        string code;
        do
        {
            seq++;
            code = $"{prefix}-{kind}-{seq.ToString().PadLeft(padding, '0')}";
        }
        while (await existsAsync(orgId, code));

        return code;
    }

    // Short, uppercase alphanumeric prefix from the organization slug (e.g.
    // "onboardly" -> "ONBO"). Falls back to "ORG" when unavailable.
    private async Task<string> CompanyPrefixAsync(int orgId)
    {
        var slug = await _db.Organizations
            .Where(o => o.Id == orgId)
            .Select(o => o.Slug)
            .FirstOrDefaultAsync();

        if (string.IsNullOrWhiteSpace(slug))
            return "ORG";

        var alnum = new string(slug.Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();
        return alnum.Length == 0 ? "ORG" : alnum[..Math.Min(4, alnum.Length)];
    }
}
