
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { caseService } from "../services/caseService";

import type {
  CaseFilters,
  CaseStatusUpdate,
} from "../types/case.types";

export const caseKeys = {
  all: ["cases"] as const,

  lists: () => [...caseKeys.all, "list"] as const,

  list: (filters: CaseFilters) =>
    [...caseKeys.lists(), filters] as const,

  documents: (caseId: string) =>
    ["documents", caseId] as const,
};

export function useCases(filters: CaseFilters) {
  return useQuery({
    queryKey: caseKeys.list(filters),
    queryFn: () => caseService.getCases(filters),
    staleTime: 30_000,
  });
}

export function useCaseDocuments(caseId: string | null) {
  return useQuery({
    queryKey: caseKeys.documents(caseId ?? ""),
    queryFn: () => caseService.getDocuments(caseId!),
    enabled: Boolean(caseId),
  });
}

export function useUpdateCaseStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      caseId,
      payload,
    }: {
      caseId: string;
      payload: CaseStatusUpdate;
    }) => caseService.updateStatus(caseId, payload),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: caseKeys.all,
      });
    },
  });
}

export function useUploadPDFs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (files: File[]) =>
      caseService.uploadPDFs(files),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: caseKeys.all,
      });
    },
  });
}

export function useUpdateCaseAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      caseId,
      assignedToId,
    }: {
      caseId: string;
      assignedToId: string | null;
    }) => caseService.updateAssignment(caseId, assignedToId),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: caseKeys.all,
      });
    },
  });
}