import { apiClient } from "./apiClient";
import type { OnboardingCompletion } from "@/types/onboarding";

export const OnboardingService = {
  complete(): Promise<OnboardingCompletion> {
    return apiClient.post<OnboardingCompletion>(
      "/api/me/onboarding/complete",
      {}
    );
  },
};
