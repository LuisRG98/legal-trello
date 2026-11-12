
import api from "../../../lib/api";

import type {
  CaseActivityListResponse,
} from "../types/activity.types";

export const activityService = {
  async getCaseActivities(
    caseId: string,
    skip = 0,
    limit = 20,
  ): Promise<CaseActivityListResponse> {
    const response = await api.get<CaseActivityListResponse>(
      `/cases/${caseId}/activities`,
      {
        params: {
          skip,
          limit,
        },
      },
    );

    return response.data;
  },
};
