import { Service } from './base';

type AudioConfigPayload = {
  audioModel: string;
  audioProvider: 'minimax' | 'cartesia';
  audioVoiceId?: string;
  modelName?: string;
};

export default class DocumentLibraryService extends Service {
  upload(formData: FormData) {
    return this.api.post(`${this.model}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  createText(data: { title?: string; tagIds?: string[]; text: string } & AudioConfigPayload) {
    return this.api.post(`${this.model}/create-text`, data);
  }

  generateAudio(id: string) {
    return this.api.post(`${this.model}/${id}/generate-audio`);
  }

  generateAudioFromText(id: string, text: string) {
    return this.api.post(`${this.model}/${id}/generate-audio-text`, { text });
  }

  getAudioBlob(id: string) {
    return this.api.get(`${this.model}/${id}/audio`, { responseType: 'blob' });
  }
}
