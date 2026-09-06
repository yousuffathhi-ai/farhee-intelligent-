export type NavTab = 'chat' | 'presentation' | 'code' | 'bugfix' | 'image' | 'music' | 'history';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  isFallback?: boolean;
  errorStatus?: string;
  statusCode?: number;
}

export interface SlideItem {
  id: string;
  slideNumber: number;
  title: string;
  subtitle?: string;
  bulletPoints: string[];
  notes?: string;
  layout?: 'title' | 'content' | 'split' | 'quote' | 'metrics';
  metrics?: { label: string; value: string; detail?: string }[];
  accentColor?: string;
  tag?: string;
}

export interface PresentationProject {
  id: string;
  title: string;
  subtitle: string;
  theme: 'emerald' | 'cyberpunk' | 'corporate' | 'midnight' | 'minimal';
  aspectRatio: '16:9' | '4:3';
  author: string;
  slides: SlideItem[];
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedCodeResult {
  id: string;
  title: string;
  language: string;
  code: string;
  previewHtml?: string;
  explanation: string;
  features: string[];
  dependencies: string[];
  createdAt: string;
}

export interface BugFixResult {
  id: string;
  originalCode?: string;
  errorMessage?: string;
  cause: string;
  correctedCode: string;
  explanation: string;
  preventionTips: string[];
  severity: 'High' | 'Medium' | 'Low';
  detectedLanguage: string;
  createdAt: string;
}

export interface GeneratedImageItem {
  id: string;
  imageUrl: string;
  originalPrompt: string;
  enhancedPrompt: string;
  style: string;
  aspectRatio: string;
  seed: number;
  width: number;
  height: number;
  createdAt: string;
}

export interface SynthBlueprint {
  bassType: 'sub-saw' | 'acid-square' | 'warm-sine' | 'fm-pluck' | string;
  leadType: 'neon-supersaw' | 'ethereal-chime' | 'lofi-triangle' | 'pluck' | string;
  drumPattern: 'four-on-the-floor' | 'breakbeat' | 'half-time-lofi' | 'cyber-electro' | string;
  chordProgression: string[];
  melodyNotes: string[];
  bassNotes: string[];
}

export interface GeneratedMusicTrack {
  id: string;
  title: string;
  genre: string;
  bpm: number;
  key: string;
  mood: string;
  structure: string[];
  synthBlueprint: SynthBlueprint;
  aiLyrics?: string;
  audioCraftPrompt?: string;
  createdAt: string;
}

export interface HistoryItem {
  id: string;
  type: 'chat' | 'presentation' | 'code' | 'bugfix' | 'image' | 'music';
  title: string;
  previewText: string;
  timestamp: string;
  data: any;
}
