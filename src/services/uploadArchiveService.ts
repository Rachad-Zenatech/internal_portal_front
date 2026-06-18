const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export type UploadType = "general-ledger" | "bank-statement";

export type UploadTypeOption = {
  value: UploadType;
  label: string;
};

export type ArchivedUpload = {
  id: string;
  upload_type: UploadType;
  upload_type_label: string;
  filename: string;
  content_type: string;
  original_size: number;
  compressed_size: number;
  compression_percent: number;
  stored_at: string;
  storage: string;
  metadata: Record<string, unknown>;
};

export type UploadFilesResponse = {
  upload_types: UploadTypeOption[];
  files: ArchivedUpload[];
};

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    let message = `Error ${response.status}`;
    try {
      const errorData = JSON.parse(text);
      message = errorData.detail || message;
    } catch {
      // Keep the status fallback when the server did not return JSON.
    }
    throw new Error(message);
  }

  return response.json();
}

export const uploadArchiveService = {
  async list(uploadType?: UploadType): Promise<UploadFilesResponse> {
    const params = uploadType ? `?upload_type=${encodeURIComponent(uploadType)}` : "";
    const response = await fetch(`${API_BASE_URL}/upload-files${params}`);
    return handleResponse<UploadFilesResponse>(response);
  },

  async remove(fileId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/upload-files/${fileId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      await handleResponse(response);
    }
  },

  viewUrl(fileId: string): string {
    return `${API_BASE_URL}/upload-files/${fileId}/view`;
  },

  downloadUrl(fileId: string): string {
    return `${API_BASE_URL}/upload-files/${fileId}/download`;
  },
};
