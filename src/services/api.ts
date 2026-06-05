const API_URL = "http://localhost:8000";

export async function getAnnualReport() {
  const response = await fetch(
    `${API_URL}/reports/annual`
  );

  return response.json();
}