import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Smartphone, 
  Sparkles, 
  X, 
  Share, 
  PlusSquare, 
  ShieldCheck,
  CheckCircle,
  Zap
} from 'lucide-react';

interface PWAInstallBannerProps {
  onInstallClicked: () => void;
  deferredPrompt: any;
  isOpenExplicitly?: boolean;
  onCloseExplicit?: () => void;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  onInstallClicked,
  deferredPrompt,
  isOpenExplicitly = false,
  onCloseExplicit,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsStandalone(true);
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);
  }, []);

  if (isStandalone && !isOpenExplicitly) return null;
  if (isDismissed && !isOpenExplicitly) return null;

  return (
    <div
      id="farhee-pwa-install-banner"
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="p-4 rounded-2xl bg-[#0E1317]/95 backdrop-blur-2xl border border-[#10B981]/50 shadow-2xl shadow-[#10B981]/20 space-y-3 relative overflow-hidden">
        {/* Glow corner */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#10B981]/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#10B981] to-[#CCFF00] p-0.5 flex items-center justify-center shadow-lg shadow-[#10B981]/30">
              <div className="w-full h-full bg-[#0B0D0E] rounded-[10px] flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-[#CCFF00]" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5 font-display">
                Install Farhee PWA App
                <Sparkles className="w-3.5 h-3.5 text-[#CCFF00]" />
              </h4>
              <p className="text-[11px] text-emerald-300">Fast offline access & native experience</p>
            </div>
          </div>

          <button
            onClick={() => {
              setIsDismissed(true);
              if (onCloseExplicit) onCloseExplicit();
            }}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1A2227] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Benefits bullets */}
        <div className="grid grid-cols-2 gap-1.5 text-[11px] text-neutral-300 pt-1">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3 h-3 text-[#10B981]" />
            <span>Instant launch</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3 h-3 text-[#CCFF00]" />
            <span>Offline support</span>
          </div>
        </div>

        {/* iOS instructions vs Android/Web button */}
        {isIOS ? (
          <div className="p-2.5 rounded-xl bg-[#141A1E] border border-[#222C33] text-[11px] text-neutral-300 space-y-1">
            <p className="font-semibold text-emerald-400">iOS Installation Guide:</p>
            <ol className="list-decimal pl-4 space-y-0.5 text-neutral-300">
              <li className="flex items-center gap-1">
                Tap Safari's <Share className="w-3 h-3 text-blue-400 inline mx-0.5" /> <strong>Share</strong> icon below
              </li>
              <li className="flex items-center gap-1">
                Scroll and tap <PlusSquare className="w-3 h-3 text-[#CCFF00] inline mx-0.5" /> <strong>Add to Home Screen</strong>
              </li>
            </ol>
          </div>
        ) : (
          <button
            id="install-pwa-action-btn"
            onClick={onInstallClicked}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#10B981] via-[#059669] to-[#CCFF00] text-black font-bold text-xs flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-lg shadow-[#10B981]/20 active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>Install on this Device</span>
          </button>
        )}
      </div>
    </div>
  );
};
