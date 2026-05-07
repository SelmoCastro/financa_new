import { useState, useEffect } from 'react';
import { notificationService } from '../services/notificationService';

let globalUnreadCount = 0;
let listeners: Array<(count: number) => void> = [];

export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(globalUnreadCount);

  useEffect(() => {
    listeners.push(setUnreadCount);
    return () => {
      listeners = listeners.filter(l => l !== setUnreadCount);
    };
  }, []);

  return { unreadCount };
}

export async function refreshUnreadCount() {
  try {
    const res = await notificationService.getUnreadCount();
    globalUnreadCount = res.data?.count ?? 0;
    listeners.forEach(l => l(globalUnreadCount));
  } catch {
    // Silently fail — non-critical
  }
}