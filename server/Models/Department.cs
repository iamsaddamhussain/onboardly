namespace Onboardly.Server.Models;

// An organizational unit within a tenant. Departments form a hierarchy via an
// optional parent and may be led by an employee. Tenant-owned (IOrgOwned) and
// soft-deletable so removals keep historical integrity for future HR features.
public class Department : IEntity, IOrgOwned, ISoftDeletable
{
    public int Id { get; set; }
    public int OrganizationId { get; set; }

    public string Name { get; set; } = string.Empty;
    // Short, tenant-unique identifier (e.g. "ENG", "HR").
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }

    // Optional parent for a department hierarchy.
    public int? ParentDepartmentId { get; set; }
    public Department? ParentDepartment { get; set; }
    public ICollection<Department> ChildDepartments { get; set; } = new List<Department>();

    // Optional department lead (an employee in the same tenant).
    public int? ManagerEmployeeId { get; set; }
    public Employee? Manager { get; set; }

    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
