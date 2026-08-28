import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Copy, 
  Check, 
  Trash2, 
  Download, 
  Volume2, 
  VolumeX, 
  RotateCcw,
  Code,
  Search,
  Zap,
  Terminal,
  Mic,
  MicOff,
  PhoneCall,
  Radio,
  Share2
} from 'lucide-react';
import { ChatMessage } from '../types';
import { StorageService } from '../utils/storage';
import { auth, CloudStoreService } from '../utils/firebase';
import { SpeechService, getSpeechRecognition } from '../utils/speech';
import { VoiceModal } from './VoiceModal';

interface ChatViewProps {
  onNavigateToCode?: (prompt?: string) => void;
  onNavigateToBugFix?: () => void;
}

const QUICK_PROMPTS = [
  { label: 'Create React Component', prompt: 'Create an interactive Glassmorphic Dashboard card component in React + Tailwind CSS with animations.' },
  { label: 'Analyze Error & Debug', prompt: 'Can you help me analyze why a React useEffect hook causes an infinite re-render loop?' },
  { label: 'Write SEO Blog Post', prompt: 'Write an engaging SEO-optimized blog outline on Modern Progressive Web Apps (PWA) with offline capabilities.' },
  { label: 'Explain Quantum Theory', prompt: 'Explain Quantum Superposition and Schrodinger\'s equation with mathematical concepts in simple terms.' },
  { label: 'Design SQL Schema', prompt: 'Design an optimized PostgreSQL schema for an AI multi-user SaaS platform with subscriptions and tokens.' },
  { label: 'Cyberpunk Lore', prompt: 'Write a short atmospheric cyberpunk story set in a neon-lit futuristic Batticaloa harbor.' },
];

export const ChatView: React.FC<ChatViewProps> = ({ onNavigateToCode, onNavigateToBugFix }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = StorageService.getChatMessages();
    if (saved.length > 0) return saved;
    return [
      {
        id: 'welcome-msg',
        role: 'model',
        content: `👋 **Welcome to Farhee Intelligent!**\n\nI am your versatile AI assistant created with precision by **PGV Creation (Batticaloa, Sri Lanka)**.\n\nHere is what I can do for you:\n- 🎙️ **Voice-to-Text & Live Voice Conversation Mode** (Hands-free AI voice calls)\n- 📊 **PowerPoint Presentation Architect** (PPTX, PDF, Excel & Word DOCX)\n- 💬 **Deep Conversational AI & Reasoning** (Markdown, LaTeX, Math & Science)\n- 💻 **AI Code Generation** with live sandbox runner\n- 🐞 **Automated Bug Diagnosis** & Step-by-Step Fixer\n- 🎨 **AI Image Generation** in multiple art styles & HD ratios\n- 🎵 **Procedural Music & Audio Synthesizer** with downloadable WAV tracks\n\nHow can I empower your workflow today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isDictating, setIsDictating] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    StorageService.saveChatMessages(messages);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    // Sync to Cloud Firestore if logged in
    const user = auth.currentUser;
    if (user && messages.length > 1) {
      CloudStoreService.saveChatSession(
        user.uid,
        'active_chat_session',
        messages[1]?.content?.slice(0, 40) || 'Farhee Conversation',
        messages
      );
    }
  }, [messages]);

  // Clean up speech synthesis & dictation on unmount
  useEffect(() => {
    return () => {
      SpeechService.stopSpeaking();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  // Voice to Text Dictation (Microphone input in chat input box)
  const toggleVoiceToText = () => {
    if (isDictating) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsDictating(false);
      return;
    }

    const recognition = getSpeechRecognition();
    if (!recognition) {
      alert('Speech recognition is not supported in this browser. You can still use keyboard input.');
      return;
    }

    try {
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsDictating(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript) {
          setInput(currentTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsDictating(false);
      };

      recognition.onend = () => {
        setIsDictating(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsDictating(false);
    }
  };

  const handleSend = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || isLoading) return;

    if (isDictating && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsDictating(false);
    }

    const userMessage: ChatMessage = {
      id: 'usr-' + Date.now(),
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updated = [...messages, userMessage];
    setMessages(updated);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updated.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      const replyText = data.reply || data.fallbackReply || 'Sorry, I could not process that.';

      const botMessage: ChatMessage = {
        id: 'bot-' + Date.now(),
        role: 'model',
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages([...updated, botMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: 'bot-err-' + Date.now(),
        role: 'model',
        content: '⚠️ **Network notice**: Unable to communicate with the AI engine right now. Please check your internet connection or try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...updated, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (text: string, id: string) => {
    if (speakingId === id) {
      SpeechService.stopSpeaking();
      setSpeakingId(null);
      return;
    }

    setSpeakingId(id);
    SpeechService.speakText(text, {
      onEnd: () => setSpeakingId(null),
      onError: () => setSpeakingId(null),
    });
  };

  const handleClear = () => {
    if (window.confirm('Clear all conversation history?')) {
      const initial: ChatMessage[] = [
        {
          id: 'welcome-reset',
          role: 'model',
          content: '✨ Chat memory cleared. What would you like to explore next?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ];
      setMessages(initial);
      StorageService.saveChatMessages(initial);
    }
  };

  const handleSaveVoiceTranscript = (voiceMessages: ChatMessage[]) => {
    const updated = [...messages, ...voiceMessages];
    setMessages(updated);
    StorageService.saveChatMessages(updated);
  };

  return (
    <div id="farhee-chat-view" className="flex flex-col h-[calc(100vh-4rem)] bg-[#0B0D0E]">
      {/* Top chat sub-bar with Voice Call Launcher */}
      <div className="px-4 lg:px-6 py-2.5 border-b border-[#1A2227] bg-[#0E1317]/80 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
          <span className="text-xs font-mono text-neutral-300">
            Farhee Engine 3.7 • Context Memory Active
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Voice Conversation Mode Trigger Button */}
          <button
            id="launch-voice-call-btn"
            onClick={() => setIsVoiceModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#10B981]/25 to-[#CCFF00]/25 hover:from-[#10B981]/35 hover:to-[#CCFF00]/35 border border-[#10B981]/50 text-[#CCFF00] text-xs font-bold transition-all shadow-md shadow-[#10B981]/20 active:scale-95 group"
            title="Start interactive live hands-free voice call with Farhee"
          >
            <Radio className="w-3.5 h-3.5 text-[#CCFF00] group-hover:animate-ping" />
            <PhoneCall className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Voice Call Mode</span>
          </button>

          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg bg-[#141A1E] text-neutral-400 hover:text-red-400 hover:bg-red-950/30 border border-[#202930] transition-colors text-xs flex items-center gap-1"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Messages List Container */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6">
        {messages.map((m) => {
          const isBot = m.role === 'model';
          return (
            <div
              key={m.id}
              className={`flex gap-3 max-w-4xl ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                  isBot
                    ? 'bg-[#10B981]/15 border-[#10B981]/40 text-[#CCFF00]'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-200'
                }`}
              >
                {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              {/* Message Content Bubble */}
              <div className={`space-y-1.5 max-w-[85%] sm:max-w-xl md:max-w-2xl`}>
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    isBot
                      ? 'bg-[#12171B] border border-[#1E272D] text-neutral-100 shadow-lg'
                      : 'bg-gradient-to-tr from-[#0F281E] to-[#123627] border border-[#10B981]/30 text-emerald-50 shadow-md ml-auto'
                  }`}
                >
                  {isBot ? (
                    <div className="markdown-body prose prose-invert max-w-none text-neutral-200 prose-headings:font-display prose-headings:text-white prose-p:my-1.5 prose-pre:bg-[#0B0D0E] prose-pre:border prose-pre:border-[#202B32] prose-code:text-[#CCFF00] prose-code:font-mono prose-a:text-[#10B981] prose-strong:text-white">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  )}
                </div>

                {/* Bubble action bar */}
                <div className={`flex items-center gap-2 px-1 text-[11px] text-neutral-400 ${isBot ? '' : 'justify-end'}`}>
                  <span>{m.timestamp}</span>
                  {isBot && (
                    <>
                      <span>•</span>
                      <button
                        onClick={() => handleCopy(m.content, m.id)}
                        className="hover:text-white flex items-center gap-1 transition-colors"
                        title="Copy message"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="w-3 h-3 text-[#CCFF00]" />
                            <span className="text-[#CCFF00]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                      <span>•</span>
                      <button
                        onClick={() => handleSpeak(m.content, m.id)}
                        className="hover:text-white flex items-center gap-1 transition-colors"
                        title="Read aloud (Text-to-Speech)"
                      >
                        {speakingId === m.id ? (
                          <>
                            <VolumeX className="w-3 h-3 text-red-400 animate-pulse" />
                            <span className="text-red-400">Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3 text-[#10B981]" />
                            <span>Read</span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 mr-auto max-w-xl">
            <div className="w-8 h-8 rounded-xl bg-[#12171B] border border-[#10B981]/40 flex items-center justify-center text-[#CCFF00]">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="p-4 rounded-2xl bg-[#12171B] border border-[#1E272D] flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 rounded-full bg-[#CCFF00] animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-bounce"></span>
              </div>
              <span className="text-xs text-neutral-400 font-mono">Farhee is reasoning...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Carousel */}
      <div className="px-4 lg:px-8 py-2 border-t border-[#182126] bg-[#0E1316]/50 overflow-x-auto flex items-center gap-2 scrollbar-none">
        <span className="text-[11px] font-mono uppercase text-neutral-400 whitespace-nowrap flex items-center gap-1">
          <Zap className="w-3 h-3 text-[#CCFF00]" /> Quick Inquiries:
        </span>
        {QUICK_PROMPTS.map((qp, i) => (
          <button
            key={i}
            onClick={() => handleSend(qp.prompt)}
            className="px-3 py-1 rounded-full bg-[#13191D] border border-[#1F2930] hover:border-[#10B981]/50 text-neutral-300 hover:text-[#CCFF00] text-xs whitespace-nowrap transition-colors"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Input Box with Voice to Text & Send */}
      <div className="p-4 lg:p-6 border-t border-[#1B2328] bg-[#0B0D0E]/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto relative flex items-center">
          <textarea
            id="chat-input-textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              isDictating
                ? "🎙️ Listening... Speak naturally to dictate your message..."
                : "Ask Farhee anything (Code, science, creative ideas, bug fixes)... [Enter to send]"
            }
            rows={2}
            className={`w-full pl-4 pr-24 py-3 bg-[#13181C] border rounded-2xl text-sm text-neutral-100 placeholder:text-neutral-500 resize-none outline-none transition-all shadow-inner ${
              isDictating
                ? 'border-[#CCFF00] ring-2 ring-[#CCFF00]/30 animate-pulse'
                : 'border-[#202B32] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]'
            }`}
          />

          <div className="absolute right-3 flex items-center gap-1.5">
            {/* Voice to Text Dictation Button */}
            <button
              id="voice-to-text-dictation-btn"
              type="button"
              onClick={toggleVoiceToText}
              className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${
                isDictating
                  ? 'bg-red-500 text-white animate-bounce shadow-lg shadow-red-500/40'
                  : 'bg-[#182126] text-neutral-300 hover:text-[#CCFF00] hover:bg-[#202B32]'
              }`}
              title={isDictating ? "Stop voice dictation" : "Voice-to-Text Speech Dictation"}
            >
              {isDictating ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send button */}
            <button
              id="chat-send-btn"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${
                input.trim() && !isLoading
                  ? 'bg-gradient-to-r from-[#10B981] to-[#CCFF00] text-black font-bold shadow-lg shadow-[#10B981]/25 hover:scale-105 active:scale-95'
                  : 'bg-[#1C252B] text-neutral-500 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-center text-[11px] text-neutral-400 mt-2">
          Farhee Intelligent v2.5 • PGV Creation (Batticaloa, Sri Lanka)
        </p>
      </div>

      {/* Full-Screen Interactive Voice Conversation Mode Modal */}
      <VoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSaveTranscriptToChat={handleSaveVoiceTranscript}
      />
    </div>
  );
};
