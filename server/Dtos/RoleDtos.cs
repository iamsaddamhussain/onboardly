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
