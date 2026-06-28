using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Models;

namespace Onboardly.Server.Repositories;

// Data-access contract for users — one method per controller verb so the
// controller stays thin and just delegates (GetAll / GetById / Create / Update).
public interface IUserRepository
{
    Task<PagedResult<UserListItem>> GetAll(DataTableRequest request);

    Task<User?> GetById(int id);

    Task<User> Create(SaveUserRequest request);

    Task Update(User user, SaveUserRequest request);

    // Used by the controller's validation to keep emails unique.
    Task<bool> EmailExistsAsync(string email, int? excludeId = null);
}
