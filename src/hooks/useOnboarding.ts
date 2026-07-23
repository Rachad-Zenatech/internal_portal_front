import { useMutation } from "@tanstack/react-query";
import { OnboardingService } from "@/services/onboardingService";

export function useCompleteOnboarding() {
  return useMutation({
    mutationFn: () => OnboardingService.complete(),
  });
}
