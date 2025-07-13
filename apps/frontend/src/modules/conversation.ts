import { Service } from './base'

export default class ConversationService extends Service {
  my(){
    return this.api.get(`${this.model}/my`)
  }
  
}
