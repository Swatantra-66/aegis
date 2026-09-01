const usersService = require('./users.service');
const apiResponse = require('../../utils/apiResponse');

/**
 * Users Controller — HTTP layer for user management.
 */

const listUsers = async (req, res) => {
  const { page, limit, search, is_active, mfa_enabled } = req.query;
  const { users, total } = await usersService.listUsers({
    page,
    limit,
    search,
    isActive: is_active,
    mfaEnabled: mfa_enabled,
  });

  return apiResponse.paginated(res, {
    data: users,
    page,
    limit,
    total,
    message: 'Users retrieved successfully',
  });
};

const getUserById = async (req, res) => {
  const user = await usersService.getUserById(req.params.id);

  return apiResponse.success(res, {
    message: 'User retrieved successfully',
    data: { user },
  });
};

const getMe = async (req, res) => {
  const user = await usersService.getUserById(req.user.id);

  return apiResponse.success(res, {
    message: 'Profile retrieved successfully',
    data: { user },
  });
};

const updateUser = async (req, res) => {
  const isSelf = req.user.id === req.params.id;
  const updateData = { ...req.body };

  // Regular users cannot modify their own active status
  if (isSelf && !req.user.permissions?.includes('user:update')) {
    delete updateData.is_active;
  }

  const user = await usersService.updateUser(req.params.id, updateData, {
    actorId: req.user.id,
    actorEmail: req.user.email,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  return apiResponse.success(res, {
    message: 'User updated successfully',
    data: { user },
  });
};

const deleteUser = async (req, res) => {
  await usersService.deleteUser(req.params.id, {
    actorId: req.user.id,
    actorEmail: req.user.email,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  return apiResponse.success(res, {
    message: 'User deactivated successfully',
  });
};

module.exports = {
  listUsers,
  getUserById,
  getMe,
  updateUser,
  deleteUser,
};
