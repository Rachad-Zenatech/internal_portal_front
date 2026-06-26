import { handleResponse } from "./helper";

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { "Authorization": `Bearer ${token}` } : {};
};

export const apiClient = {
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${endpoint}`, { 
      ...options, 
      method: "GET",
      headers: {
        ...getAuthHeaders(),
        ...options?.headers
      }
    });
    return handleResponse<T>(res);
  },
  
  async post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    const isFormData = body instanceof FormData;
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      method: "POST",
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...getAuthHeaders(),
        ...options?.headers,
      },
      body: isFormData ? body : JSON.stringify(body),
    });
    return handleResponse<T>(res);
  },
  
  async patch<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
        ...options?.headers,
      },
      body: JSON.stringify(body),
    });
    return handleResponse<T>(res);
  },
  
  async put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
        ...options?.headers,
      },
      body: JSON.stringify(body),
    });
    return handleResponse<T>(res);
  },
  
  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${endpoint}`, { 
      ...options, 
      method: "DELETE",
      headers: {
        ...getAuthHeaders(),
        ...options?.headers
      }
    });
    return handleResponse<T>(res);
  }
};
