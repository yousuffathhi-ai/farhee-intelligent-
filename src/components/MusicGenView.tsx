import React, { useState, useEffect, useRef } from 'react';
import { 
  Music, 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  Sparkles, 
  RefreshCw, 
  Volume2, 
  Sliders, 
  Radio, 
  Disc, 
  Layers,
  Activity,
  Mic2,
  FileMusic,
  Share2
} from 'lucide-react';
import { GeneratedMusicTrack } from '../types';
import { globalAudioEngine } from '../utils/audioSynth';
import { StorageService } from '../utils/storage';

const GENRES = [
  { id: 'Cyberpunk Beats', label: 'Cyberpunk Beats', bpm: 128, icon: '⚡', desc: 'Heavy sub-saw, acid bassline & neon arpeggios' },
  { id: 'Lo-Fi Chill', label: 'Lo-Fi Chillhop', bpm: 84, icon: '☕', desc: 'Warm sine chords, vinyl dust & laidback break' },
  { id: 'Cinematic Ambient', label: 'Cinematic Ambient', bpm: 90, icon: '🌌', desc: 'Ethereal pads, spacious reverb & evolving tone' },
  { id: 'Synthwave 80s', label: '80s Synthwave', bpm: 120, icon: '🌆', desc: 'Retro gated snares, pulsing bass & neon lead' },
  { id: 'Epic Orchestral', label: 'Epic Orchestral', bpm: 135, icon: '⚔️', desc: 'Driving rhythms, dramatic builds & brass swells' },
  { id: '8-Bit Chiptune', label: '8-Bit Chiptune', bpm: 140, icon: '👾', desc: 'Square wave arpeggios & retro arcade gaming vibe' },
];

export const MusicGenView: React.FC = () => {
  const [prompt, setPrompt] = useState('Epic futuristic cyber anthem with pulsating sub-bass, neon synth leads and cinematic Batticaloa night vibe');
  const [selectedGenre, setSelectedGenre] = useState('Cyberpunk Beats');
  const [tempo, setTempo] = useState(128);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBuffer, setCurrentBuffer] = useState<AudioBuffer | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  const [currentTrack, setCurrentTrack] = useState<GeneratedMusicTrack | null>(() => {
    const list = StorageService.getMusicTracks();
    if (list.length > 0) return list[0];
    return {
      id: 'default-track-1',
      title: 'Farhee Emerald Cyber Symphony',
      genre: 'Cyberpunk Beats',
      bpm: 128,
      key: 'C Minor',
      mood: 'Atmospheric, High Voltage & Futuristic',
      structure: ['Intro (0:00)', 'Pulse Wave (0:06)', 'Neon Drop (0:12)', 'Outro (0:20)'],
      synthBlueprint: {
        bassType: 'sub-saw',
        leadType: 'neon-supersaw',
        drumPattern: 'cyber-electro',
        chordProgression: ['Cm', 'Ab', 'Eb', 'Bb'],
        melodyNotes: ['C4', 'D#4', 'G4', 'A#4', 'C5', 'G4', 'F4', 'D#4'],
        bassNotes: ['C2', 'G#1', 'D#2', 'A#1'],
      },
      aiLyrics: 'Through neon shadows of Batticaloa night,\nFarhee pulses in emerald light,\nSynthetic waves across the digital sea,\nCreation engineered for eternity.',
      audioCraftPrompt: 'Cyberpunk Beats, electronic synthesizer, 128 bpm, high quality audio production',
      createdAt: 'Just now',
    };
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Generate audio buffer on mount if track exists
  useEffect(() => {
    if (currentTrack && !currentBuffer) {
      globalAudioEngine.renderTrackAudio(currentTrack.synthBlueprint, currentTrack.bpm, 24).then((buf) => {
        setCurrentBuffer(buf);
      });
    }
  }, [currentTrack]);

  // Visualizer Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = globalAudioEngine.getAnalyser();
    const bufferLength = analyser ? analyser.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Draw background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#090C0E');
      bgGrad.addColorStop(1, '#0B1114');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);

        const barWidth = (width / bufferLength) * 2.2;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * height * 0.85;

          const grad = ctx.createLinearGradient(0, height - barHeight, 0, height);
          grad.addColorStop(0, '#CCFF00');
          grad.addColorStop(0.5, '#10B981');
          grad.addColorStop(1, '#047857');

          ctx.fillStyle = grad;
          ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

          x += barWidth;
        }

        // Update progress time
        const cur = globalAudioEngine.getCurrentTime();
        const dur = globalAudioEngine.getDuration() || 1;
        setPlaybackProgress((cur / dur) * 100);
      } else {
        // Idle animated wave
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#10B98144';
        ctx.beginPath();
        const sliceWidth = width / 64;
        let x = 0;
        for (let i = 0; i < 64; i++) {
          const v = Math.sin(i * 0.2 + Date.now() * 0.003) * 12 + height / 2;
          if (i === 0) ctx.moveTo(x, v);
          else ctx.lineTo(x, v);
          x += sliceWidth;
        }
        ctx.stroke();
      }
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  const handleGenerateMusic = async () => {
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    globalAudioEngine.stop();
    setIsPlaying(false);

    try {
      const res = await fetch('/api/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          genre: selectedGenre,
          tempo,
          duration: 24,
        }),
      });

      const data = await res.json();
      const newTrack: GeneratedMusicTrack = {
        id: 'track-' + Date.now(),
        title: data.title || `${selectedGenre} Synthesis`,
        genre: data.genre || selectedGenre,
        bpm: data.bpm || tempo,
        key: data.key || 'C Minor',
        mood: data.mood || 'Atmospheric',
        structure: data.structure || ['Intro', 'Main Beat', 'Drop', 'Outro'],
        synthBlueprint: data.synthBlueprint || {
          bassType: 'sub-saw',
          leadType: 'neon-supersaw',
          drumPattern: 'cyber-electro',
          chordProgression: ['Cm', 'Ab', 'Eb', 'Bb'],
          melodyNotes: ['C4', 'D#4', 'G4', 'A#4', 'C5', 'G4', 'F4', 'D#4'],
          bassNotes: ['C2', 'G#1', 'D#2', 'A#1'],
        },
        aiLyrics: data.aiLyrics || '',
        audioCraftPrompt: data.audioCraftPrompt || '',
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setCurrentTrack(newTrack);
      StorageService.saveMusicTrack(newTrack);

      // Render audio buffer directly in browser
      const buf = await globalAudioEngine.renderTrackAudio(newTrack.synthBlueprint, newTrack.bpm, 24);
      setCurrentBuffer(buf);
      globalAudioEngine.play(buf, () => setIsPlaying(false));
      setIsPlaying(true);
    } catch (err) {
      console.error(err);
      alert('Failed to generate music. Please check your network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      globalAudioEngine.pause();
      setIsPlaying(false);
    } else {
      if (currentBuffer) {
        globalAudioEngine.play(currentBuffer, () => setIsPlaying(false));
        setIsPlaying(true);
      }
    }
  };

  const handleDownloadWav = () => {
    if (!currentBuffer || !currentTrack) return;
    const blob = globalAudioEngine.audioBufferToWavBlob(currentBuffer);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Farhee_Music_${currentTrack.title.replace(/\s+/g, '_')}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="farhee-music-gen-view" className="flex flex-col h-[calc(100vh-4rem)] bg-[#0B0D0E] overflow-y-auto">
      {/* Top Generator Input Controls */}
      <div className="p-4 lg:p-6 border-b border-[#1A2227] bg-[#0E1317]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                id="music-prompt-input"
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateMusic()}
                placeholder="Describe your music mood (e.g. Cyberpunk synthwave with driving bass and neon pads)..."
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
              id="generate-music-btn"
              onClick={handleGenerateMusic}
              disabled={isLoading || !prompt.trim()}
              className={`px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                isLoading
                  ? 'bg-[#1A2329] text-neutral-500 cursor-wait'
                  : 'bg-gradient-to-r from-[#10B981] via-teal-500 to-[#CCFF00] text-black shadow-lg shadow-[#10B981]/25 hover:opacity-95 active:scale-95'
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>Synthesizing Track...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-black" />
                  <span>Synthesize & Play</span>
                </>
              )}
            </button>
          </div>

          {/* Genre selector & BPM slider */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Radio className="w-3.5 h-3.5 text-[#CCFF00]" /> Genre / Audio Profile:
                </span>
                <span>{selectedGenre}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {GENRES.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      setSelectedGenre(g.id);
                      setTempo(g.bpm);
                    }}
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      selectedGenre === g.id
                        ? 'bg-[#10B981]/20 border-[#10B981] text-[#CCFF00] shadow-md shadow-[#10B981]/15'
                        : 'bg-[#141A1E] border-[#222C33] text-neutral-400 hover:text-white hover:border-neutral-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <span>{g.icon}</span>
                      <span className="truncate">{g.label}</span>
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-0.5 truncate">{g.bpm} BPM</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tempo Slider */}
            <div className="p-3.5 rounded-2xl bg-[#12171B] border border-[#1E272D] flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-neutral-400 flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-[#10B981]" /> Tempo BPM:
                </span>
                <span className="font-bold text-[#CCFF00]">{tempo} BPM</span>
              </div>
              <input
                type="range"
                min={70}
                max={160}
                value={tempo}
                onChange={(e) => setTempo(Number(e.target.value))}
                className="w-full accent-[#10B981] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                <span>70 Chill</span>
                <span>120 Standard</span>
                <span>160 Fast</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Synthesizer Player & Canvas Visualizer */}
      <div className="flex-1 p-4 lg:p-6 max-w-6xl w-full mx-auto space-y-6">
        {currentTrack && (
          <div className="rounded-3xl bg-[#0E1317] border border-[#1E272D] overflow-hidden shadow-2xl space-y-4">
            {/* Visualizer Header */}
            <div className="p-4 sm:p-6 border-b border-[#1E272D] flex flex-wrap items-center justify-between gap-4 bg-[#12171B]">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                  isPlaying
                    ? 'bg-gradient-to-tr from-[#10B981] to-[#CCFF00] text-black shadow-lg shadow-[#10B981]/30 animate-pulse'
                    : 'bg-[#182126] border-[#26343D] text-emerald-400'
                }`}>
                  <Disc className={`w-6 h-6 ${isPlaying ? 'animate-spin [animation-duration:4s]' : ''}`} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                    {currentTrack.title}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#CCFF00] border border-[#10B981]/30">
                      {currentTrack.key} • {currentTrack.bpm} BPM
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400 flex items-center gap-2 mt-0.5">
                    <span>{currentTrack.genre}</span>
                    <span>•</span>
                    <span>{currentTrack.mood}</span>
                  </p>
                </div>
              </div>

              {/* Play / Download Controls */}
              <div className="flex items-center gap-2">
                <button
                  id="music-play-pause-btn"
                  onClick={togglePlay}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                    isPlaying
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                      : 'bg-gradient-to-r from-[#10B981] to-[#CCFF00] text-black shadow-lg shadow-[#10B981]/25 hover:scale-105 active:scale-95'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Play Track</span>
                    </>
                  )}
                </button>

                <button
                  id="music-download-wav-btn"
                  onClick={handleDownloadWav}
                  className="px-4 py-2.5 rounded-xl bg-[#182126] hover:bg-[#202C33] border border-[#26343D] text-neutral-200 hover:text-[#CCFF00] text-xs font-semibold flex items-center gap-2 transition-colors"
                  title="Download Master Studio WAV file"
                >
                  <Download className="w-4 h-4 text-[#10B981]" />
                  <span>Download WAV / MP3</span>
                </button>
              </div>
            </div>

            {/* Real-time Web Audio Canvas Visualizer */}
            <div className="px-6 relative">
              <canvas
                ref={canvasRef}
                width={800}
                height={160}
                className="w-full h-40 rounded-2xl border border-[#1E272D] bg-[#07090A]"
              />

              {/* Playback progress bar */}
              <div className="w-full bg-[#182025] h-1.5 rounded-full overflow-hidden mt-3">
                <div
                  className="bg-gradient-to-r from-[#10B981] to-[#CCFF00] h-full transition-all duration-100"
                  style={{ width: `${playbackProgress}%` }}
                />
              </div>
            </div>

            {/* Track Info & Synthesizer Blueprint breakdown */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Structure & Synth nodes */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#CCFF00] font-mono flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Track Composition Blueprint
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#12171B] border border-[#1E272D]">
                    <span className="text-neutral-400">Structure:</span>
                    <span className="font-mono text-emerald-300">{currentTrack.structure.join(' → ')}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#12171B] border border-[#1E272D]">
                    <span className="text-neutral-400">Bass Oscillator:</span>
                    <span className="font-mono text-[#CCFF00]">{currentTrack.synthBlueprint.bassType}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#12171B] border border-[#1E272D]">
                    <span className="text-neutral-400">Lead Oscillator:</span>
                    <span className="font-mono text-teal-300">{currentTrack.synthBlueprint.leadType}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#12171B] border border-[#1E272D]">
                    <span className="text-neutral-400">Chords & Scale:</span>
                    <span className="font-mono text-neutral-200">{currentTrack.synthBlueprint.chordProgression?.join(' - ')}</span>
                  </div>
                </div>
              </div>

              {/* Lyrics / Voiceover Theme */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1.5">
                  <Mic2 className="w-3.5 h-3.5" /> AI Generated Lyrics & AudioCraft Prompt
                </h4>
                <div className="p-4 rounded-xl bg-[#12171B] border border-[#1E272D] text-xs text-neutral-300 leading-relaxed font-mono whitespace-pre-wrap">
                  {currentTrack.aiLyrics || currentTrack.audioCraftPrompt}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
