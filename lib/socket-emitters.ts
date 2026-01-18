/**
 * Socket Emitter Utilities
 * 
 * These functions are called from API routes to emit socket events.
 * They are decoupled from the actual socket server to support serverless deployments.
 */

import {
  getIO,
  emitToUser,
  emitToUsers,
  emitToConversation,
  broadcastToCampus,
  broadcastToRole,
  ChatMessage,
  Notification,
  PermissionRequest,
  PermissionResponse,
  DashboardStats,
  SupervisorAvailability,
  ProjectStatus,
} from './socket';

// ============================================
// CHAT EMITTERS
// ============================================

/**
 * Emit a new chat message to conversation participants
 */
export function emitChatMessage(message: ChatMessage): void {
  emitToConversation(message.conversationId, 'chat:message', message);
}

/**
 * Emit message deletion event
 */
export function emitMessageDeleted(conversationId: number, messageId: number): void {
  emitToConversation(conversationId, 'chat:message-deleted', { messageId, conversationId });
}

/**
 * Emit read receipt
 */
export function emitMessageRead(conversationId: number, userId: number): void {
  emitToConversation(conversationId, 'chat:read', { conversationId, userId });
}

// ============================================
// NOTIFICATION EMITTERS
// ============================================

/**
 * Send notification to a single user
 */
export function emitNotificationToUser(userId: number, notification: Notification): void {
  emitToUser(userId, 'notification:new', notification);
}

/**
 * Send notification to multiple users
 */
export function emitNotificationToUsers(userIds: number[], notification: Notification): void {
  emitToUsers(userIds, 'notification:new', notification);
}

/**
 * Send notification to all users of a role in a campus
 */
export function emitNotificationToRole(
  campusId: number,
  role: 'student' | 'supervisor' | 'coordinator',
  notification: Notification
): void {
  broadcastToRole(campusId, 'notification:new', notification, role);
}

/**
 * Send notification to entire campus
 */
export function emitNotificationToCampus(campusId: number, notification: Notification): void {
  broadcastToCampus(campusId, 'notification:new', notification);
}

/**
 * Update notification count for a user
 */
export function emitNotificationCount(userId: number, unreadCount: number): void {
  emitToUser(userId, 'notification:count', { unreadCount });
}

// ============================================
// PERMISSION REQUEST EMITTERS
// ============================================

/**
 * Emit permission request to project owner (supervisor)
 */
export function emitPermissionRequest(supervisorId: number, request: PermissionRequest): void {
  emitToUser(supervisorId, 'permission:request', request);
}

/**
 * Emit permission response to requester (student)
 */
export function emitPermissionResponse(studentId: number, response: PermissionResponse): void {
  emitToUser(studentId, 'permission:response', response);
}

// ============================================
// DASHBOARD STAT EMITTERS
// ============================================

/**
 * Emit dashboard stats update to a specific user
 */
export function emitDashboardStatsToUser(userId: number, stats: DashboardStats): void {
  emitToUser(userId, 'dashboard:stats', stats);
}

/**
 * Emit dashboard stats to all coordinators in a campus
 */
export function emitDashboardStatsToCoordinators(campusId: number, stats: DashboardStats): void {
  broadcastToRole(campusId, 'dashboard:stats', stats, 'coordinator');
}

/**
 * Emit dashboard stats to all supervisors in a campus
 */
export function emitDashboardStatsToSupervisors(campusId: number, stats: DashboardStats): void {
  broadcastToRole(campusId, 'dashboard:stats', stats, 'supervisor');
}

// ============================================
// SUPERVISOR AVAILABILITY EMITTERS
// ============================================

/**
 * Emit supervisor availability update to campus
 */
export function emitSupervisorAvailability(campusId: number, availability: SupervisorAvailability): void {
  broadcastToCampus(campusId, 'supervisor:availability', availability);
}

// ============================================
// PROJECT STATUS EMITTERS
// ============================================

/**
 * Emit project status change to campus
 */
export function emitProjectStatus(campusId: number, status: ProjectStatus): void {
  broadcastToCampus(campusId, 'project:status', status);
}

/**
 * Emit project status to specific users
 */
export function emitProjectStatusToUsers(userIds: number[], status: ProjectStatus): void {
  emitToUsers(userIds, 'project:status', status);
}

// ============================================
// USER STATUS EMITTERS
// ============================================

/**
 * Emit user online status
 */
export function emitUserOnline(campusId: number, userId: number): void {
  broadcastToCampus(campusId, 'user:online', { userId });
}

/**
 * Emit user offline status
 */
export function emitUserOffline(campusId: number, userId: number): void {
  broadcastToCampus(campusId, 'user:offline', { userId });
}
