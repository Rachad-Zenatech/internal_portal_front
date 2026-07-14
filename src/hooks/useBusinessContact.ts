import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "../services/apiClient";
import type {
  BusinessContactCreateRequest,
  BusinessContactDeleteResult,
  BusinessContactReference,
  BusinessContactReferenceList,
  BusinessContactUpdateRequest,
  BusinessContactReferenceSeedResult,
} from "../types/businessContact";

const ENDPOINT = "/api/configuration/business-contacts";

export function useBusinessContacts(
  search = "",
  accountSide?: "ar" | "ap",
  limit = 500,
  offset = 0,
) {
  return useQuery<BusinessContactReferenceList>({
    queryKey: ["business-contacts", search, accountSide, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });
      if (accountSide) {
        params.set("account_side", accountSide);
      }
      if (search.trim()) {
        params.set("search", search.trim());
      }
      return apiClient.get<BusinessContactReferenceList>(
        `${ENDPOINT}?${params.toString()}`,
      );
    },
  });
}

export function useCreateBusinessContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BusinessContactCreateRequest) =>
      apiClient.post<BusinessContactReference>(ENDPOINT, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-contacts"] });
    },
  });
}


export function useUpdateBusinessContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: BusinessContactUpdateRequest }) =>
      apiClient.put<BusinessContactReference>(`${ENDPOINT}/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["business-contacts"] }),
  });
}

export function useDeleteBusinessContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) =>
      apiClient.delete<BusinessContactDeleteResult>(`${ENDPOINT}/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["business-contacts"] }),
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
