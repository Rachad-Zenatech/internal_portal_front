import { apiClient, BASE_URL } from "./apiClient";

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

export const uploadArchiveService = {
  async list(uploadType?: UploadType): Promise<UploadFilesResponse> {
    const params = uploadType ? `?upload_type=${encodeURIComponent(uploadType)}` : "";
    return apiClient.get<UploadFilesResponse>(`/upload-files${params}`);
  },

  async remove(fileId: string): Promise<void> {
    await apiClient.delete<void>(`/upload-files/${fileId}`);
  },

  viewUrl(fileId: string): string {
    return `${BASE_URL}/upload-files/${fileId}/view`;
  },

  downloadUrl(fileId: string): string {
    return `${BASE_URL}/upload-files/${fileId}/download`;
  },
};
