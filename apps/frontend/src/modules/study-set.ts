import { Service } from './base';

export type StudyCardType = 'translation' | 'qa';
export type LearnLevel = 'known' | 'vague' | 'unknown';

export type StudyCardProgressDto = {
  correctCount: number;
  wrongCount: number;
  knownCount: number;
  vagueCount: number;
  unknownCount: number;
  lastReviewedAt: number | null;
};

export type StudyCardDto = {
  id: string;
  studySetId: string;
  term: string;
  definition: string;
  cardType: StudyCardType;
  sortOrder: number;
  createdAt?: number;
  updatedAt?: number;
  progress: StudyCardProgressDto | null;
};

export type StudySetStatsDto = {
  cards: { total: number; translation: number; qa: number };
  progress: {
    correctCount: number;
    wrongCount: number;
    knownCount: number;
    vagueCount: number;
    unknownCount: number;
  };
};

export type StudySetListItemDto = {
  id: string;
  title: string;
  description: string | null;
  userId: string;
  createdAt: number;
  updatedAt: number;
  _count: { cards: number };
};

export type StudySetDetailDto = {
  id: string;
  title: string;
  description: string | null;
  userId: string;
  createdAt: number;
  updatedAt: number;
  cards: StudyCardDto[];
  stats?: StudySetStatsDto;
};

export default class StudySetService extends Service {
  getDetail(id: string) {
    return this.api.get(`${this.model}/${id}`);
  }

  updateSet(id: string, body: { title: string; description: string }) {
    return this.api.put(`${this.model}/${id}`, body);
  }

  addCards(
    id: string,
    items: { term: string; definition: string; cardType?: StudyCardType; sortOrder?: number }[],
  ) {
    return this.api.post(`${this.model}/${id}/cards`, { items });
  }

  review(id: string, body: { cardId: string; correct: boolean }) {
    return this.api.post(`${this.model}/${id}/review`, body);
  }

  learnFeedback(id: string, body: { cardId: string; level: LearnLevel }) {
    return this.api.post(`${this.model}/${id}/learn-feedback`, body);
  }

  updateCard(
    cardId: string,
    body: { term?: string; definition?: string; cardType?: StudyCardType; sortOrder?: number },
  ) {
    return this.api.put(`study-card/${cardId}`, body);
  }

  deleteCard(cardId: string) {
    return this.api.delete(`study-card/${cardId}`);
  }
}
