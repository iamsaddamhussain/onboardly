namespace Onboardly.Server.Authorization;

// Central catalogue of well-known role and permission names so they're never
// hardcoded as loose strings across the codebase. Access is permission-driven;
// roles are just bundles of permissions.
public static class Permissions
{
    public const string ViewDashboard = "view_dashboard";
    public const string ManageUsers = "manage_users";
    public const string ManageRoles = "manage_roles";
    public const string ManagePermissions = "manage_permissions";

    public static readonly string[] All =
    {
        ViewDashboard,
        ManageUsers,
        ManageRoles,
        ManagePermissions,
    };
}

public static class Roles
{
    public const string SuperAdmin = "super_admin";
    public const string Admin = "admin";
    public const string User = "user";
}
