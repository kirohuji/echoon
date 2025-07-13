import { Service } from './base'

export default class ConversationService extends Service {
  my(){
    return this.api.get(`${this.model}/my`)
  }
  
  getMessages(id: string, data: any){
    return this.api.post(`${this.model}/${id}/messages`, data)
  }
}
