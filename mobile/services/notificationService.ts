import api from './api';

export interface NotificationDTO {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  actionType: string | null;
  actionMeta: Record<string, any> | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  userId: string;
}

export const notificationService = {
  getAll: () => api.get<NotificationDTO[]>('/notifications'),

  getUnreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),

  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),

  markAllAsRead: () => api.post('/notifications/read-all'),

  handleAction: (id: string, action: 'confirm' | 'postpone') =>
    api.post(`/notifications/${id}/action`, { action }),
};