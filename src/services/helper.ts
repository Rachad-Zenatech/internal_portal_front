export async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((err as { detail: string }).detail || "Request failed");
  }
  if (res.status === 204) return null as unknown as T;
  return res.json() as Promise<T>;
}