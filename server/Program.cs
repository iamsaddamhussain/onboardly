using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Hangfire;
using Hangfire.PostgreSql;
using Onboardly.Server.Authorization;
using Onboardly.Server.Data;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Models;
using Onboardly.Server.Repositories;
using Onboardly.Server.Services;
using Onboardly.Server.Services.Email;
using RazorLight;

// Load a local .env (if present) into environment variables before building
// configuration, so secrets can live in .env for local development.
DotEnv.Load();

var builder = WebApplication.CreateBuilder(args);

// --- Database (PostgreSQL via EF Core / Npgsql) ---
builder.Services.AddScoped<AuditInterceptor>();
builder.Services.AddDbContext<AppDbContext>((sp, options) =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
           .AddInterceptors(sp.GetRequiredService<AuditInterceptor>()));

// --- Password hashing & app services ---
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddScoped<IUserSessionService, UserSessionService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IRoleRepository, RoleRepository>();
builder.Services.AddScoped<IPermissionRepository, PermissionRepository>();
builder.Services.AddScoped<IDashboardRepository, DashboardRepository>();
builder.Services.AddScoped<IAuditRepository, AuditRepository>();
builder.Services.AddScoped<IOrganizationRepository, OrganizationRepository>();
builder.Services.AddScoped<IDepartmentRepository, DepartmentRepository>();
builder.Services.AddScoped<IJobTitleRepository, JobTitleRepository>();
builder.Services.AddScoped<IEmployeeRepository, EmployeeRepository>();
builder.Services.AddScoped<ICodeGenerator, CodeGenerator>();
builder.Services.AddScoped<IAttendanceRepository, AttendanceRepository>();
builder.Services.AddScoped<IAttendanceService, AttendanceService>();
builder.Services.AddScoped<ILeaveTypeRepository, LeaveTypeRepository>();
builder.Services.AddScoped<ILeavePolicyRepository, LeavePolicyRepository>();
builder.Services.AddScoped<ILeaveRequestRepository, LeaveRequestRepository>();
builder.Services.AddScoped<ILeaveBalanceRepository, LeaveBalanceRepository>();
builder.Services.AddScoped<IHolidayRepository, HolidayRepository>();
builder.Services.AddScoped<ILeaveService, LeaveService>();
builder.Services.AddScoped<IUserAccessService, UserAccessService>();
builder.Services.AddScoped<ITenantContext, TenantContext>();
builder.Services.AddMemoryCache();
builder.Services.AddHttpContextAccessor();

// --- Email notification framework ---
// Configurable delivery (Sync/Queue) + pluggable provider (Log/SMTP-Mailtrap),
// with Razor (.cshtml) templates rendered by RazorLight.
builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection(EmailOptions.SectionName));

// --- Attendance policy (office hours + auto-checkout sweep) ---
builder.Services.Configure<AttendanceOptions>(builder.Configuration.GetSection(AttendanceOptions.SectionName));

// Embedded Razor templates engine (templates live in Services/Email/Templates).
builder.Services.AddSingleton<IRazorLightEngine>(
    new RazorLightEngineBuilder()
        .UseEmbeddedResourcesProject(typeof(Onboardly.Server.Services.Email.Templates.EmailTemplatesRoot))
        .UseMemoryCachingProvider()
        .Build());

// Providers: register both and pick one from configuration (Email:Provider).
builder.Services.AddSingleton<LogEmailProvider>();
builder.Services.AddSingleton<SmtpEmailProvider>();
builder.Services.AddSingleton<IEmailProvider>(sp =>
{
    var mode = sp.GetRequiredService<IOptions<EmailOptions>>().Value.Provider;
    return mode.Equals("Smtp", StringComparison.OrdinalIgnoreCase)
        ? sp.GetRequiredService<SmtpEmailProvider>()
        : sp.GetRequiredService<LogEmailProvider>();
});

builder.Services.AddScoped<IEmailRenderer, RazorEmailRenderer>();
builder.Services.AddScoped<IEmailSender, EmailSender>();
builder.Services.AddScoped<IEmailService, EmailService>();

// --- Hangfire (durable background jobs for email delivery) ---
// PostgreSQL-backed storage shares the app database; Hangfire owns its own
// schema, dashboard, distributed locking and retries — replacing the custom
// polling processor. Retry behaviour is driven from Email:Queue configuration.
var emailQueueOptions = builder.Configuration
    .GetSection(EmailOptions.SectionName)
    .Get<EmailOptions>()?.Queue ?? new QueueOptions();

builder.Services.AddHangfire(config =>
{
    config
        .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
        .UseSimpleAssemblyNameTypeSerializer()
        .UseRecommendedSerializerSettings()
        .UsePostgreSqlStorage(o =>
            o.UseNpgsqlConnection(builder.Configuration.GetConnectionString("DefaultConnection")));
});
builder.Services.AddHangfireServer();
builder.Services.AddScoped<EmailDeliveryJob>();

// Replace Hangfire's default 10-attempt retry with the configured policy so a
// single AutomaticRetry filter (not two) governs email jobs.
foreach (var existing in GlobalJobFilters.Filters
             .Where(f => f.Instance is AutomaticRetryAttribute)
             .ToList())
{
    GlobalJobFilters.Filters.Remove(existing.Instance);
}
GlobalJobFilters.Filters.Add(new AutomaticRetryAttribute
{
    Attempts = emailQueueOptions.MaxAttempts,
    DelaysInSeconds = new[] { emailQueueOptions.RetryDelaySeconds },
});

// --- Cookie-based authentication (stateful sessions, HTTP-only cookie) ---
builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "onboardly.auth";
        options.Cookie.HttpOnly = true;                       // not readable by JS
        options.Cookie.SameSite = SameSiteMode.Lax;           // same-origin via Vite proxy
        options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest; // Secure in prod (https)
        options.ExpireTimeSpan = TimeSpan.FromDays(7);
        options.SlidingExpiration = true;

        // This is an API: return status codes instead of redirecting to HTML pages.
        options.Events.OnRedirectToLogin = ctx =>
        {
            ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = ctx =>
        {
            ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
builder.Services.AddScoped<IAuthorizationHandler, PermissionHandler>();
// Layer 3 resource-authorization handlers (tenant boundary + resource ownership).
builder.Services.AddScoped<IAuthorizationHandler, SameOrganizationHandler>();
builder.Services.AddScoped<IAuthorizationHandler, ResourceOwnerHandler>();
builder.Services.AddControllers(options =>
{
    // Enable route-model binding for IEntity parameters.
    options.ModelBinderProviders.Insert(0, new EntityModelBinderProvider());
});

// --- Razor Pages (server-side rendered public marketing website) ---
// Only the marketing pages (/, /features, /pricing, /contact) are rendered by
// Razor. The React SPA owns /login and every authenticated application route.
builder.Services.AddRazorPages();

// --- CORS for the Vite dev server (credentials required for cookies) ---
// Origins come from configuration ("Cors:DevOrigins") so the dev port lives in
// one place; falls back to the default Vite port if nothing is configured.
const string DevCorsPolicy = "DevClient";
var devOrigins = builder.Configuration.GetSection("Cors:DevOrigins").Get<string[]>()
    ?? new[] { "http://localhost:5174", "https://localhost:5174" };
builder.Services.AddCors(options =>
{
    options.AddPolicy(DevCorsPolicy, policy =>
        policy.WithOrigins(devOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

var app = builder.Build();

// Apply migrations and seed a demo user on startup.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await DbSeeder.SeedAsync(scope.ServiceProvider);
}

// Schedule the recurring missing-punch sweep: any day left open past its office
// close time is flagged MissingPunch for HR review (actual times are never
// auto-filled — see AttendanceService). Resolve the manager from DI (uses the
// configured storage) rather than the JobStorage.Current global, which isn't
// initialized until the Hangfire server starts.
var attendanceCron = builder.Configuration
    .GetSection(AttendanceOptions.SectionName)
    .Get<AttendanceOptions>()?.AutoCheckoutCron ?? "*/30 * * * *";
using (var scope = app.Services.CreateScope())
{
    var recurringJobs = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
    recurringJobs.AddOrUpdate<IAttendanceService>(
        "attendance-missing-punch-sweep",
        service => service.FlagMissingPunchesAsync(),
        attendanceCron);
}

if (app.Environment.IsDevelopment())
{
    app.UseCors(DevCorsPolicy);
}
else
{
    app.UseHttpsRedirection();
}

// Serve static assets (marketing stylesheet, images) from wwwroot.
app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
// Resolve the active tenant from cookie claims before authorization/endpoints.
app.UseMiddleware<TenantResolutionMiddleware>();
app.UseAuthorization();

// Hangfire monitoring dashboard. Dev-only: the default authorization filter
// blocks remote access, so it's not exposed in production without an explicit
// auth filter.
if (app.Environment.IsDevelopment())
{
    app.UseHangfireDashboard("/hangfire");
}

app.MapControllers();
// SSR marketing pages (Home / Features / Pricing / Contact).
app.MapRazorPages();

app.Run();
