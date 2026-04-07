import { Service } from './base';

export default class MembershipService extends Service {
  getMine() {
    return this.api.get(`${this.model}/me`);
  }

  listAll() {
    return this.api.get(`${this.model}/admin/all`);
  }

  upsert(payload: {
    userId: string;
    plan?: string;
    status?: string;
    expiresAt?: string | null;
    benefits?: string[];
  }) {
    return this.api.post(`${this.model}/admin/upsert`, payload);
  }
}

