import { Service } from './base';

export default class DocumentLibraryService extends Service {
  upload(formData: FormData) {
    return this.api.post(`${this.model}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  generateAudio(id: string) {
    return this.api.post(`${this.model}/${id}/generate-audio`);
  }
}
