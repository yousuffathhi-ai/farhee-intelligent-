import { 
  ChatMessage, 
  GeneratedCodeResult, 
  BugFixResult, 
  GeneratedImageItem, 
  GeneratedMusicTrack, 
  HistoryItem,
  PresentationProject 
} from '../types';

const STORAGE_KEYS = {
  CHAT_MESSAGES: 'farhee_chat_messages',
  PRESENTATIONS: 'farhee_presentations',
  GENERATED_CODES: 'farhee_generated_codes',
  BUG_FIXES: 'farhee_bug_fixes',
  IMAGES: 'farhee_images',
  MUSIC_TRACKS: 'farhee_music_tracks',
  HISTORY: 'farhee_unified_history',
};

export const StorageService = {
  // Chat
  getChatMessages(): ChatMessage[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHAT_MESSAGES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  saveChatMessages(messages: ChatMessage[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(messages));
    } catch (e) {
      console.warn('Storage error', e);
    }
  },

  // Presentations
  getPresentations(): PresentationProject[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRESENTATIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  savePresentation(item: PresentationProject) {
    try {
      const list = this.getPresentations();
      const updated = [item, ...list.filter(x => x.id !== item.id)].slice(0, 30);
      localStorage.setItem(STORAGE_KEYS.PRESENTATIONS, JSON.stringify(updated));
      this.addHistoryRecord({
        id: item.id,
        type: 'presentation',
        title: `Deck: ${item.title}`,
        previewText: `${item.subtitle} • ${item.slides.length} slides (${item.theme})`,
        timestamp: item.updatedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        data: item,
      });
    } catch (e) {
      console.warn('Storage error', e);
    }
  },

  // Code
  getGeneratedCodes(): GeneratedCodeResult[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GENERATED_CODES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  saveGeneratedCode(item: GeneratedCodeResult) {
    try {
      const list = this.getGeneratedCodes();
      const updated = [item, ...list.filter(x => x.id !== item.id)].slice(0, 50);
      localStorage.setItem(STORAGE_KEYS.GENERATED_CODES, JSON.stringify(updated));
      this.addHistoryRecord({
        id: item.id,
        type: 'code',
        title: item.title || `${item.language} Code snippet`,
        previewText: item.explanation.substring(0, 100) + '...',
        timestamp: item.createdAt,
        data: item,
      });
    } catch (e) {
      console.warn('Storage error', e);
    }
  },

  // Bug Fixes
  getBugFixes(): BugFixResult[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BUG_FIXES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  saveBugFix(item: BugFixResult) {
    try {
      const list = this.getBugFixes();
      const updated = [item, ...list.filter(x => x.id !== item.id)].slice(0, 50);
      localStorage.setItem(STORAGE_KEYS.BUG_FIXES, JSON.stringify(updated));
      this.addHistoryRecord({
        id: item.id,
        type: 'bugfix',
        title: `Bug Fix: ${item.detectedLanguage || 'Script'} (${item.severity})`,
        previewText: item.cause.substring(0, 100) + '...',
        timestamp: item.createdAt,
        data: item,
      });
    } catch (e) {
      console.warn('Storage error', e);
    }
  },

  // Images
  getImages(): GeneratedImageItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.IMAGES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  saveImage(item: GeneratedImageItem) {
    try {
      const list = this.getImages();
      const updated = [item, ...list.filter(x => x.id !== item.id)].slice(0, 40);
      localStorage.setItem(STORAGE_KEYS.IMAGES, JSON.stringify(updated));
      this.addHistoryRecord({
        id: item.id,
        type: 'image',
        title: `AI Art: ${item.style}`,
        previewText: item.originalPrompt,
        timestamp: item.createdAt,
        data: item,
      });
    } catch (e) {
      console.warn('Storage error', e);
    }
  },

  // Music Tracks
  getMusicTracks(): GeneratedMusicTrack[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MUSIC_TRACKS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  saveMusicTrack(item: GeneratedMusicTrack) {
    try {
      const list = this.getMusicTracks();
      const updated = [item, ...list.filter(x => x.id !== item.id)].slice(0, 30);
      localStorage.setItem(STORAGE_KEYS.MUSIC_TRACKS, JSON.stringify(updated));
      this.addHistoryRecord({
        id: item.id,
        type: 'music',
        title: `Music: ${item.title} (${item.genre})`,
        previewText: `${item.mood} • ${item.bpm} BPM • Key: ${item.key}`,
        timestamp: item.createdAt,
        data: item,
      });
    } catch (e) {
      console.warn('Storage error', e);
    }
  },

  // Unified History
  getHistory(): HistoryItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  addHistoryRecord(record: HistoryItem) {
    try {
      const list = this.getHistory();
      const updated = [record, ...list.filter(x => x.id !== record.id)].slice(0, 100);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage error', e);
    }
  },
  clearAllHistory() {
    try {
      localStorage.removeItem(STORAGE_KEYS.CHAT_MESSAGES);
      localStorage.removeItem(STORAGE_KEYS.PRESENTATIONS);
      localStorage.removeItem(STORAGE_KEYS.GENERATED_CODES);
      localStorage.removeItem(STORAGE_KEYS.BUG_FIXES);
      localStorage.removeItem(STORAGE_KEYS.IMAGES);
      localStorage.removeItem(STORAGE_KEYS.MUSIC_TRACKS);
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
    } catch (e) {
      console.warn('Storage clear error', e);
    }
  }
};
