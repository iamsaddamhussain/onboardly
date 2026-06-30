using Onboardly.Server.Dtos;
using Onboardly.Server.Models;

namespace Onboardly.Server.Repositories;

// Data-access contract for roles — one method per controller verb so the
// controller stays thin and just delegates (GetAll / Create / SetPermissions /
// Delete).
public interface IRoleRepository
{
    Task<IReadOnlyList<RoleListItem>> GetAll();

    Task<Role?> GetById(int id);

    Task<Role?> GetByIdWithPermissions(int id);

    Task<Role> Create(CreateRoleRequest request);

    Task SetPermissions(Role role, int[] permissionIds);

    Task Delete(Role role);

    // Used by the controller's validation to keep role names unique.
    Task<bool> NameExistsAsync(string name);
}
