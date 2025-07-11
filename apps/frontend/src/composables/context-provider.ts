import { service }  from '../utils/axios';
import AuthService from '../modules/auth';
import PipecatService from '../modules/pipecat';

export const authService = new AuthService({ api: service, model: 'auth' });
export const pipecatService = new PipecatService();