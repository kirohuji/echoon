import { Service } from './base';

export default class TicketService extends Service {
  listMine() {
    return this.api.get(`${this.model}/me`);
  }

  listAll() {
    return this.api.get(`${this.model}/admin/all`);
  }

  create(payload: { subject: string; content: string }) {
    return this.api.post(`${this.model}`, payload);
  }

  updateStatus(payload: { id: string; status: string }) {
    return this.api.post(`${this.model}/admin/status`, payload);
  }
}

