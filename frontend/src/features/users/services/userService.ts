import api from "../../../lib/api";
import type { Assignee } from "../types/user.types";

export const userService = {
  async getAssignees(): Promise<Assignee[]> {
    const response = await api.get<Assignee[]>("/users/assignees");

    return response.data;
  },
};