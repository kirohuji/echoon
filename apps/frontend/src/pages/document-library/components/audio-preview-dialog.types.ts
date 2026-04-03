import type { AudioProvider } from '../audio-provider-options';

export type WordTimestamp = {
  start_time: number;
  text: string;
};

export type AudioPreviewDocument = {
  fileType?: string | null;
  mimeType?: string | null;
  audioProvider?: AudioProvider | null;
  audioModel?: string | null;
  modelName?: string | null;
  audioVoiceId?: string | null;
  audioError?: string | null;
  audioProgress?: number | null;
  audioStage?: string | null;
  audioStatus?: 'pending' | 'processing' | 'success' | 'failed' | null;
  extractedText?: string | null;
  wordTimestamps?: WordTimestamp[] | null;
};

export function isVideoDocument(doc: AudioPreviewDocument | null) {
  const ext = (doc?.fileType || '').toLowerCase();
  const mime = (doc?.mimeType || '').toLowerCase();
  return mime.startsWith('video/') || ['mp4', 'mov', 'mkv', 'avi', 'webm', 'm4v'].includes(ext);
}

export function partOfSpeechBadgeClass(pos: string) {
  const p = pos.toLowerCase();
  if (p.includes('noun')) return 'border-sky-200/90 bg-sky-50 text-sky-900';
  if (p.includes('verb')) return 'border-emerald-200/90 bg-emerald-50 text-emerald-900';
  if (p.includes('adjective')) return 'border-amber-200/90 bg-amber-50 text-amber-950';
  if (p.includes('adverb')) return 'border-violet-200/90 bg-violet-50 text-violet-900';
  return 'border-slate-200/90 bg-slate-50 text-slate-800';
}

export const ALL_PROVIDERS: AudioProvider[] = ['minimax', 'cartesia', 'hume', 'elevenlabs', 'deepgram'];

export type SelectedProvider = AudioProvider | '';
