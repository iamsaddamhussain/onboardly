namespace Onboardly.Server.Authorization;

// Central catalogue of well-known role and permission names so they're never
// hardcoded as loose strings across the codebase. Access is permission-driven;
// roles are just bundles of permissions.
public static class Permissions
{
    // --- Organization-scoped permissions (bound to a tenant) ---
    public const string ViewDashboard = "view_dashboard";
    public const string ManageUsers = "manage_users";
    public const string ManageRoles = "manage_roles";
    public const string ManagePermissions = "manage_permissions";
    public const string ImpersonateUsers = "impersonate_users";
    public const string ViewAudit = "view_audit";

    // --- Human Resources (organization-scoped) ---
    public const string ViewEmployees = "employees.view";
    public const string CreateEmployees = "employees.create";
    public const string EditEmployees = "employees.edit";
    public const string DeleteEmployees = "employees.delete";

    public const string ViewDepartments = "departments.view";
    public const string CreateDepartments = "departments.create";
    public const string EditDepartments = "departments.edit";
    public const string DeleteDepartments = "departments.delete";

    public const string ViewJobTitles = "jobtitles.view";
    public const string CreateJobTitles = "jobtitles.create";
    public const string EditJobTitles = "jobtitles.edit";
    public const string DeleteJobTitles = "jobtitles.delete";

    // --- Global (platform-level) permissions, not bound to any tenant ---
    public const string PlatformManageOrganizations = "platform.manage_organizations";
    public const string PlatformManageSubscriptions = "platform.manage_subscriptions";
    public const string PlatformSwitchOrganization = "platform.switch_organization";
    public const string PlatformImpersonate = "platform.impersonate";
    public const string PlatformViewAllAudits = "platform.view_all_audits";

    // Organization-scoped permissions (IsGlobal = false).
    public static readonly string[] Organization =
    {
        ViewDashboard,
        ManageUsers,
        ManageRoles,
        ManagePermissions,
        ImpersonateUsers,
        ViewAudit,
        ViewEmployees,
        CreateEmployees,
        EditEmployees,
        DeleteEmployees,
        ViewDepartments,
        CreateDepartments,
        EditDepartments,
        DeleteDepartments,
        ViewJobTitles,
        CreateJobTitles,
        EditJobTitles,
        DeleteJobTitles,
    };

    // Global/platform permissions (IsGlobal = true).
    public static readonly string[] Global =
    {
        PlatformManageOrganizations,
        PlatformManageSubscriptions,
        PlatformSwitchOrganization,
        PlatformImpersonate,
        PlatformViewAllAudits,
    };

    // Every known permission, org + global.
    public static readonly string[] All = Organization.Concat(Global).ToArray();
}

public static class Roles
{
    public const string SuperAdmin = "super_admin";
    public const string Admin = "admin";
    public const string User = "user";

    // Global platform administrator (RoleScope.Global).
    public const string PlatformAdmin = "platform_admin";

    // Built-in roles that grant broad/critical access and must never be edited
    // or deleted from the app (the seeder keeps their permissions in sync).
    public static readonly HashSet<string> System = new(StringComparer.Ordinal)
    {
        SuperAdmin,
        Admin,
        PlatformAdmin,
    };
}
