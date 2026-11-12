
import { useInfiniteQuery } from "@tanstack/react-query";

import { activityService } from "../services/activityService";

const PAGE_SIZE = 20;

export const activityKeys = {
  all: ["case-activities"] as const,

  case: (caseId: string) =>
    [...activityKeys.all, caseId] as const,
};

export function useCaseActivities(caseId: string) {
  return useInfiniteQuery({
    queryKey: activityKeys.case(caseId),

    queryFn: ({ pageParam }) =>
      activityService.getCaseActivities(
        caseId,
        pageParam,
        PAGE_SIZE,
      ),

    initialPageParam: 0,

    getNextPageParam: (lastPage) => {
      const nextSkip = lastPage.skip + lastPage.items.length;

      return nextSkip < lastPage.total
        ? nextSkip
        : undefined;
    },

    enabled: Boolean(caseId),

    staleTime: 30_000,
    retry: 1,
  });
}
