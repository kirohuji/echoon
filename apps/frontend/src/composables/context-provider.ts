import { service }  from '../utils/axios';
import AuthService from '../modules/auth';

export const authService = new AuthService({ api: service, model: 'auth' });