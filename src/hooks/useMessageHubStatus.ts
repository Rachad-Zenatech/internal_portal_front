import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  buildAllOfflineFallback,
  fetchMessageHubStatus,
  getMessageHubStreamUrl,
  testMessageHub,
} from "@/services/messageHubService";
import type { MessageHubStatusResponse } from "@/types/messageHub";

const MESSAGE_HUB_QUERY_KEY = ["message-hub-live-status"] as const;

export function useMessageHubStatus() {
  const [isTesting, setIsTesting] = useState(false);
  const queryClient = useQueryClient();

  const { data, refetch } = useQuery<MessageHubStatusResponse>({
    queryKey: MESSAGE_HUB_QUERY_KEY,
    queryFn: () => {
      const previous = queryClient.getQueryData<MessageHubStatusResponse>(MESSAGE_HUB_QUERY_KEY);
      return fetchMessageHubStatus(previous);
    },
    staleTime: 1500,
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  // Real-time SSE listener: receives instant cross-server disconnect/reconnect pushes
  useEffect(() => {
    const streamUrl = getMessageHubStreamUrl();
    let es: EventSource | null = null;
    try {
      es = new EventSource(streamUrl, { withCredentials: true });
      es.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data) as MessageHubStatusResponse;
          if (payload && Array.isArray(payload.servers)) {
            queryClient.setQueryData(MESSAGE_HUB_QUERY_KEY, payload);
          }
        } catch {
          // Ignore malformed event
        }
      };
      es.onerror = () => {
        refetch();
      };
    } catch {
      // EventSource not available
    }
    return () => {
      if (es) es.close();
    };
  }, [queryClient, refetch]);

  const runActiveTest = async () => {
    setIsTesting(true);
    try {
      const tested = await testMessageHub();
      if (tested && Array.isArray(tested.servers)) {
        queryClient.setQueryData(MESSAGE_HUB_QUERY_KEY, tested);
      } else {
        await refetch();
      }
    } catch {
      await refetch();
    } finally {
      setTimeout(() => setIsTesting(false), 400);
    }
  };

  return {
    resolvedData: data ?? buildAllOfflineFallback(),
    isTesting,
    runActiveTest,
  };
}
