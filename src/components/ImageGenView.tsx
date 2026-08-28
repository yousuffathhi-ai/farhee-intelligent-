import React, { useState } from 'react';
import { 
  Image as ImageIcon, 
  Sparkles, 
  Download, 
  RefreshCw, 
  Maximize2, 
  Ratio, 
  Palette, 
  Copy, 
  Check, 
  Layers,
  Wand2,
  ExternalLink,
  Dice5
} from 'lucide-react';
import { GeneratedImageItem } from '../types';
import { StorageService } from '../utils/storage';

const STYLES = [
  { id: 'Cinematic', label: 'Cinematic Movie', desc: 'Dramatic lighting, anamorphic lens & 8k depth' },
  { id: 'Cyberpunk', label: 'Cyberpunk & Neon', desc: 'Obsidian black, liquid emerald & neon lime glow' },
  { id: 'Realistic', label: 'Photorealistic', desc: 'Hyper-detailed 35mm photography & natural lighting' },
  { id: 'Anime', label: 'Anime & Manga', desc: 'Studio Ghibli / Makoto Shinkai cel shaded style' },
  { id: '3D Render', label: '3D Octane Render', desc: 'Unreal Engine 5 volumetric shaders & clean geometry' },
  { id: 'DigitalArt', label: 'Digital Concept Art', desc: 'ArtStation trending fantasy concept illustration' },
];

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1 Square', icon: '■', desc: '1024 × 1024' },
  { id: '16:9', label: '16:9 Banner', icon: '▬', desc: '1280 × 720' },
  { id: '9:16', label: '9:16 Story / Reels', icon: '▮', desc: '720 × 1280' },
];

export const ImageGenView: React.FC = () => {
  const [prompt, setPrompt] = useState('Futuristic AI robotic core meditating inside an ancient obsidian temple with glowing emerald vines and neon lime sparks in Batticaloa');
  const [selectedStyle, setSelectedStyle] = useState('Cyberpunk');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [selectedImageModal, setSelectedImageModal] = useState<GeneratedImageItem | null>(null);

  const [gallery, setGallery] = useState<GeneratedImageItem[]>(() => {
    const list = StorageService.getImages();
    if (list.length > 0) return list;
    return [
      {
        id: 'sample-img-1',
        imageUrl: 'https://image.pollinations.ai/prompt/Futuristic%20AI%20robotic%20core%20meditating%20inside%20an%20ancient%20obsidian%20temple%20with%20glowing%20emerald%20vines%20and%20neon%20lime%20sparks,%20cyberpunk%20futuristic,%208k%20resolution?width=1024&height=1024&seed=48291&model=flux&nologo=true',
        originalPrompt: 'Futuristic AI robotic core meditating in ancient obsidian temple with emerald liquid glow',
        enhancedPrompt: 'Futuristic AI robotic core meditating in ancient obsidian temple with glowing emerald vines and neon lime sparks, cyberpunk aesthetic, octane render 8k',
        style: 'Cyberpunk',
        aspectRatio: '1:1',
        seed: 48291,
        width: 1024,
        height: 1024,
        createdAt: 'Just now',
      },
    ];
  });

  const handleGenerateImage = async (customPrompt?: string) => {
    const p = customPrompt || prompt;
    if (!p.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: p,
          style: selectedStyle,
          aspectRatio,
          seed: Math.floor(Math.random() * 1000000),
        }),
      });

      const data = await res.json();
      const newItem: GeneratedImageItem = {
        id: 'img-' + Date.now(),
        imageUrl: data.imageUrl,
        originalPrompt: data.originalPrompt || p,
        enhancedPrompt: data.enhancedPrompt || p,
        style: data.style || selectedStyle,
        aspectRatio: data.aspectRatio || aspectRatio,
        seed: data.seed || 12345,
        width: data.width || 1024,
        height: data.height || 1024,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const updated = [newItem, ...gallery];
      setGallery(updated);
      StorageService.saveImage(newItem);
    } catch (err) {
      console.error(err);
      alert('Failed to generate image. Please check your network.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadHd = async (item: GeneratedImageItem) => {
    try {
      const response = await fetch(item.imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Farhee_AI_${item.style}_${Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      // Fallback direct open
      window.open(item.imageUrl, '_blank');
    }
  };

  return (
    <div id="farhee-image-gen-view" className="flex flex-col h-[calc(100vh-4rem)] bg-[#0B0D0E] overflow-y-auto">
      {/* Control Console */}
      <div className="p-4 lg:p-6 border-b border-[#1A2227] bg-[#0E1317]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto space-y-4">
          {/* Main prompt input */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                id="image-prompt-input"
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateImage()}
                placeholder="Describe your visual concept (e.g. Cyberpunk samurai overlooking emerald city)..."
                className="w-full pl-4 pr-10 py-3.5 bg-[#12171B] border border-[#202B32] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] rounded-2xl text-sm text-neutral-100 placeholder:text-neutral-500 outline-none transition-all shadow-inner"
              />
              <button
                onClick={() => setPrompt('')}
                className="absolute right-3 top-4 text-neutral-500 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <button
              id="generate-image-btn"
              onClick={() => handleGenerateImage()}
              disabled={isLoading || !prompt.trim()}
              className={`px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                isLoading
                  ? 'bg-[#1A2329] text-neutral-500 cursor-wait'
                  : 'bg-gradient-to-r from-[#10B981] via-[#059669] to-[#CCFF00] text-black shadow-lg shadow-[#10B981]/25 hover:opacity-95 active:scale-95'
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>Synthesizing Art...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 text-black" />
                  <span>Generate HD Image</span>
                </>
              )}
            </button>
          </div>

          {/* Options Grid: Styles & Aspect Ratios */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Style Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Palette className="w-3.5 h-3.5 text-[#CCFF00]" /> Art Style Preset:
                </span>
                <span className="text-[11px] text-neutral-400">{selectedStyle}</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {STYLES.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setSelectedStyle(st.id)}
                    className={`p-2 rounded-xl text-center text-xs font-medium border transition-all ${
                      selectedStyle === st.id
                        ? 'bg-[#10B981]/20 border-[#10B981] text-[#CCFF00] shadow-md shadow-[#10B981]/15'
                        : 'bg-[#141A1E] border-[#222C33] text-neutral-400 hover:text-white hover:border-neutral-600'
                    }`}
                  >
                    <div className="font-semibold truncate">{st.label.split(' ')[0]}</div>
                    <div className="text-[9px] text-neutral-400 truncate">{st.id}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Ratio className="w-3.5 h-3.5 text-[#CCFF00]" /> Aspect Ratio & Resolution:
                </span>
                <span className="text-[11px] text-neutral-400">
                  {ASPECT_RATIOS.find(r => r.id === aspectRatio)?.desc}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.id}
                    onClick={() => setAspectRatio(ratio.id)}
                    className={`p-2 rounded-xl text-center text-xs font-medium border flex items-center justify-center gap-2 transition-all ${
                      aspectRatio === ratio.id
                        ? 'bg-[#10B981]/20 border-[#10B981] text-[#CCFF00] shadow-md shadow-[#10B981]/15'
                        : 'bg-[#141A1E] border-[#222C33] text-neutral-400 hover:text-white hover:border-neutral-600'
                    }`}
                  >
                    <span className="text-base">{ratio.icon}</span>
                    <div className="text-left">
                      <div className="font-semibold text-[11px]">{ratio.label}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="flex-1 p-4 lg:p-6 max-w-6xl w-full mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#CCFF00]" />
            Generated Creations Gallery ({gallery.length})
          </h3>
          <span className="text-[11px] text-neutral-400 font-mono">
            Powered by Farhee Prompt Enhancer & Flux
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gallery.map((img) => (
            <div
              key={img.id}
              className="group rounded-2xl bg-[#0E1317] border border-[#1E272D] overflow-hidden hover:border-[#10B981]/50 transition-all shadow-xl flex flex-col"
            >
              <div className="relative overflow-hidden bg-[#07090A] aspect-square flex items-center justify-center">
                <img
                  src={img.imageUrl}
                  alt={img.originalPrompt}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />

                {/* Hover overlay actions */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 text-[#CCFF00] border border-[#CCFF00]/30 backdrop-blur-md">
                    {img.style} • {img.aspectRatio}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedImageModal(img)}
                      className="p-2 rounded-xl bg-black/60 backdrop-blur-md text-white hover:text-[#CCFF00] border border-white/20"
                      title="Inspect & Zoom"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDownloadHd(img)}
                      className="p-2 rounded-xl bg-[#10B981] text-black font-bold hover:bg-[#CCFF00] transition-colors"
                      title="Download 1-Click HD"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                <p className="text-xs text-neutral-200 line-clamp-2 leading-relaxed">
                  {img.originalPrompt}
                </p>
                <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono pt-2 border-t border-[#182126]">
                  <span>Seed: #{img.seed}</span>
                  <span>{img.createdAt}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fullscreen Image Preview Modal */}
      {selectedImageModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-[#0E1317] border border-[#1E272D] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[#1E272D] flex items-center justify-between bg-[#13191D]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#CCFF00] px-2 py-0.5 rounded bg-[#10B981]/20 border border-[#10B981]/30">
                  {selectedImageModal.style}
                </span>
                <span className="text-xs text-neutral-300 truncate max-w-md">
                  {selectedImageModal.originalPrompt}
                </span>
              </div>
              <button
                onClick={() => setSelectedImageModal(null)}
                className="p-1.5 rounded-lg bg-[#1C252B] text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[#07090A]">
              <img
                src={selectedImageModal.imageUrl}
                alt="Enlarged preview"
                referrerPolicy="no-referrer"
                className="max-h-[60vh] object-contain rounded-xl border border-[#1E272D]"
              />
            </div>

            <div className="p-4 bg-[#13191D] border-t border-[#1E272D] flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-neutral-400 max-w-lg">
                <span className="text-emerald-400 font-mono">Enhanced AI Prompt:</span> {selectedImageModal.enhancedPrompt}
              </div>
              <button
                onClick={() => handleDownloadHd(selectedImageModal)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#10B981] to-[#CCFF00] text-black font-bold text-xs flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download HD Image</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
