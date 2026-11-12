import api from "../../../lib/api";
import type { Assignee } from "../types/user.types";

export const userService = {
  async getAssignees(
    search: string,
    limit = 10,
  ): Promise<Assignee[]> {
    const response = await api.get<Assignee[]>(
      "/users/assignees",
      {
        params: {
          search,
          limit,
        },
      },
    );

    return response.data;
  },
};