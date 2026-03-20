import { service }  from '../utils/axios';
import AuthService from '../modules/auth';
import ConversationService from '../modules/conversation';
import DocumentService from '../modules/document';
import UserService from '../modules/user';

export const authService = new AuthService({ api: service, model: 'auth' });
export const conversationService = new ConversationService({ api: service, model: 'conversation' });
export const documentService = new DocumentService({ api: service, model: 'document' });
export const userService = new UserService({ api: service, model: 'user' });