const rolesService = require('./roles.service');
const apiResponse = require('../../utils/apiResponse');

const createRole = async (req, res) => {
  const role = await rolesService.createRole(req.body, {
    actorId: req.user.id,
    actorEmail: req.user.email,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  return apiResponse.created(res, { message: 'Role created', data: { role } });
};

const listRoles = async (req, res) => {
  const roles = await rolesService.listRoles();
  return apiResponse.success(res, { message: 'Roles retrieved', data: { roles } });
};

const getRoleById = async (req, res) => {
  const role = await rolesService.getRoleById(req.params.id);
  return apiResponse.success(res, { message: 'Role retrieved', data: { role } });
};

const updateRole = async (req, res) => {
  const role = await rolesService.updateRole(req.params.id, req.body, {
    actorId: req.user.id,
    actorEmail: req.user.email,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  return apiResponse.success(res, { message: 'Role updated', data: { role } });
};

const deleteRole = async (req, res) => {
  await rolesService.deleteRole(req.params.id, {
    actorId: req.user.id,
    actorEmail: req.user.email,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  return apiResponse.success(res, { message: 'Role deleted' });
};

const assignPermissions = async (req, res) => {
  const role = await rolesService.assignPermissions(req.params.id, req.body.permission_ids, {
    actorId: req.user.id,
    actorEmail: req.user.email,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  return apiResponse.success(res, { message: 'Permissions assigned', data: { role } });
};

const removePermissions = async (req, res) => {
  const role = await rolesService.removePermissions(req.params.id, req.body.permission_ids, {
    actorId: req.user.id,
    actorEmail: req.user.email,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  return apiResponse.success(res, { message: 'Permissions removed', data: { role } });
};

const assignRoleToUser = async (req, res) => {
  await rolesService.assignRoleToUser(req.params.userId, req.body.role_id, {
    actorId: req.user.id,
    actorEmail: req.user.email,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  return apiResponse.success(res, { message: 'Role assigned to user' });
};

const removeRoleFromUser = async (req, res) => {
  await rolesService.removeRoleFromUser(req.params.userId, req.params.roleId, {
    actorId: req.user.id,
    actorEmail: req.user.email,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  return apiResponse.success(res, { message: 'Role removed from user' });
};

const listPermissions = async (req, res) => {
  const permissions = await rolesService.listPermissions();
  return apiResponse.success(res, { message: 'Permissions retrieved', data: { permissions } });
};

module.exports = {
  createRole,
  listRoles,
  getRoleById,
  updateRole,
  deleteRole,
  assignPermissions,
  removePermissions,
  assignRoleToUser,
  removeRoleFromUser,
  listPermissions,
};
