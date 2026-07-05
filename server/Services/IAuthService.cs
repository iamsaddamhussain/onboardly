using Onboardly.Server.Dtos;
using Onboardly.Server.Models;

namespace Onboardly.Server.Services;

public interface IAuthService
{
    Task<User?> ValidateCredentialsAsync(string email, string password);
    Task<User?> GetByIdAsync(int id);
    Task UpdateProfileAsync(User user, UpdateProfileRequest request);
    Task UpdateLanguageAsync(User user, string language);
}
