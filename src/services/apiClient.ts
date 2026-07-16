import { handleResponse } from "./helper";

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export const apiClient = {
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${endpoint}`, { 
      ...options, 
      method: "GET",
      credentials: "include",
      headers: {
        ...(options?.headers as Record<string, string>)
      } as HeadersInit
    });
    return handleResponse<T>(res);
  },
  
  async post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    const isFormData = body instanceof FormData;
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      method: "POST",
      credentials: "include",
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(options?.headers as Record<string, string>),
      } as HeadersInit,
      body: isFormData ? body : JSON.stringify(body),
    });
    return handleResponse<T>(res);
  },
  
  async patch<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers as Record<string, string>),
      } as HeadersInit,
      body: JSON.stringify(body),
    });
    return handleResponse<T>(res);
  },
  
  async put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers as Record<string, string>),
      } as HeadersInit,
      body: JSON.stringify(body),
    });
    return handleResponse<T>(res);
  },
  
  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${endpoint}`, { 
      ...options, 
      method: "DELETE",
      credentials: "include",
      headers: {
        ...(options?.headers as Record<string, string>)
      } as HeadersInit
    });
    return handleResponse<T>(res);
  }
};
