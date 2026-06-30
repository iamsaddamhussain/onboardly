using Onboardly.Server.Dtos;
using Onboardly.Server.Models;

namespace Onboardly.Server.Repositories;

// Data-access contract for permissions — one method per controller verb so the
// controller stays thin and just delegates (GetAll / Create).
public interface IPermissionRepository
{
    Task<IReadOnlyList<PermissionListItem>> GetAll();

    Task<Permission> Create(CreatePermissionRequest request);

    // Used by the controller's validation to keep permission names unique.
    Task<bool> NameExistsAsync(string name);
}
