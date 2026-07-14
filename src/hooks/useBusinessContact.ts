import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "../services/apiClient";
import type {
  BusinessContactReferenceList,
  BusinessContactReferenceSeedResult,
} from "../types/businessContact";

const ENDPOINT = "/api/configuration/business-contacts";

export function useBusinessContacts(search = "", limit = 500, offset = 0) {
  return useQuery<BusinessContactReferenceList>({
    queryKey: ["business-contacts", search, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });
      if (search.trim()) {
        params.set("search", search.trim());
      }
      return apiClient.get<BusinessContactReferenceList>(
        `${ENDPOINT}?${params.toString()}`,
      );
    },
  });
}

export function useReseedBusinessContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () =>
      apiClient.post<BusinessContactReferenceSeedResult>(
        `${ENDPOINT}/reseed`,
        {},
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-contacts"] });
    },
  });
}
