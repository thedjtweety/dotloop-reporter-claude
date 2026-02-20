/**
 * Role-Based Access Control (RBAC) Permissions System
 * 
 * Defines permissions for each user role and provides helper functions
 * to check if a user has permission to perform specific actions.
 */

export type UserRole = 'admin' | 'broker' | 'agent' | 'viewer';

export type Permission =
  | 'view_own_data'
  | 'view_team_data'
  | 'view_all_data'
  | 'view_own_commission'
  | 'view_team_commission'
  | 'view_all_commission'
  | 'upload_data'
  | 'delete_own_uploads'
  | 'delete_team_uploads'
  | 'delete_all_uploads'
  | 'manage_users'
  | 'manage_roles'
  | 'manage_commission_plans'
  | 'assign_agents_to_plans'
  | 'view_audit_logs'
  | 'export_data'
  | 'manage_settings';

/**
 * Permission matrix: defines which permissions each role has
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'view_own_data',
    'view_team_data',
    'view_all_data',
    'view_own_commission',
    'view_team_commission',
    'view_all_commission',
    'upload_data',
    'delete_own_uploads',
    'delete_team_uploads',
    'delete_all_uploads',
    'manage_users',
    'manage_roles',
    'manage_commission_plans',
    'assign_agents_to_plans',
    'view_audit_logs',
    'export_data',
    'manage_settings',
  ],
  broker: [
    'view_own_data',
    'view_team_data',
    'view_all_data',
    'view_own_commission',
    'view_team_commission',
    'view_all_commission',
    'upload_data',
    'delete_own_uploads',
    'delete_team_uploads',
    'manage_commission_plans',
    'assign_agents_to_plans',
    'export_data',
  ],
  agent: [
    'view_own_data',
    'view_team_data',
    'view_own_commission',
    'upload_data',
    'delete_own_uploads',
    'export_data',
  ],
  viewer: [
    'view_own_data',
    'view_own_commission',
  ],
};

/**
 * Check if a user role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a user role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

/**
 * Check if a user role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Check if a user can view another user's data
 * 
 * @param viewerRole - Role of the user trying to view data
 * @param targetUserId - ID of the user whose data is being viewed
 * @param viewerUserId - ID of the user trying to view data
 * @param targetUserTeamId - Team ID of the user whose data is being viewed (optional)
 * @param viewerUserTeamId - Team ID of the user trying to view data (optional)
 */
export function canViewUserData(
  viewerRole: UserRole,
  targetUserId: number,
  viewerUserId: number,
  targetUserTeamId?: number | null,
  viewerUserTeamId?: number | null
): boolean {
  // Can always view own data
  if (targetUserId === viewerUserId) {
    return hasPermission(viewerRole, 'view_own_data');
  }

  // Check if can view all data
  if (hasPermission(viewerRole, 'view_all_data')) {
    return true;
  }

  // Check if can view team data and users are on same team
  if (
    hasPermission(viewerRole, 'view_team_data') &&
    targetUserTeamId &&
    viewerUserTeamId &&
    targetUserTeamId === viewerUserTeamId
  ) {
    return true;
  }

  return false;
}

/**
 * Check if a user can view another user's commission data
 * 
 * @param viewerRole - Role of the user trying to view commission
 * @param targetUserId - ID of the user whose commission is being viewed
 * @param viewerUserId - ID of the user trying to view commission
 * @param targetUserTeamId - Team ID of the user whose commission is being viewed (optional)
 * @param viewerUserTeamId - Team ID of the user trying to view commission (optional)
 * @param commissionVisibility - Privacy setting from target user's preferences
 */
export function canViewUserCommission(
  viewerRole: UserRole,
  targetUserId: number,
  viewerUserId: number,
  targetUserTeamId?: number | null,
  viewerUserTeamId?: number | null,
  commissionVisibility?: 'public' | 'team' | 'admin_only' | 'private'
): boolean {
  // Can always view own commission
  if (targetUserId === viewerUserId) {
    return hasPermission(viewerRole, 'view_own_commission');
  }

  // Respect privacy settings
  if (commissionVisibility === 'private') {
    return false;
  }

  if (commissionVisibility === 'admin_only' && viewerRole !== 'admin') {
    return false;
  }

  if (
    commissionVisibility === 'team' &&
    (!targetUserTeamId || !viewerUserTeamId || targetUserTeamId !== viewerUserTeamId)
  ) {
    return false;
  }

  // Check if can view all commission
  if (hasPermission(viewerRole, 'view_all_commission')) {
    return true;
  }

  // Check if can view team commission and users are on same team
  if (
    hasPermission(viewerRole, 'view_team_commission') &&
    targetUserTeamId &&
    viewerUserTeamId &&
    targetUserTeamId === viewerUserTeamId
  ) {
    return true;
  }

  return false;
}

/**
 * Role hierarchy levels (higher number = more permissions)
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  viewer: 1,
  agent: 2,
  broker: 3,
  admin: 4,
};

/**
 * Check if a role has higher or equal hierarchy than another role
 */
export function hasHigherOrEqualRole(role: UserRole, compareRole: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[compareRole];
}

/**
 * Check if a role can manage another role
 * (admins can manage all, brokers can manage agents/viewers, etc.)
 */
export function canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_HIERARCHY[managerRole] > ROLE_HIERARCHY[targetRole];
}
