import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  PhoneOff, 
  Sparkles, 
  RefreshCw, 
  Radio, 
  Sliders, 
  Globe, 
  Send,
  MessageSquare,
  Zap,
  Play,
  Pause
} from 'lucide-react';
import { SpeechService, getSpeechRecognition } from '../utils/speech';
import { ChatMessage } from '../types';
import { safeApiPost, formatHttpStatus } from '../utils/api';
import { generateVoiceReplyDirect } from '../services/ai';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTranscriptToChat: (messages: ChatMessage[]) => void;
}

type ConversationState = 'idle' | 'listening' | 'processing' | 'speaking';

export const VoiceModal: React.FC<VoiceModalProps> = ({
  isOpen,
  onClose,
  onSaveTranscriptToChat,
}) => {
  const [convState, setConvState] = useState<ConversationState>('idle');
  const [transcriptHistory, setTranscriptHistory] = useState<{ role: 'user' | 'model'; text: string; time: string }[]>([
    {
      role: 'model',
      text: 'Hello! I am Farhee Voice Agent. How can I assist you today?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [currentLiveText, setCurrentLiveText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.05);
  const [language, setLanguage] = useState('en-US');
  const [autoHandsFree, setAutoHandsFree] = useState(true);
  const [audioLevel, setAudioLevel] = useState(20);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const convStateRef = useRef<ConversationState>('idle');
  const autoHandsFreeRef = useRef(autoHandsFree);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Keep refs updated
  useEffect(() => {
    convStateRef.current = convState;
    autoHandsFreeRef.current = autoHandsFree;
  }, [convState, autoHandsFree]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptHistory, currentLiveText]);

  // Audio level animation effect when speaking or listening
  useEffect(() => {
    let interval: any;
    if (convState === 'listening' || convState === 'speaking') {
      interval = setInterval(() => {
        setAudioLevel(Math.floor(Math.random() * 55) + 35);
      }, 120);
    } else {
      setAudioLevel(15);
    }
    return () => clearInterval(interval);
  }, [convState]);

  // Initialize and teardown Voice Recognition
  useEffect(() => {
    if (!isOpen) {
      cleanupVoice();
      return;
    }

    // Greet user on opening if initial
    if (transcriptHistory.length === 1 && convState === 'idle') {
      speakBotReply('Hello! I am Farhee Voice Agent. How can I assist you today?');
    }

    return () => {
      cleanupVoice();
    };
  }, [isOpen]);

  const cleanupVoice = () => {
    SpeechService.stopSpeaking();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    isListeningRef.current = false;
    setConvState('idle');
  };

  const startListening = () => {
    if (isMuted) return;
    SpeechService.stopSpeaking();

    const recognition = getSpeechRecognition();
    if (!recognition) {
      console.warn('Speech Recognition not supported in this browser environment.');
      return;
    }

    try {
      recognition.lang = language;
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        isListeningRef.current = true;
        setConvState('listening');
        setCurrentLiveText('');
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const activeText = finalTranscript || interimTranscript;
        setCurrentLiveText(activeText);

        if (finalTranscript) {
          handleUserSpeechFinished(finalTranscript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Recognition error:', event.error);
        if (event.error !== 'no-speech') {
          isListeningRef.current = false;
          setConvState('idle');
        }
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        // If we finished without final speech and still in listening mode
        if (convStateRef.current === 'listening') {
          if (currentLiveText.trim()) {
            handleUserSpeechFinished(currentLiveText.trim());
          } else {
            setConvState('idle');
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      setConvState('idle');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    isListeningRef.current = false;
  };

  const handleUserSpeechFinished = async (spokenText: string) => {
    if (!spokenText.trim()) {
      setConvState('idle');
      return;
    }

    stopListening();
    setConvState('processing');
    setCurrentLiveText('');

    const newHistory = [
      ...transcriptHistory,
      {
        role: 'user' as const,
        text: spokenText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    setTranscriptHistory(newHistory);

    try {
      const reply = await generateVoiceReplyDirect(
        newHistory.map((h) => ({ role: h.role, content: h.text })),
        spokenText
      );

      setTranscriptHistory([
        ...newHistory,
        {
          role: 'model' as const,
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      speakBotReply(reply);
    } catch (err: any) {
      console.error('[Farhee Voice Error]:', err);
      const fallback = "I'm with you. How can I help you next?";
      setTranscriptHistory([
        ...newHistory,
        {
          role: 'model' as const,
          text: fallback,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      speakBotReply(fallback);
    }
  };

  const speakBotReply = (text: string) => {
    setConvState('speaking');
    SpeechService.speakText(text, {
      rate: speechRate,
      onEnd: () => {
        setConvState('idle');
        // Auto continuous conversation loop
        if (autoHandsFreeRef.current && isOpen && !isMuted) {
          setTimeout(() => {
            if (isOpen && !isMuted) {
              startListening();
            }
          }, 450);
        }
      },
      onError: () => {
        setConvState('idle');
      },
    });
  };

  const handleInterrupt = () => {
    SpeechService.stopSpeaking();
    stopListening();
    setConvState('idle');
  };

  const handleEndCall = () => {
    cleanupVoice();

    // Convert transcript to chat messages format and pass to parent
    const chatMessages: ChatMessage[] = transcriptHistory.map((item, idx) => ({
      id: `voice-${Date.now()}-${idx}`,
      role: item.role,
      content: item.text,
      timestamp: item.time,
    }));

    if (chatMessages.length > 1) {
      onSaveTranscriptToChat(chatMessages);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      id="farhee-voice-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-fade-in"
    >
      <div className="w-full max-w-xl h-[85vh] max-h-[700px] bg-[#0A0D0F] border border-[#1F2930] rounded-3xl flex flex-col justify-between overflow-hidden shadow-2xl relative">
        {/* Top Bar */}
        <div className="p-4 border-b border-[#182126] bg-[#0E1317] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#10B981] to-[#CCFF00] p-0.5 flex items-center justify-center shadow-md shadow-[#10B981]/20">
              <div className="w-full h-full bg-[#0A0D0F] rounded-[10px] flex items-center justify-center">
                <Radio className="w-4 h-4 text-[#CCFF00] animate-pulse" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-display flex items-center gap-1.5">
                Farhee Live Voice Agent
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#CCFF00] border border-[#10B981]/30">
                  Hands-Free Call
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400 font-mono">
                PGV Creation • Batticaloa, Sri Lanka
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto hands-free toggle */}
            <button
              onClick={() => setAutoHandsFree(!autoHandsFree)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-medium border flex items-center gap-1.5 transition-all ${
                autoHandsFree
                  ? 'bg-[#10B981]/20 border-[#10B981]/60 text-[#CCFF00]'
                  : 'bg-[#141A1E] border-[#222C33] text-neutral-400'
              }`}
              title="Continuous Hands-Free Conversation Mode"
            >
              <Zap className="w-3 h-3 text-[#CCFF00]" />
              <span className="hidden sm:inline">Auto Loop:</span> {autoHandsFree ? 'ON' : 'OFF'}
            </button>

            {/* Close / Hang up */}
            <button
              onClick={handleEndCall}
              className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 transition-colors"
              title="End Voice Call and Save Transcript"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Central Dynamic AI Voice Orb Stage */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 relative overflow-hidden">
          {/* Ambient Glow behind Orb */}
          <div
            className={`absolute w-72 h-72 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
              convState === 'listening'
                ? 'bg-[#CCFF00]/15 scale-125'
                : convState === 'speaking'
                ? 'bg-[#10B981]/25 scale-150'
                : convState === 'processing'
                ? 'bg-amber-400/15 scale-110'
                : 'bg-emerald-950/20 scale-90'
            }`}
          />

          {/* Interactive Voice Orb Visualizer */}
          <div className="relative flex items-center justify-center">
            {/* Pulsing Ripple Rings */}
            {(convState === 'listening' || convState === 'speaking') && (
              <>
                <div
                  className="absolute w-44 h-44 rounded-full border border-[#10B981]/40 animate-ping"
                  style={{ animationDuration: '2.4s' }}
                />
                <div
                  className="absolute w-56 h-56 rounded-full border border-[#CCFF00]/30 animate-ping"
                  style={{ animationDuration: '3.2s' }}
                />
              </>
            )}

            {/* Core Orb */}
            <button
              onClick={() => {
                if (convState === 'speaking') {
                  handleInterrupt();
                } else if (convState === 'listening') {
                  stopListening();
                } else {
                  startListening();
                }
              }}
              className={`w-36 h-36 rounded-full flex flex-col items-center justify-center relative z-10 transition-all duration-300 shadow-2xl border-2 ${
                convState === 'listening'
                  ? 'bg-gradient-to-tr from-[#122616] to-[#203612] border-[#CCFF00] shadow-[#CCFF00]/30 scale-105'
                  : convState === 'speaking'
                  ? 'bg-gradient-to-tr from-[#0D241C] via-[#053D2C] to-[#10B981] border-[#10B981] shadow-[#10B981]/40 scale-110'
                  : convState === 'processing'
                  ? 'bg-[#1F2212] border-amber-400 shadow-amber-400/20 animate-pulse'
                  : 'bg-[#12181C] border-[#223038] hover:border-[#10B981] hover:scale-105'
              }`}
            >
              {convState === 'listening' ? (
                <>
                  <Mic className="w-10 h-10 text-[#CCFF00] animate-bounce" />
                  <span className="text-[11px] font-mono text-[#CCFF00] font-bold mt-1">
                    Listening...
                  </span>
                </>
              ) : convState === 'speaking' ? (
                <>
                  <Volume2 className="w-10 h-10 text-white animate-pulse" />
                  <span className="text-[11px] font-mono text-emerald-300 font-bold mt-1">
                    Farhee Speaking
                  </span>
                </>
              ) : convState === 'processing' ? (
                <>
                  <RefreshCw className="w-9 h-9 text-amber-300 animate-spin" />
                  <span className="text-[11px] font-mono text-amber-300 font-bold mt-1">
                    Thinking...
                  </span>
                </>
              ) : (
                <>
                  <Mic className="w-10 h-10 text-neutral-400 group-hover:text-white" />
                  <span className="text-[11px] font-mono text-neutral-300 font-semibold mt-1">
                    Tap to Speak
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Sound Wave Spectrum simulation */}
          <div className="flex items-center gap-1.5 h-10 px-4">
            {Array.from({ length: 18 }).map((_, i) => {
              const active = convState === 'listening' || convState === 'speaking';
              const height = active ? Math.max(8, (audioLevel * ((i % 4) + 1)) / 4) : 4;
              return (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    convState === 'listening'
                      ? 'bg-[#CCFF00]'
                      : convState === 'speaking'
                      ? 'bg-[#10B981]'
                      : 'bg-neutral-800'
                  }`}
                  style={{ height: `${height}px` }}
                />
              );
            })}
          </div>

          {/* Live Subtitle / Spoken text display */}
          <div className="w-full max-w-md min-h-[52px] p-3 rounded-2xl bg-[#0E1317]/90 border border-[#1E272D] text-center flex items-center justify-center">
            {currentLiveText ? (
              <p className="text-xs text-[#CCFF00] font-medium italic animate-pulse">
                "{currentLiveText}"
              </p>
            ) : convState === 'speaking' ? (
              <p className="text-xs text-neutral-200 line-clamp-2 leading-relaxed">
                {transcriptHistory[transcriptHistory.length - 1]?.text}
              </p>
            ) : convState === 'listening' ? (
              <p className="text-xs text-neutral-400 font-mono flex items-center gap-1.5 justify-center">
                <span className="w-2 h-2 rounded-full bg-[#CCFF00] animate-ping" />
                Listening to your microphone...
              </p>
            ) : (
              <p className="text-xs text-neutral-500 font-mono">
                Tap the orb or speak freely to start conversation
              </p>
            )}
          </div>
        </div>

        {/* Live Conversation Transcript Drawer (Collapsible/Scrollable) */}
        <div className="h-32 border-t border-[#182126] bg-[#0B0E11] p-3 overflow-y-auto space-y-2">
          <div className="text-[10px] font-mono text-neutral-400 uppercase font-bold flex items-center gap-1">
            <MessageSquare className="w-3 h-3 text-[#10B981]" /> Live Transcript:
          </div>
          {transcriptHistory.map((item, idx) => (
            <div
              key={idx}
              className={`text-xs p-2 rounded-xl border leading-relaxed ${
                item.role === 'user'
                  ? 'bg-[#121A16] border-[#10B981]/30 text-emerald-200 ml-6'
                  : 'bg-[#14181C] border-[#202930] text-neutral-200 mr-6'
              }`}
            >
              <div className="flex items-center justify-between text-[9px] font-mono text-neutral-400 mb-0.5">
                <span className="font-bold">{item.role === 'user' ? 'You' : 'Farhee Voice'}</span>
                <span>{item.time}</span>
              </div>
              <p>{item.text}</p>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>

        {/* Bottom Call Controls Bar */}
        <div className="p-4 border-t border-[#182126] bg-[#0E1317] flex items-center justify-between gap-3">
          {/* Mute Mic toggle */}
          <button
            onClick={() => {
              setIsMuted(!isMuted);
              if (!isMuted) stopListening();
            }}
            className={`p-3 rounded-2xl border transition-all ${
              isMuted
                ? 'bg-red-500/20 border-red-500/40 text-red-300'
                : 'bg-[#141A1E] border-[#222C33] text-neutral-300 hover:text-white'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5 text-red-400" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Center Action: Start/Stop toggle or Interrupt */}
          <div className="flex items-center gap-2 flex-1 justify-center">
            {convState === 'speaking' ? (
              <button
                onClick={handleInterrupt}
                className="px-5 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
              >
                <Pause className="w-4 h-4 text-amber-400" />
                <span>Interrupt & Speak</span>
              </button>
            ) : convState === 'listening' ? (
              <button
                onClick={stopListening}
                className="px-5 py-2.5 rounded-2xl bg-[#CCFF00]/20 hover:bg-[#CCFF00]/30 border border-[#CCFF00]/40 text-[#CCFF00] text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
              >
                <Send className="w-4 h-4 text-[#CCFF00]" />
                <span>Done Speaking</span>
              </button>
            ) : (
              <button
                onClick={startListening}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#CCFF00] text-black text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-[#10B981]/25 hover:opacity-95 active:scale-95"
              >
                <Mic className="w-4 h-4 text-black" />
                <span>Speak to Farhee</span>
              </button>
            )}
          </div>

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            className="px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-red-600/30 active:scale-95"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="hidden sm:inline">End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};
