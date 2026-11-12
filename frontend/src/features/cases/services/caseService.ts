
import api from "../../../lib/api";

import type {
  CaseFilters,
  CaseListResponse,
  CaseStatusUpdate,
  DocumentRead,
  PDFUploadResponse,
  CaseListItem,
} from "../types/case.types";

export const caseService = {
  async getCases(
    filters: CaseFilters = {},
  ): Promise<CaseListResponse> {
    const response = await api.get<CaseListResponse>(
      "/cases",
      {
        params: filters,
      },
    );

    return response.data;
  },

  async getDocuments(
    caseId: string,
  ): Promise<DocumentRead[]> {
    const response = await api.get<DocumentRead[]>(
      `/documents/case/${caseId}`,
    );

    return response.data;
  },

  async updateStatus(
    caseId: string,
    payload: CaseStatusUpdate,
  ) {
    const response = await api.patch(
      `/cases/${caseId}/status`,
      payload,
    );

    return response.data;
  },

  async uploadPDFs(
    files: File[],
  ): Promise<PDFUploadResponse> {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await api.post<PDFUploadResponse>(
      "/documents/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 120000,
      },
    );

    return response.data;
  },

  async viewDocument(
    documentId: string,
  ): Promise<Blob> {
    const response = await api.get<Blob>(
      `/documents/${documentId}/view`,
      {
        responseType: "blob",
      },
    );

    return response.data;
  },

  async updateAssignment(
    caseId: string,
    assignedToId: string | null,
  ): Promise<CaseListItem> {
    const response = await api.patch<CaseListItem>(
      `/cases/${caseId}/assignment`,
      {
        assigned_to_id: assignedToId,
      },
    );

    return response.data;
  },
};


