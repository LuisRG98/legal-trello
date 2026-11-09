import { useQuery } from "@tanstack/react-query";

import { userService } from "../services/userService";

export const assigneeKeys = {
  all: ["assignees"] as const,
};

export function useAssignees() {
  return useQuery({
    queryKey: assigneeKeys.all,
    queryFn: userService.getAssignees,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}