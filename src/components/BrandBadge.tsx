import React from 'react';
import { Sparkles, MapPin, Code2, Heart } from 'lucide-react';

export const BrandBadge: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  if (compact) {
    return (
      <div id="pgv-brand-compact" className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium">
        <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
        <span>PGV Creation</span>
        <span className="text-neutral-600">•</span>
        <span className="text-neutral-500">Batticaloa, LK</span>
      </div>
    );
  }

  return (
    <div id="pgv-brand-card" className="p-3 rounded-xl bg-[#0E1215]/80 border border-[#1A2227] hover:border-[#10B981]/40 transition-colors group">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#10B981]/20 to-[#CCFF00]/10 border border-[#10B981]/30 flex items-center justify-center text-[#CCFF00]">
            <Code2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-neutral-200 group-hover:text-[#CCFF00] transition-colors flex items-center gap-1">
              PGV Creation
              <Sparkles className="w-3 h-3 text-[#10B981]" />
            </div>
            <div className="text-[11px] text-neutral-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#10B981]" />
              Batticaloa, Sri Lanka
            </div>
          </div>
        </div>
        <div className="text-[10px] px-2 py-0.5 rounded-full bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 font-mono">
          v2.5 PWA
        </div>
      </div>
    </div>
  );
};
