using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Models;

namespace Onboardly.Server.Data;

/// <summary>Seeds a demo account and a few sample users for first-run convenience.</summary>
public static class DbSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        var db = services.GetRequiredService<AppDbContext>();
        var hasher = services.GetRequiredService<IPasswordHasher<User>>();

        if (await db.Users.AnyAsync())
            return;

        var demo = new User
        {
            FirstName = "Demo",
            LastName = "User",
            Email = "demo@onboardly.dev",
            JobTitle = "Administrator",
            City = "Auckland",
            Mobile = "+64 21 000 0000",
            IsActive = true,
        };
        demo.PasswordHash = hasher.HashPassword(demo, "Password123!");

        var samples = new[]
        {
            new User { FirstName = "Sarah", LastName = "Chen", Email = "sarah.chen@onboardly.dev", JobTitle = "Lab Technician", City = "Wellington", Mobile = "+64 21 111 1111", IsActive = true },
            new User { FirstName = "James", LastName = "Patel", Email = "james.patel@onboardly.dev", JobTitle = "Project Manager", City = "Christchurch", Mobile = "+64 21 222 2222", IsActive = true },
            new User { FirstName = "Olivia", LastName = "Murphy", Email = "olivia.murphy@onboardly.dev", JobTitle = "Engineer", City = "Hamilton", Mobile = "+64 21 333 3333", IsActive = false },
        };
        foreach (var s in samples)
            s.PasswordHash = hasher.HashPassword(s, "Password123!");

        db.Users.Add(demo);
        db.Users.AddRange(samples);
        await db.SaveChangesAsync();
    }
}
