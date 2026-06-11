// src/services/glService.ts

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export type GLFormat = {
  id: number;
  code: string;
  name: string;
};

export type GLFormats = {
  formats: GLFormat[];
};

export type ParseSummary = {
  company_id: number;
  company_name: string;
  source_file_id: number;
  accounts_resolved: number;
  gl_entries: number;
  gl_entry_lines: number;
  bank_lines: number;
};

export type ParseImportResponse = {
  summary: ParseSummary;
};

async function handleError(response: Response, fallbackMessage: string): Promise<never> {
  const errorData = await response.json().catch(() => ({}));

  throw new Error(
    errorData.detail || `Error ${response.status}: ${fallbackMessage}`
  );
}

export const GLService = {
  async getFormats(): Promise<GLFormat[]> {
    const response = await fetch(`${API_BASE_URL}/accounting/gl/formats`);

    if (!response.ok) {
      await handleError(response, "Failed to fetch GL formats");
    }

    const data: GLFormats | GLFormat[] = await response.json();

    return Array.isArray(data) ? data : data.formats;
  },

  async parseImport(params: {
    companyId: number;
    formatId: number;
    file: File;
  }): Promise<ParseImportResponse> {
    const formData = new FormData();
    formData.append("company_id", String(params.companyId));
    formData.append("format_id", String(params.formatId));
    formData.append("file", params.file);

    const response = await fetch(`${API_BASE_URL}/accounting/gl/imports/parse`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      await handleError(response, "Failed to parse GL file");
    }

    return response.json();
  },

  async saveImport(params: {
    companyId: number;
    formatId: number;
    sourceFileId: number;
  }): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/accounting/gl/imports/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        company_id: params.companyId,
        format_id: params.formatId,
        source_file_id: params.sourceFileId,
      }),
    });

    if (!response.ok) {
      await handleError(response, "Failed to save import");
    }
  },

  async deleteImport(params: {
    companyId: number;
    sourceFileId: number;
  }): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/accounting/gl/imports/${params.sourceFileId}?company_id=${params.companyId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      await handleError(response, "Failed to discard import");
    }
  },
};