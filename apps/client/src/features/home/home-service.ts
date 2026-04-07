import { http } from '../../lib/http';

export type HomeTag = { id: string; name: string; description?: string };
export type HomeDoc = { id: string; title: string; fileType?: string; createdAt?: string };

export const homeService = {
  async getTags() {
    const raw = await http.get<any>('/tag');
    const unwrapped = raw && raw.success === true && 'data' in raw ? raw.data : raw;
    if (Array.isArray(unwrapped)) return unwrapped as HomeTag[];
    if (unwrapped && Array.isArray(unwrapped.data)) return unwrapped.data as HomeTag[];
    return [];
  },
  async getDocs(page = 1, limit = 8) {
    const raw = await http.post<any>('/document-library/pagination', {
      page,
      limit,
      keyword: '',
    });
    const unwrapped = raw && raw.success === true && 'data' in raw ? raw.data : raw;
    const records = Array.isArray(unwrapped?.records)
      ? unwrapped.records
      : Array.isArray(unwrapped?.data)
        ? unwrapped.data
        : [];
    return {
      records: records as HomeDoc[],
      total: Number(unwrapped?.total ?? records.length ?? 0),
    };
  },
};

