import { apiClient } from "./apiClient";

export async function getAnnualReport() {
  return apiClient.get<any>(`/reports/annual`);
}