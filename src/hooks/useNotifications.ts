import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../services/apiClient";
import { BASE_URL } from "../services/apiClient";

export interface Notification {
  id: number;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link_url?: string;
  entity_type?: string;
  entity_id?: string;
  background_job_id?: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

export type NotificationListener = (notification: Notification) => void;

const RECONNECT_DELAY_MS = 5000;
const listeners = new Set<NotificationListener>();
let eventSource: EventSource | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleReconnect(delayMs: number) {
  if (reconnectTimer || listeners.size === 0) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    openStream();
  }, delayMs);
}

function openStream() {
  if (listeners.size === 0) return;
  if (eventSource && (eventSource.readyState === EventSource.OPEN || eventSource.readyState === EventSource.CONNECTING)) {
    return;
  }

  try {
    const rawUrl = BASE_URL ? `${BASE_URL}/api/notifications/stream` : "/api/notifications/stream";
    const es = new EventSource(rawUrl, { withCredentials: true });
    eventSource = es;

    es.onopen = () => {
      // Connected successfully
    };

    es.onmessage = (event) => {
      if (!event.data) return;
      try {
        const payload = JSON.parse(event.data);
        if (!payload || payload.type === "ping") return;
        listeners.forEach((listener) => {
          try {
            listener(payload);
          } catch {
            // Protect loop from rogue listener exceptions
          }
        });
      } catch {
        // Ignore non-JSON or comment payloads
      }
    };

    es.onerror = () => {
      if (eventSource === es) {
        es.close();
        eventSource = null;
      }
      if (listeners.size > 0) {
        scheduleReconnect(RECONNECT_DELAY_MS);
      }
    };
  } catch {
    scheduleReconnect(RECONNECT_DELAY_MS);
  }
}

function subscribeToNotifications(listener: NotificationListener) {
  listeners.add(listener);
  openStream();

  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (eventSource) {
      const es = eventSource;
      eventSource = null;
      es.onerror = null;
      es.close();
    }
  };
}

/**
 * Subscribe to the shared notification stream. Always refreshes the
 * notification caches; `onNotification` receives the raw payload for callers
 * that need to react to it directly (toasts, desktop notifications).
 */
export function useNotificationStream(options?: { onNotification?: NotificationListener }) {
  const queryClient = useQueryClient();
  const handlerRef = useRef<NotificationListener | undefined>(options?.onNotification);
  handlerRef.current = options?.onNotification;

  useEffect(() => {
    return subscribeToNotifications((payload) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
      handlerRef.current?.(payload);
    });
  }, [queryClient]);
}

export function useNotifications(options?: { refetchInterval?: number | false }) {
  useNotificationStream();
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      try {
        const res = await apiClient.get<Notification[]>("/api/notifications");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    staleTime: 30000,
    refetchInterval: options?.refetchInterval ?? false,
    refetchOnWindowFocus: true,
  });
}

export function useUnreadNotificationCount(options?: { refetchInterval?: number | false }) {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      try {
        const res = await apiClient.get<{ count: number }>("/api/notifications/unread-count");
        return res && typeof res.count === "number" ? res : { count: 0 };
      } catch {
        return { count: 0 };
      }
    },
    staleTime: 30000,
    refetchInterval: options?.refetchInterval ?? false,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: number) => {
      try {
        return await apiClient.patch(`/api/notifications/${notificationId}/read`, {});
      } catch {
        return null;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        return await apiClient.patch(`/api/notifications/read-all`, {});
      } catch {
        return null;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });
}

export function useClearReadNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        return await apiClient.delete("/api/notifications/read");
      } catch {
        return null;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });
}

export function useClearAllNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        return await apiClient.delete("/api/notifications/all");
      } catch {
        return null;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });
}
