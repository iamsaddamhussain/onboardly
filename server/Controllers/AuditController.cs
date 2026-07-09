using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Onboardly.Server.Authorization;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Repositories;

namespace Onboardly.Server.Controllers;

// Audit log query surface. Visibility follows the three-layer model and the
// active organization:
//   * platform.view_all_audits + no active org -> every organization's logs
//   * switched into an org (or an org user)     -> that organization only
[ApiController]
[Authorize]
[Route("api/audit")]
public class AuditController : ApiControllerBase
{
    private readonly IAuditRepository _audit;

    public AuditController(IAuditRepository audit) => _audit = audit;

    [HttpGet]
    [RequirePermission(Permissions.PlatformViewAllAudits, Permissions.ViewAudit)]
    public async Task<IActionResult> GetAll([FromQuery] DataTableRequest request) =>
        Ok(await _audit.GetAll(request, Can(Permissions.PlatformViewAllAudits)));
}
