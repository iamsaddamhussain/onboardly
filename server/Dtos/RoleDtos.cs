using System.ComponentModel.DataAnnotations;

namespace Onboardly.Server.Dtos;

public record CreateRoleRequest(
    [Required(ErrorMessage = "Role name is required.")]
    [MaxLength(100)]
    string Name);

public record CreatePermissionRequest(
    [Required(ErrorMessage = "Permission name is required.")]
    [MaxLength(100)]
    string Name);

public record SetPermissionsRequest(int[] PermissionIds);

public record SetRolesRequest(int[] RoleIds);

// Datatable/list row for the roles screen, including the permissions assigned
// to the role and how many users currently hold it.
public record RoleListItem(
    int Id,
    string Name,
    int[] PermissionIds,
    string[] Permissions,
    int UserCount);

// Lightweight option used by the permissions list and the roles screen picker.
public record PermissionListItem(int Id, string Name);
