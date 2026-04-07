import { Service } from './base';

export default class NotificationService extends Service {
  listMine() {
    return this.api.get(`${this.model}/me`);
  }

  listAll() {
    return this.api.get(`${this.model}/admin/all`);
  }

  markRead(id: string) {
    return this.api.post(`${this.model}/read`, { id });
  }

  createWithImage(form: FormData) {
    return this.api.post(`${this.model}/admin/create`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }
}

