using Microsoft.EntityFrameworkCore;
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
        modelBuilder.Entity<T>().HasQueryFilter(
            e => _tenant.IgnoreTenantBoundary || e.OrganizationId == _tenant.OrganizationId);
    }
}
