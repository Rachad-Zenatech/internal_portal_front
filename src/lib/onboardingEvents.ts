export const ONBOARDING_SESSION_EVENT = "onboarding-session-state";
export const ONBOARDING_ACTIVE_DATASET_KEY = "onboardingActive";
export const ONBOARDING_NAVIGATION_EVENT = "onboarding-navigation-focus";

export interface OnboardingSessionState {
  active: boolean;
}

export interface OnboardingNavigationFocus {
  path?: string;
}
