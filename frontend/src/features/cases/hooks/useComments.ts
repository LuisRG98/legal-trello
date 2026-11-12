import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { commentService } from "../services/commentService";

import type {
  CommentCreate,
  CommentUpdate,
} from "../types/comment.types";

export const commentKeys = {
  all: ["comments"] as const,

  byCase: (caseId: string) =>
    [...commentKeys.all, "case", caseId] as const,

  history: (caseId: string, commentId: string) =>
    [...commentKeys.all, "history", caseId, commentId] as const,
};

/**
 * Obtener los comentarios de un caso.
 */
export function useComments(caseId: string) {
  return useQuery({
    queryKey: commentKeys.byCase(caseId),

    queryFn: () => commentService.getComments(caseId),

    enabled: Boolean(caseId),

    staleTime: 30_000,

    retry: 1,
  });
}

/**
 * Crear un comentario.
 */
export function useCreateComment(caseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CommentCreate) =>
      commentService.createComment(caseId, payload),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: commentKeys.byCase(caseId),
      });
    },
  });
}

/**
 * Editar un comentario.
 */
export function useUpdateComment(caseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      commentId,
      payload,
    }: {
      commentId: string;
      payload: CommentUpdate;
    }) =>
      commentService.updateComment(
        caseId,
        commentId,
        payload,
      ),

    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: commentKeys.byCase(caseId),
        }),

        queryClient.invalidateQueries({
          queryKey: commentKeys.history(
            caseId,
            variables.commentId,
          ),
        }),
      ]);
    },
  });
}

/**
 * Eliminar un comentario.
 */
export function useDeleteComment(caseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) =>
      commentService.deleteComment(caseId, commentId),

    onSuccess: async (_data, commentId) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: commentKeys.byCase(caseId),
        }),

        queryClient.invalidateQueries({
          queryKey: commentKeys.history(caseId, commentId),
        }),
      ]);
    },
  });
}

/**
 * Consultar el historial de un comentario.
 */
export function useCommentHistory(
  caseId: string,
  commentId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: commentKeys.history(caseId, commentId),

    queryFn: () =>
      commentService.getCommentHistory(caseId, commentId),

    enabled: Boolean(caseId && commentId && enabled),

    staleTime: 30_000,

    retry: 1,
  });
}