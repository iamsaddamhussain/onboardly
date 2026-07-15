using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Authorization;
using Onboardly.Server.Models;

namespace Onboardly.Server.Data;

/// <summary>Seeds a demo account and a few sample users for first-run convenience.</summary>
public static class DbSeeder
{
    private const string DemoEmail = "demo@onboardly.dev";
    private const string DefaultOrgSlug = "onboardly";

    public static async Task SeedAsync(IServiceProvider services)
    {
        var db = services.GetRequiredService<AppDbContext>();
        var hasher = services.GetRequiredService<IPasswordHasher<User>>();

        var defaultOrg = await SeedDefaultOrganizationAsync(db);
        await SeedRolesAndPermissionsAsync(db);
        await SeedDefaultOrgRoleAsync(db, defaultOrg);

        // Seed the standard leave catalogue for every tenant, not just the
        // default org, so any organization gets leave types + a default policy.
        foreach (var org in await db.Organizations.ToListAsync())
            await SeedLeaveDefaultsAsync(db, org);

        var superAdmin = await db.Roles.FirstAsync(r => r.Name == Authorization.Roles.SuperAdmin);
        var platformAdmin = await db.Roles.FirstAsync(r => r.Name == Authorization.Roles.PlatformAdmin);

        // Ensure the demo account is a global platform admin (super admin for org
        // access + platform admin for global capabilities) even on a seeded DB.
        var existingDemo = await db.Users
            .Include(u => u.Roles)
            .FirstOrDefaultAsync(u => u.Email == DemoEmail);
        if (existingDemo is not null)
        {
            if (existingDemo.Roles.All(r => r.Name != Authorization.Roles.SuperAdmin))
                existingDemo.Roles.Add(superAdmin);
            if (existingDemo.Roles.All(r => r.Name != Authorization.Roles.PlatformAdmin))
                existingDemo.Roles.Add(platformAdmin);
            // Platform users are not tied to a tenant.
            existingDemo.OrganizationId = null;
            await db.SaveChangesAsync();
        }

        // Backfill: attach any pre-existing tenant users to the default org.
        var orphans = await db.Users
            .Where(u => u.OrganizationId == null && u.Email != DemoEmail)
            .ToListAsync();
        if (orphans.Count > 0)
        {
            foreach (var u in orphans)
                u.OrganizationId = defaultOrg.Id;
            await db.SaveChangesAsync();
        }

        if (await db.Users.AnyAsync())
            return;

        var demo = new User
        {
            FirstName = "Demo",
            LastName = "User",
            Email = DemoEmail,
            JobTitle = "Administrator",
            City = "Auckland",
            Mobile = "+64 21 000 0000",
            IsActive = true,
            // Global platform admin: not tied to any organization.
            OrganizationId = null,
            Roles = { superAdmin, platformAdmin },
        };
        demo.PasswordHash = hasher.HashPassword(demo, "Password123!");

        var samples = new[]
        {
            new User { FirstName = "Sarah", LastName = "Chen", Email = "sarah.chen@onboardly.dev", JobTitle = "Lab Technician", City = "Wellington", Mobile = "+64 21 111 1111", IsActive = true, OrganizationId = defaultOrg.Id },
            new User { FirstName = "James", LastName = "Patel", Email = "james.patel@onboardly.dev", JobTitle = "Project Manager", City = "Christchurch", Mobile = "+64 21 222 2222", IsActive = true, OrganizationId = defaultOrg.Id },
            new User { FirstName = "Olivia", LastName = "Murphy", Email = "olivia.murphy@onboardly.dev", JobTitle = "Engineer", City = "Hamilton", Mobile = "+64 21 333 3333", IsActive = false, OrganizationId = defaultOrg.Id },
        };
        foreach (var s in samples)
            s.PasswordHash = hasher.HashPassword(s, "Password123!");

        db.Users.Add(demo);
        db.Users.AddRange(samples);
        await db.SaveChangesAsync();
    }

    // Ensures the single default tenant exists so the app keeps working as a
    // single-company deployment during migration to multi-tenant.
    private static async Task<Organization> SeedDefaultOrganizationAsync(AppDbContext db)
    {
        var org = await db.Organizations.FirstOrDefaultAsync(o => o.Slug == DefaultOrgSlug);
        if (org is null)
        {
            org = new Organization
            {
                Name = "Onboardly",
                Slug = DefaultOrgSlug,
                IsActive = true,
                SubscriptionTier = "internal",
            };
            db.Organizations.Add(org);
            await db.SaveChangesAsync();
        }
        return org;
    }

    // Ensures the permission catalogue, the org-scoped super-admin role and the
    // global platform-admin role exist. Safe to run on every startup.
    private static async Task SeedRolesAndPermissionsAsync(AppDbContext db)
    {
        var globalNames = Permissions.Global.ToHashSet();
        var permissions = await db.Permissions.ToListAsync();
        foreach (var name in Permissions.All)
        {
            var existing = permissions.FirstOrDefault(p => p.Name == name);
            if (existing is null)
            {
                var permission = new Permission { Name = name, IsGlobal = globalNames.Contains(name) };
                db.Permissions.Add(permission);
                permissions.Add(permission);
            }
            else
            {
                // Keep the global flag in sync with the catalogue.
                existing.IsGlobal = globalNames.Contains(name);
            }
        }
        await db.SaveChangesAsync();

        // Prune permissions that are no longer in the catalogue so removed ones
        // disappear from the Roles UI (EF cascades the role_permission links).
        var catalogue = Permissions.All.ToHashSet();
        var stale = permissions.Where(p => !catalogue.Contains(p.Name)).ToList();
        if (stale.Count > 0)
        {
            db.Permissions.RemoveRange(stale);
            permissions.RemoveAll(stale.Contains);
            await db.SaveChangesAsync();
        }

        // Org-scoped super admin: holds every organization permission.
        await EnsureRoleWithPermissionsAsync(
            db, Authorization.Roles.SuperAdmin, RoleScope.Organization,
            permissions.Where(p => !p.IsGlobal));

        // Global platform admin: holds every platform permission.
        await EnsureRoleWithPermissionsAsync(
            db, Authorization.Roles.PlatformAdmin, RoleScope.Global,
            permissions.Where(p => p.IsGlobal));
    }

    // Gives the default tenant a starter organization-scoped admin role so that
    // switching into it shows a manageable role out of the box.
    private static async Task SeedDefaultOrgRoleAsync(AppDbContext db, Organization org)
    {
        var role = await db.Roles
            .Include(r => r.Permissions)
            .FirstOrDefaultAsync(r => r.Name == "org_admin" && r.OrganizationId == org.Id);

        if (role is null)
        {
            role = new Role { Name = "org_admin", Scope = RoleScope.Organization, OrganizationId = org.Id };
            db.Roles.Add(role);
        }

        var orgPermissions = await db.Permissions.Where(p => !p.IsGlobal).ToListAsync();
        foreach (var permission in orgPermissions)
        {
            if (role.Permissions.All(p => p.Name != permission.Name))
                role.Permissions.Add(permission);
        }

        await db.SaveChangesAsync();
    }

    private static async Task EnsureRoleWithPermissionsAsync(
        AppDbContext db, string name, RoleScope scope, IEnumerable<Permission> grants)
    {
        var role = await db.Roles
            .Include(r => r.Permissions)
            .FirstOrDefaultAsync(r => r.Name == name && r.OrganizationId == null);

        if (role is null)
        {
            role = new Role { Name = name, Scope = scope };
            db.Roles.Add(role);
        }
        else
        {
            role.Scope = scope;
        }

        foreach (var permission in grants)
        {
            if (role.Permissions.All(p => p.Name != permission.Name))
                role.Permissions.Add(permission);
        }

        await db.SaveChangesAsync();
    }

    // Seeds a standard catalogue of leave types and a "Default Policy" bundling
    // them with sensible annual entitlements, for the given tenant. Idempotent:
    // existing types (matched by code) and an existing default policy are left
    // untouched, so it is safe to run on every startup.
    private static async Task SeedLeaveDefaultsAsync(AppDbContext db, Organization org)
    {
        // (Code suffix, Name, Color, Paid, RequiresApproval, HalfDay, Gender,
        //  AnnualEntitlement) — code becomes "{PREFIX}-LVT-{suffix}".
        var specs = new (string Code, string Name, string Color, bool Paid, bool Approval, bool HalfDay, GenderRestriction Gender, decimal Entitlement)[]
        {
            ("001", "Annual Leave",      "#2563eb", true,  true,  true,  GenderRestriction.Any,    12),
            ("002", "Casual Leave",      "#0891b2", true,  true,  true,  GenderRestriction.Any,     6),
            ("003", "Sick Leave",        "#dc2626", true,  true,  true,  GenderRestriction.Any,     8),
            ("004", "Maternity Leave",   "#db2777", true,  true,  false, GenderRestriction.Female, 90),
            ("005", "Paternity Leave",   "#7c3aed", true,  true,  false, GenderRestriction.Male,    5),
            ("006", "Bereavement Leave", "#4b5563", true,  true,  false, GenderRestriction.Any,     3),
            ("007", "Marriage Leave",    "#ea580c", true,  true,  false, GenderRestriction.Any,     3),
            ("008", "Comp Off",          "#16a34a", true,  true,  true,  GenderRestriction.Any,     0),
            ("009", "Work From Home",    "#0d9488", false, true,  true,  GenderRestriction.Any,     0),
            ("010", "Leave Without Pay", "#6b7280", false, true,  true,  GenderRestriction.Any,     0),
        };

        var prefix = CompanyPrefix(org.Slug);

        // Upsert leave types (matched by tenant-unique code).
        var typesByCode = new Dictionary<string, LeaveType>();
        foreach (var spec in specs)
        {
            var code = $"{prefix}-LVT-{spec.Code}";
            var type = await db.LeaveTypes
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.OrganizationId == org.Id && t.Code == code);

            if (type is null)
            {
                type = new LeaveType
                {
                    OrganizationId = org.Id,
                    Code = code,
                    Name = spec.Name,
                    Color = spec.Color,
                    IsPaid = spec.Paid,
                    CountsTowardPayroll = !spec.Paid,
                    RequiresApproval = spec.Approval,
                    AllowHalfDay = spec.HalfDay,
                    GenderRestriction = spec.Gender,
                    CanAttachDocument = spec.Name == "Sick Leave",
                    DocumentRequiredAfterDays = spec.Name == "Sick Leave" ? 2 : null,
                    MinDurationDays = 1,
                    IsActive = true,
                };
                db.LeaveTypes.Add(type);
            }

            typesByCode[spec.Code] = type;
        }

        await db.SaveChangesAsync();

        // Create the default policy once, bundling the seeded types with their
        // entitlements. Skipped entirely if the tenant already has any policy.
        var hasPolicy = await db.LeavePolicies
            .IgnoreQueryFilters()
            .AnyAsync(p => p.OrganizationId == org.Id);

        if (!hasPolicy)
        {
            var policy = new LeavePolicy
            {
                OrganizationId = org.Id,
                Code = $"{prefix}-LVP-001",
                Name = "Default Policy",
                Description = "Standard leave entitlements applied to employees by default.",
                IsDefault = true,
                IsActive = true,
            };

            foreach (var spec in specs)
            {
                policy.LeaveTypes.Add(new LeavePolicyLeaveType
                {
                    OrganizationId = org.Id,
                    LeaveType = typesByCode[spec.Code],
                    AnnualEntitlementDays = spec.Entitlement,
                    AccrualMethod = AccrualMethod.Immediate,
                });
            }

            db.LeavePolicies.Add(policy);
            await db.SaveChangesAsync();
        }
    }

    // Short, uppercase alphanumeric prefix from a tenant slug (mirrors
    // CodeGenerator so seeded codes look consistent). Falls back to "ORG".
    private static string CompanyPrefix(string? slug)
    {
        if (string.IsNullOrWhiteSpace(slug))
            return "ORG";
        var alnum = new string(slug.Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();
        return alnum.Length == 0 ? "ORG" : alnum[..Math.Min(4, alnum.Length)];
    }
}
