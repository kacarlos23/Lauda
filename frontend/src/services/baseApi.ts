import type { PaginatedResponse } from "../types/api";

export const handleListResponse = <T>(res: any): PaginatedResponse<T> => {
  return res.data.results
    ? res.data
    : {
        results: res.data,
        count: Array.isArray(res.data) ? res.data.length : 0,
        next: null,
        previous: null,
      };
};
