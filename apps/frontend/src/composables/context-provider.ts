import { service }  from '../utils/axios';
import AuthService from '../modules/auth';
import ConversationService from '../modules/conversation';
import DocumentService from '../modules/document';
import DocumentLibraryService from '../modules/document-library';
import TagService from '../modules/tag';
import UserService from '../modules/user';
import AdminUserApi from '../modules/admin-user';

export const authService = new AuthService({ api: service, model: 'auth' });
export const conversationService = new ConversationService({ api: service, model: 'conversation' });
export const documentService = new DocumentService({ api: service, model: 'document' });
export const documentLibraryService = new DocumentLibraryService({ api: service, model: 'document-library' });
export const tagService = new TagService({ api: service, model: 'tag' });
export const userService = new UserService({ api: service, model: 'user' });
export const adminUserApi = new AdminUserApi({ api: service, model: '__unused__' });