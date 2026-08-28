import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  Sparkles, 
  Wifi, 
  WifiOff, 
  Smartphone, 
  Cpu, 
  ShieldCheck, 
  Share2,
  Check,
  LogIn,
  LogOut,
  User as UserIcon,
  Cloud,
  CloudCheck
} from 'lucide-react';
import { NavTab } from '../types';
import { auth, signInWithGoogle, logOut } from '../utils/firebase';
import { User } from 'firebase/auth';

interface HeaderProps {
  currentTab: NavTab;
  onOpenMobileMenu: () => void;
  onTriggerInstall?: () => void;
  onLaunchVoiceCall?: () => void;
  canInstall?: boolean;
}

const TAB_TITLES: Record<NavTab, { title: string; subtitle: string; badge: string }> = {
  chat: {
    title: 'Farhee AI Chatbot',
    subtitle: 'Multi-turn reasoning, LaTeX equations & Markdown',
    badge: 'Gemini 3.7 Flash',
  },
  presentation: {
    title: 'Presentation & Document Architect',
    subtitle: 'PowerPoint .pptx, PDF, Excel & Word Docx Export',
    badge: 'Export Hub',
  },
  code: {
    title: 'AI Code Generator & Sandbox',
    subtitle: 'Multi-language synthesis + Live HTML/JS Runner',
    badge: 'Code Engine',
  },
  bugfix: {
    title: 'AI Bug Reporter & Fixer',
    subtitle: 'Instant stack trace diagnosis, cause & prevention tips',
    badge: 'Auto-Debugger',
  },
  image: {
    title: 'AI Image Generator',
    subtitle: 'Prompt enhancement, styles & HD aspect ratios',
    badge: 'Flux Studio',
  },
  music: {
    title: 'AI Music & Audio Synthesizer',
    subtitle: 'Text-to-Music blueprints, Web Audio synth & WAV export',
    badge: 'AudioCraft Core',
  },
  history: {
    title: 'Creations Vault & Cloud Sync',
    subtitle: 'Stored chats, presentations, code snippets & tracks',
    badge: 'Firestore Sync',
  },
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenMobileMenu,
  onTriggerInstall,
  onLaunchVoiceCall,
  canInstall = false,
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [copiedLink, setCopiedLink] = useState(false);
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsub();
    };
  }, []);

  const handleGoogleAuth = async () => {
    if (user) {
      await logOut();
    } else {
      setIsSigningIn(true);
      try {
        await signInWithGoogle();
      } catch (err: any) {
        console.error(err);
        alert(err?.message || 'Google sign-in was cancelled or encountered an error.');
      } finally {
        setIsSigningIn(false);
      }
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Farhee Intelligent - AI PWA & Presentation Maker',
          text: 'Check out Farhee Intelligent AI Chatbot, PowerPoint Generator & Multi-Format Exporter by PGV Creation!',
          url: window.location.href,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const info = TAB_TITLES[currentTab] || TAB_TITLES.chat;

  return (
    <header id="farhee-top-header" className="h-16 border-b border-[#1B2328] bg-[#0B0D0E]/80 backdrop-blur-xl px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          id="mobile-menu-toggle-btn"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl bg-[#13191D] border border-[#1E262B] text-neutral-300 hover:text-white"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base lg:text-lg font-bold text-white font-display tracking-tight flex items-center gap-2">
              {info.title}
            </h2>
            <span className="hidden sm:inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#CCFF00] border border-[#10B981]/30">
              {info.badge}
            </span>
          </div>
          <p className="text-xs text-neutral-400 hidden sm:block truncate max-w-md">
            {info.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Network State Badge */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border ${
            isOnline
              ? 'bg-[#0E2017] text-emerald-300 border-[#10B981]/30'
              : 'bg-amber-950/40 text-amber-300 border-amber-500/30'
          }`}
          title={isOnline ? 'Online (Connected to Gemini API & Firestore)' : 'Offline (Cached PWA mode)'}
        >
          {isOnline ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
              <Wifi className="w-3 h-3 text-[#10B981]" />
              <span className="hidden md:inline">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-amber-400" />
              <span>Offline PWA</span>
            </>
          )}
        </div>

        {/* Voice Call Mode Button */}
        {onLaunchVoiceCall && (
          <button
            id="header-launch-voice-call"
            onClick={onLaunchVoiceCall}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#10B981]/20 hover:bg-[#10B981]/30 border border-[#10B981]/50 text-[#CCFF00] text-xs font-bold transition-all shadow-md shadow-[#10B981]/15 group"
            title="Start live hands-free voice call with Farhee"
          >
            <span className="w-2 h-2 rounded-full bg-[#CCFF00] animate-pulse" />
            <span className="hidden sm:inline">Voice Call</span>
          </button>
        )}

        {/* Google Authentication Button */}
        <button
          id="google-auth-btn"
          onClick={handleGoogleAuth}
          disabled={isSigningIn}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
            user
              ? 'bg-[#141A1E] border-[#222C33] text-neutral-200 hover:border-red-500/40 hover:text-red-300'
              : 'bg-gradient-to-r from-[#10B981]/20 to-[#CCFF00]/20 border-[#10B981]/50 text-[#CCFF00] hover:opacity-90 shadow-md shadow-[#10B981]/15'
          }`}
          title={user ? `Signed in as ${user.email} (Click to Sign Out)` : 'Sign in with Google to sync chats across devices'}
        >
          {user ? (
            <>
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-4 h-4 rounded-full border border-[#10B981]"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <UserIcon className="w-3.5 h-3.5 text-[#10B981]" />
              )}
              <span className="hidden md:inline max-w-[90px] truncate">
                {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
              </span>
              <LogOut className="w-3 h-3 text-neutral-500 hover:text-red-400 ml-0.5" />
            </>
          ) : (
            <>
              <LogIn className="w-3.5 h-3.5 text-[#CCFF00]" />
              <span className="hidden sm:inline">
                {isSigningIn ? 'Signing In...' : 'Google Sign-In'}
              </span>
            </>
          )}
        </button>

        {/* Share Button */}
        <button
          onClick={handleShare}
          id="header-share-btn"
          className="p-2 rounded-xl bg-[#13191D] border border-[#1E262B] text-neutral-300 hover:text-white hover:border-[#10B981]/40 transition-colors"
          title="Share Farhee Intelligent"
        >
          {copiedLink ? <Check className="w-4 h-4 text-[#CCFF00]" /> : <Share2 className="w-4 h-4" />}
        </button>

        {/* PWA Install Button in Header */}
        <button
          onClick={onTriggerInstall}
          id="header-install-pwa-btn"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#10B981]/15 hover:bg-[#10B981]/25 border border-[#10B981]/40 text-[#CCFF00] text-xs font-semibold transition-all group"
          title="Install as Android / Desktop PWA Application"
        >
          <Smartphone className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">Install App</span>
        </button>
      </div>
    </header>
  );
};
