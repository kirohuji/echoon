import { Service } from './base'

export default class AuthService extends Service {
  login(target: { phone: string, password: string}) {
    return this.api.post(`${this.model}/login`, target)
  }
  
  profile(){
    return this.api.get(`${this.model}`)
  }

  logout() {
    return this.api.post(`${this.model}/logout`)
  }
}
