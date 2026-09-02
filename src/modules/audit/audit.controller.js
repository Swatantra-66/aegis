const auditService = require('./audit.service');
const apiResponse = require('../../utils/apiResponse');

const getAuditLogs = async (req, res) => {
  const { actor_id, action, resource_type, resource_id, start_date, end_date, page, limit } =
    req.query;

  const userPermissions = req.user?.permissions || [];
  const canReadAllAudit = userPermissions.includes('audit:read');

  // If user doesn't have global audit:read, restrict query to their own actor ID
  const effectiveActorId = canReadAllAudit ? actor_id : req.user.id;

  const { logs, total } = await auditService.getAuditTrail({
    actorId: effectiveActorId,
    action,
    resourceType: resource_type,
    resourceId: resource_id,
    startDate: start_date,
    endDate: end_date,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
  });

  return apiResponse.paginated(res, {
    data: logs,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    total,
    message: 'Audit logs retrieved',
  });
};

const verifyIntegrity = async (req, res) => {
  const { start_date, end_date } = req.query;

  const result = await auditService.verifyIntegrity({
    startDate: start_date,
    endDate: end_date,
  });

  return apiResponse.success(res, {
    message: result.valid ? 'Audit log integrity verified' : 'Audit log integrity COMPROMISED',
    data: result,
  });
};

module.exports = {
  getAuditLogs,
  verifyIntegrity,
};
