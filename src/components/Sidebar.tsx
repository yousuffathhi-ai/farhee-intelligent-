import React from 'react';
import { 
  MessageSquareCode, 
  Presentation,
  Code, 
  Bug, 
  Image as ImageIcon, 
  Music, 
  History, 
  Zap, 
  Download, 
  Smartphone,
  ChevronRight,
  Sparkles,
  Bot
} from 'lucide-react';
import { NavTab } from '../types';
import { BrandBadge } from './BrandBadge';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onTriggerInstall?: () => void;
  onLaunchVoiceCall?: () => void;
  canInstallPWA?: boolean;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onTriggerInstall,
  onLaunchVoiceCall,
  canInstallPWA = false,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'chat' as NavTab,
      label: 'AI Chatbot',
      subtitle: 'Multi-turn reasoning & LaTeX',
      icon: MessageSquareCode,
      tag: 'Pro',
      color: 'text-[#10B981]',
      activeBg: 'bg-[#10B981]/15 border-[#10B981]/40 text-[#CCFF00]',
    },
    {
      id: 'presentation' as NavTab,
      label: 'Presentation Maker',
      subtitle: 'PPTX • PDF • Excel • Word',
      icon: Presentation,
      tag: 'Export Hub',
      color: 'text-[#CCFF00]',
      activeBg: 'bg-[#10B981]/20 border-[#10B981]/50 text-[#CCFF00]',
    },
    {
      id: 'code' as NavTab,
      label: 'AI Code Gen',
      subtitle: 'Multi-lang + Live Preview',
      icon: Code,
      tag: 'Runner',
      color: 'text-emerald-400',
      activeBg: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300',
    },
    {
      id: 'bugfix' as NavTab,
      label: 'Bug Reporter & Fixer',
      subtitle: 'Root cause + Code diff',
      icon: Bug,
      tag: 'Fixer',
      color: 'text-amber-400',
      activeBg: 'bg-amber-500/10 border-amber-500/40 text-amber-300',
    },
    {
      id: 'image' as NavTab,
      label: 'AI Image Generator',
      subtitle: 'Styles, Aspect ratios & HD',
      icon: ImageIcon,
      tag: 'Flux HD',
      color: 'text-cyan-400',
      activeBg: 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300',
    },
    {
      id: 'music' as NavTab,
      label: 'Music & Audio Synth',
      subtitle: 'Procedural beats & WAV export',
      icon: Music,
      tag: 'Synth',
      color: 'text-teal-400',
      activeBg: 'bg-teal-500/10 border-teal-500/40 text-teal-300',
    },
    {
      id: 'history' as NavTab,
      label: 'Vault & Cloud History',
      subtitle: 'Saved chats, decks & media',
      icon: History,
      tag: 'Cloud Sync',
      color: 'text-neutral-400',
      activeBg: 'bg-neutral-800/80 border-neutral-600 text-neutral-100',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        id="farhee-main-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#0B0D0E]/95 backdrop-blur-2xl border-r border-[#1B2328] flex flex-col justify-between transition-transform duration-300 lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* App Logo & Header */}
        <div className="p-4 border-b border-[#1A2227]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-[#10B981] via-[#059669] to-[#CCFF00] p-0.5 shadow-lg shadow-[#10B981]/20">
                <div className="w-full h-full bg-[#0B0D0E] rounded-[10px] flex items-center justify-center">
                  <Bot className="w-5 h-5 text-[#CCFF00]" />
                </div>
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#CCFF00] rounded-full border-2 border-[#0B0D0E] animate-pulse" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5 font-display">
                  Farhee <span className="text-[#CCFF00]">Intelligent</span>
                </h1>
                <p className="text-[11px] text-neutral-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                  Gemini 3.7 + Firestore
                </p>
              </div>
            </div>

            {/* Mobile close */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-neutral-400 hover:text-white rounded-lg bg-[#141A1E]"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
            Core Modules
          </div>

          {/* Quick Voice Mode Button */}
          {onLaunchVoiceCall && (
            <button
              id="sidebar-launch-voice-call"
              onClick={() => {
                onLaunchVoiceCall();
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[#10B981]/40 bg-gradient-to-r from-[#10B981]/20 via-[#0A2E20] to-[#122818] text-white hover:border-[#CCFF00] transition-all shadow-md shadow-[#10B981]/20 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#0E1513] border border-[#10B981]/60 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-[#CCFF00] group-hover:animate-bounce" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-white flex items-center gap-1.5 font-display">
                    Voice Call Mode
                    <span className="w-2 h-2 rounded-full bg-[#CCFF00] animate-ping" />
                  </div>
                  <div className="text-[10px] text-emerald-300 font-mono">
                    Hands-free live conversation
                  </div>
                </div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-mono font-bold bg-[#CCFF00] text-black shadow-sm">
                LIVE
              </span>
            </button>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                onClick={() => {
                  onSelectTab(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all group ${
                  isActive
                    ? `${item.activeBg} shadow-md`
                    : 'border-transparent text-neutral-300 hover:bg-[#13191D] hover:border-[#1E272D] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      isActive ? 'bg-black/30' : 'bg-[#12171A] group-hover:bg-[#182024]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#CCFF00]' : item.color}`} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold tracking-tight">{item.label}</div>
                    <div className="text-[11px] text-neutral-400 group-hover:text-neutral-400 transition-colors">
                      {item.subtitle}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-medium ${
                      isActive
                        ? 'bg-black/40 text-[#CCFF00] border border-[#CCFF00]/30'
                        : 'bg-[#182025] text-neutral-400 border border-[#242F36]'
                    }`}
                  >
                    {item.tag}
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isActive ? 'text-[#CCFF00] translate-x-0.5' : 'text-neutral-600'}`} />
                </div>
              </button>
            );
          })}

          {/* Quick PWA App install button if available */}
          <div className="pt-3">
            <button
              id="sidebar-pwa-install-btn"
              onClick={onTriggerInstall}
              className="w-full p-3 rounded-xl bg-gradient-to-r from-[#10B981]/20 via-[#059669]/10 to-[#CCFF00]/10 border border-[#10B981]/40 text-left hover:border-[#CCFF00]/60 transition-all group relative overflow-hidden"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#10B981]/20 border border-[#10B981]/50 flex items-center justify-center text-[#CCFF00]">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-white flex items-center gap-1 group-hover:text-[#CCFF00]">
                    Install Farhee PWA
                    <Sparkles className="w-3 h-3 text-[#CCFF00]" />
                  </div>
                  <div className="text-[10px] text-emerald-300/80">
                    Offline & Instant Launcher
                  </div>
                </div>
                <Download className="w-4 h-4 text-[#10B981] group-hover:translate-y-0.5 transition-transform" />
              </div>
            </button>
          </div>
        </div>

        {/* Footer with PGV Creation Branding */}
        <div className="p-3 border-t border-[#1A2227] bg-[#090B0C]">
          <BrandBadge />
        </div>
      </aside>
    </>
  );
};
