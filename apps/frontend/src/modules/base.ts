export class Service {
  api: any;

  model: any;

  constructor(options: any) {
    // eslint-disable-next-line no-restricted-syntax
    for (const name in options) {
      if (Object.prototype.hasOwnProperty.call(options, name)) {
        // Use type assertion to fix the indexing error
        (this as any)[name] = options[name];
      }
    }
  }

  makeUserService({ api }: { api: any }) {
    this.api = api as any
    return this
  }

  delete(target: any) {
    return this.api.delete(`${this.model}/${target.id}`, target)
  }

  patch(target: any) {
    return this.api.patch(`${this.model}/${target.id}`, target)
  }

  post(target: any) {
    return this.api.post(`${this.model}`, target)
  }

  active(target: any) {
    return this.api.post(`${this.model}/active`, target)
  }

  deactive(target: any) {
    return this.api.post(`${this.model}/active`, {
      ...target,
      isActive: false,
    })
  }

  getActive(target: any) {
    return this.api.get(`${this.model}/active`, target)
  }

  put(target: any) {
    return this.api.put(`${this.model}/${target.id}`, target)
  }

  get(target: any) {
    return this.api.get(`${this.model}/${target.id}`, target)
  }

  getAll(target: any) {
    return this.api.get(`${this.model}`, target)
  }

  getModel() {
    return this.api.get(`${this.model}/model`)
  }

  pagination(target: any) {
    return this.api.post(`${this.model}/pagination`, target)
  }

  search(selector: any, options: any) {
    return this.api.post(`${this.model}/search`, {
      selector, options
    })
  }
}
