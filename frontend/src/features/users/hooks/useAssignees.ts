import { useQuery } from "@tanstack/react-query";
import { userService } from "../services/userService";

export const assigneeKeys = {
  all: ["assignees"] as const,
  search: (term: string) =>
    [...assigneeKeys.all, term] as const,
};

export function useAssignees(
  search: string,
  enabled: boolean,
) {
  const normalizedSearch = search.trim();

  return useQuery({
    queryKey: assigneeKeys.search(normalizedSearch),

    queryFn: () =>
      userService.getAssignees(normalizedSearch, 10),

    enabled:
      enabled &&
      normalizedSearch.length >= 2,

    staleTime: 30_000,
    retry: 1,
  });
}