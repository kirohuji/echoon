import { Service } from './base';

export default class AdminUserApi extends Service {
  list() {
    return this.api.get('admin/users');
  }

  create(body: object) {
    return this.api.post('admin/users', body);
  }

  update(id: string, body: object) {
    return this.api.patch(`admin/users/${id}`, body);
  }

  remove(id: string) {
    return this.api.delete(`admin/users/${id}`);
  }
}
