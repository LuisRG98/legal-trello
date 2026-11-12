import api from "../../../lib/api";

import type {
  CaseComment,
  CommentCreate,
  CommentHistory,
  CommentUpdate,
} from "../types/comment.types";

const BASE_URL = "/cases";

export const commentService = {
  async getComments(caseId: string): Promise<CaseComment[]> {
    const response = await api.get<CaseComment[]>(
      `${BASE_URL}/${caseId}/comments`,
      {
        params: {
          skip: 0,
          limit: 100,
        },
      },
    );

    return response.data;
  },

  async createComment(
    caseId: string,
    payload: CommentCreate,
  ): Promise<CaseComment> {
    const response = await api.post<CaseComment>(
      `${BASE_URL}/${caseId}/comments`,
      payload,
    );

    return response.data;
  },

  async updateComment(
    caseId: string,
    commentId: string,
    payload: CommentUpdate,
  ): Promise<CaseComment> {
    const response = await api.patch<CaseComment>(
      `${BASE_URL}/${caseId}/comments/${commentId}`,
      payload,
    );

    return response.data;
  },

  async deleteComment(
    caseId: string,
    commentId: string,
  ): Promise<void> {
    await api.delete(
      `${BASE_URL}/${caseId}/comments/${commentId}`,
    );
  },

  async getCommentHistory(
    caseId: string,
    commentId: string,
  ): Promise<CommentHistory[]> {
    const response = await api.get<CommentHistory[]>(
      `${BASE_URL}/${caseId}/comments/${commentId}/history`,
    );

    return response.data;
  },
};