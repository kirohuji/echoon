import { service }  from '../utils/axios';
import AuthService from '../modules/auth';
import PipecatService from '../modules/pipecat';
import ConversationService from '../modules/conversation';
import DocumentService from '../modules/document';

export const authService = new AuthService({ api: service, model: 'auth' });
export const pipecatService = new PipecatService();
export const conversationService = new ConversationService({ api: service, model: 'conversation' });
export const documentService = new DocumentService({ api: service, model: 'document' });