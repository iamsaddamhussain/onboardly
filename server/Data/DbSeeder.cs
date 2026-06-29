using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Authorization;
using Onboardly.Server.Models;

namespace Onboardly.Server.Data;

/// <summary>Seeds a demo account and a few sample users for first-run convenience.</summary>
public static class DbSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        var db = services.GetRequiredService<AppDbContext>();
        var hasher = services.GetRequiredService<IPasswordHasher<User>>();

        await SeedRolesAndPermissionsAsync(db);

        // Ensure the demo account is super admin even on an already-seeded DB.
        var superAdmin = await db.Roles.FirstAsync(r => r.Name == Authorization.Roles.SuperAdmin);
        var existingDemo = await db.Users
            .Include(u => u.Roles)
            .FirstOrDefaultAsync(u => u.Email == "demo@onboardly.dev");
        if (existingDemo is not null && existingDemo.Roles.All(r => r.Name != Authorization.Roles.SuperAdmin))
        {
            existingDemo.Roles.Add(superAdmin);
            await db.SaveChangesAsync();
        }

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
            // Only this account gets super-admin access for now.
            Roles = { superAdmin },
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

    // Ensures the permission catalogue and the super-admin role (with every
    // permission attached) exist. Safe to run on every startup.
    private static async Task SeedRolesAndPermissionsAsync(AppDbContext db)
    {
        var permissions = await db.Permissions.ToListAsync();
        foreach (var name in Permissions.All)
        {
            if (permissions.All(p => p.Name != name))
            {
                var permission = new Permission { Name = name };
                db.Permissions.Add(permission);
                permissions.Add(permission);
            }
        }

        var superAdmin = await db.Roles
            .Include(r => r.Permissions)
            .FirstOrDefaultAsync(r => r.Name == Authorization.Roles.SuperAdmin);

        if (superAdmin is null)
        {
            superAdmin = new Role { Name = Authorization.Roles.SuperAdmin };
            db.Roles.Add(superAdmin);
        }

        // Attach all permissions to super admin.
        foreach (var permission in permissions)
        {
            if (superAdmin.Permissions.All(p => p.Name != permission.Name))
                superAdmin.Permissions.Add(permission);
        }

        await db.SaveChangesAsync();
    }
}
