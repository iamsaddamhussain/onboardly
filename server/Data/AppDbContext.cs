using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using System.Reflection;
using Onboardly.Server.Authorization;
using Onboardly.Server.Models;

namespace Onboardly.Server.Data;

public class AppDbContext : DbContext
{
    private readonly ITenantContext _tenant;

    public AppDbContext(DbContextOptions<AppDbContext> options, ITenantContext tenant)
        : base(options) => _tenant = tenant;

    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    // --- Human Resources module ---
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<JobTitle> JobTitles => Set<JobTitle>();
    public DbSet<Employee> Employees => Set<Employee>();

    public override int SaveChanges()
    {
        StampTimestamps();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        StampTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    // Set UpdatedAt whenever an existing user is modified.
    private void StampTimestamps()
    {
        foreach (var entry in ChangeTracker.Entries<User>())
        {
            if (entry.State == EntityState.Modified)
                entry.Entity.UpdatedAt = DateTime.UtcNow;
        }

        // Keep HR aggregates' UpdatedAt fresh on every modification.
        StampUpdatedAt<Department>(e => e.UpdatedAt = DateTime.UtcNow);
        StampUpdatedAt<JobTitle>(e => e.UpdatedAt = DateTime.UtcNow);
        StampUpdatedAt<Employee>(e => e.UpdatedAt = DateTime.UtcNow);

        // Stamp the active tenant onto new tenant-owned rows so callers never
        // have to set OrganizationId by hand (defense against cross-tenant writes).
        if (_tenant.OrganizationId is int orgId)
        {
            foreach (var entry in ChangeTracker.Entries<IOrgOwned>())
            {
                if (entry.State == EntityState.Added && entry.Entity.OrganizationId == 0)
                    entry.Entity.OrganizationId = orgId;
            }
        }
    }

    // Applies an UpdatedAt stamp to every modified entity of the given type.
    private void StampUpdatedAt<T>(Action<T> stamp) where T : class
    {
        foreach (var entry in ChangeTracker.Entries<T>())
        {
            if (entry.State == EntityState.Modified)
                stamp(entry.Entity);
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.Email).IsRequired().HasMaxLength(256);
            entity.Property(u => u.PasswordHash).IsRequired();
            entity.Property(u => u.FirstName).HasMaxLength(100);
            entity.Property(u => u.LastName).HasMaxLength(100);
            entity.Property(u => u.Mobile).HasMaxLength(40);
            entity.Property(u => u.City).HasMaxLength(120);
            entity.Property(u => u.JobTitle).HasMaxLength(120);
            entity.Property(u => u.Language).IsRequired().HasMaxLength(5).HasDefaultValue("en");

            // Many-to-many: users <-> roles via the role_user pivot table.
            entity.HasMany(u => u.Roles)
                .WithMany(r => r.Users)
                .UsingEntity(j => j.ToTable("role_user"));

            // Tenant membership. Null => platform/global user. Restrict delete so
            // an organization can't be removed while it still has members.
            entity.HasOne(u => u.Organization)
                .WithMany(o => o.Users)
                .HasForeignKey(u => u.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Role>(entity =>
        {
            // Role names are unique per tenant (global roles share the null slot).
            entity.HasIndex(r => new { r.Name, r.OrganizationId }).IsUnique();
            entity.Property(r => r.Name).IsRequired().HasMaxLength(100);
            entity.Property(r => r.Scope).HasConversion<string>().HasMaxLength(20);

            // Many-to-many: roles <-> permissions via the role_permission pivot.
            entity.HasMany(r => r.Permissions)
                .WithMany(p => p.Roles)
                .UsingEntity(j => j.ToTable("role_permission"));
        });

        modelBuilder.Entity<Permission>(entity =>
        {
            entity.HasIndex(p => p.Name).IsUnique();
            entity.Property(p => p.Name).IsRequired().HasMaxLength(100);
        });

        modelBuilder.Entity<Organization>(entity =>
        {
            entity.HasIndex(o => o.Slug).IsUnique();
            entity.Property(o => o.Name).IsRequired().HasMaxLength(200);
            entity.Property(o => o.Slug).IsRequired().HasMaxLength(100);
            entity.Property(o => o.SubscriptionTier).HasMaxLength(50);
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.Property(a => a.Action).IsRequired().HasMaxLength(60);
            entity.Property(a => a.EntityType).IsRequired().HasMaxLength(120);
            entity.Property(a => a.EntityId).IsRequired().HasMaxLength(120);
            entity.Property(a => a.IpAddress).HasMaxLength(64);
            // Index the common audit query paths (per-tenant, newest first).
            entity.HasIndex(a => new { a.OrganizationId, a.Timestamp });
            entity.HasIndex(a => new { a.EntityType, a.EntityId });
        });

        ConfigureHr(modelBuilder);

        // Auto-apply the tenant boundary filter to every tenant-owned entity so
        // reads can never leak across organizations by accident.
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(IOrgOwned).IsAssignableFrom(entityType.ClrType))
            {
                typeof(AppDbContext)
                    .GetMethod(nameof(ApplyTenantFilter), BindingFlags.NonPublic | BindingFlags.Instance)!
                    .MakeGenericMethod(entityType.ClrType)
                    .Invoke(this, new object[] { modelBuilder });
            }
        }
    }

    // Global query filter: a global user with no active org sees everything;
    // everyone else is restricted to their active organization.
    private void ApplyTenantFilter<T>(ModelBuilder modelBuilder) where T : class, IOrgOwned
    {
        Expression<Func<T, bool>> filter =
            e => _tenant.IgnoreTenantBoundary || e.OrganizationId == _tenant.OrganizationId;

        // Soft-deletable tenant entities additionally exclude deleted rows from
        // every read. Compose `!IsDeleted` onto the tenant predicate reusing the
        // same parameter so EF can translate the combined filter.
        if (typeof(ISoftDeletable).IsAssignableFrom(typeof(T)))
        {
            var parameter = filter.Parameters[0];
            var notDeleted = Expression.Equal(
                Expression.Property(parameter, nameof(ISoftDeletable.IsDeleted)),
                Expression.Constant(false));
            var body = Expression.AndAlso(filter.Body, notDeleted);
            filter = Expression.Lambda<Func<T, bool>>(body, parameter);
        }

        modelBuilder.Entity<T>().HasQueryFilter(filter);
    }

    // Relational mapping for the Human Resources aggregates: tenant-unique codes,
    // sensible string lengths, enum-as-string storage, and Restrict deletes so a
    // referenced department/job-title/manager can't be orphaned. Cross-tenant
    // isolation and soft-delete filtering are applied generically above.
    private static void ConfigureHr(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Department>(entity =>
        {
            entity.Property(d => d.Name).IsRequired().HasMaxLength(150);
            entity.Property(d => d.Code).IsRequired().HasMaxLength(40);
            entity.Property(d => d.Description).HasMaxLength(1000);
            // Code is unique per tenant among live rows.
            entity.HasIndex(d => new { d.OrganizationId, d.Code }).IsUnique();

            entity.HasOne(d => d.ParentDepartment)
                .WithMany(d => d.ChildDepartments)
                .HasForeignKey(d => d.ParentDepartmentId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.Manager)
                .WithMany()
                .HasForeignKey(d => d.ManagerEmployeeId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<JobTitle>(entity =>
        {
            entity.Property(j => j.Name).IsRequired().HasMaxLength(150);
            entity.Property(j => j.Code).IsRequired().HasMaxLength(40);
            entity.Property(j => j.Description).HasMaxLength(1000);
            entity.HasIndex(j => new { j.OrganizationId, j.Code }).IsUnique();
        });

        modelBuilder.Entity<Employee>(entity =>
        {
            entity.Property(e => e.EmployeeNumber).IsRequired().HasMaxLength(40);
            entity.Property(e => e.WorkEmail).HasMaxLength(256);
            entity.Property(e => e.WorkPhone).HasMaxLength(40);
            entity.Property(e => e.Notes).HasMaxLength(2000);
            entity.Property(e => e.EmploymentStatus).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.EmploymentType).HasConversion<string>().HasMaxLength(20);

            entity.HasIndex(e => new { e.OrganizationId, e.EmployeeNumber }).IsUnique();
            // One employee record per linked user account.
            entity.HasIndex(e => e.UserId).IsUnique();

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Department)
                .WithMany()
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.JobTitle)
                .WithMany()
                .HasForeignKey(e => e.JobTitleId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ReportingManager)
                .WithMany(e => e.DirectReports)
                .HasForeignKey(e => e.ReportingManagerId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
