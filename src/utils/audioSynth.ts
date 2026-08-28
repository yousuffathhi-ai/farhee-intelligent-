import { SynthBlueprint } from '../types';

// Note frequency map
const NOTE_FREQS: Record<string, number> = {
  'C1': 32.7, 'C#1': 34.65, 'D1': 36.71, 'D#1': 38.89, 'E1': 41.2, 'F1': 43.65, 'F#1': 46.25, 'G1': 49.0, 'G#1': 51.91, 'A1': 55.0, 'A#1': 58.27, 'B1': 61.74,
  'C2': 65.41, 'C#2': 69.3, 'D2': 73.42, 'D#2': 77.78, 'E2': 82.41, 'F2': 87.31, 'F#2': 92.5, 'G2': 98.0, 'G#2': 103.83, 'A2': 110.0, 'A#2': 116.54, 'B2': 123.47,
  'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F3': 174.61, 'F#3': 185.0, 'G3': 196.0, 'G#3': 207.65, 'A3': 220.0, 'A#3': 233.08, 'B3': 246.94,
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.0, 'G#4': 415.3, 'A4': 440.0, 'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.0, 'A#5': 932.33, 'B5': 987.77,
  'C6': 1046.5
};

export class ProceduralAudioEngine {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private isPlaying = false;
  private currentBuffer: AudioBuffer | null = null;
  private startTime = 0;
  private pauseOffset = 0;

  public init() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  // Procedural synthesizer generator using OfflineAudioContext for clean studio sound rendering
  public async renderTrackAudio(blueprint: SynthBlueprint, bpm = 120, totalSeconds = 24): Promise<AudioBuffer> {
    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(2, sampleRate * totalSeconds, sampleRate);

    const secondsPerBeat = 60 / bpm;
    const sixteenthNote = secondsPerBeat / 4;
    const totalSixteenths = Math.floor(totalSeconds / sixteenthNote);

    // Master bus & limiter
    const masterGain = offlineCtx.createGain();
    masterGain.gain.setValueAtTime(0.75, 0);
    masterGain.connect(offlineCtx.destination);

    // 1. Synthesize Drums (Kick, Snare, Hi-Hat)
    const isCyber = blueprint.drumPattern?.includes('cyber') || blueprint.drumPattern?.includes('breakbeat');
    
    for (let s = 0; s < totalSixteenths; s++) {
      const time = s * sixteenthNote;
      const beatInBar = s % 16;

      // Kick Drum
      const isKick = isCyber
        ? beatInBar === 0 || beatInBar === 6 || beatInBar === 10 || beatInBar === 12
        : beatInBar === 0 || beatInBar === 4 || beatInBar === 8 || beatInBar === 12;

      if (isKick) {
        const osc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, time);
        osc.frequency.exponentialRampToValueAtTime(38, time + 0.12);
        gain.gain.setValueAtTime(1.0, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(time);
        osc.stop(time + 0.25);
      }

      // Snare / Clap
      const isSnare = beatInBar === 4 || beatInBar === 12;
      if (isSnare) {
        // Noise burst
        const bufferSize = sampleRate * 0.18;
        const noiseBuffer = offlineCtx.createBuffer(1, bufferSize, sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const whiteNoise = offlineCtx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = offlineCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;

        const snareGain = offlineCtx.createGain();
        snareGain.gain.setValueAtTime(0.6, time);
        snareGain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

        whiteNoise.connect(filter);
        filter.connect(snareGain);
        snareGain.connect(masterGain);
        whiteNoise.start(time);
        whiteNoise.stop(time + 0.18);
      }

      // Closed & Open Hi-Hat
      if (s % 2 === 0) {
        const hatBufferSize = sampleRate * (s % 4 === 2 ? 0.08 : 0.04);
        const hatBuffer = offlineCtx.createBuffer(1, hatBufferSize, sampleRate);
        const hatData = hatBuffer.getChannelData(0);
        for (let i = 0; i < hatBufferSize; i++) {
          hatData[i] = (Math.random() * 2 - 1) * 0.3;
        }
        const hatSource = offlineCtx.createBufferSource();
        hatSource.buffer = hatBuffer;

        const hatFilter = offlineCtx.createBiquadFilter();
        hatFilter.type = 'highpass';
        hatFilter.frequency.value = 6500;

        const hatGain = offlineCtx.createGain();
        hatGain.gain.setValueAtTime(s % 4 === 2 ? 0.35 : 0.2, time);
        hatGain.gain.exponentialRampToValueAtTime(0.001, time + (s % 4 === 2 ? 0.08 : 0.04));

        hatSource.connect(hatFilter);
        hatFilter.connect(hatGain);
        hatGain.connect(masterGain);
        hatSource.start(time);
        hatSource.stop(time + 0.09);
      }
    }

    // 2. Synthesize Bassline
    const bassNotes = blueprint.bassNotes && blueprint.bassNotes.length > 0
      ? blueprint.bassNotes
      : ['C2', 'G#1', 'D#2', 'A#1'];

    for (let s = 0; s < totalSixteenths; s += 2) {
      const time = s * sixteenthNote;
      const barIndex = Math.floor(s / 16);
      const noteName = bassNotes[barIndex % bassNotes.length];
      const freq = NOTE_FREQS[noteName] || 65.41;

      const bassOsc = offlineCtx.createOscillator();
      const bassFilter = offlineCtx.createBiquadFilter();
      const bassGain = offlineCtx.createGain();

      bassOsc.type = blueprint.bassType === 'acid-square' ? 'square' : 'sawtooth';
      bassOsc.frequency.setValueAtTime(freq, time);

      bassFilter.type = 'lowpass';
      bassFilter.frequency.setValueAtTime(500, time);
      bassFilter.frequency.exponentialRampToValueAtTime(160, time + sixteenthNote * 1.8);
      bassFilter.Q.value = 4.0;

      bassGain.gain.setValueAtTime(0.55, time);
      bassGain.gain.exponentialRampToValueAtTime(0.001, time + sixteenthNote * 1.9);

      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(masterGain);

      bassOsc.start(time);
      bassOsc.stop(time + sixteenthNote * 2);
    }

    // 3. Synthesize Melody & Arpeggio
    const melodyNotes = blueprint.melodyNotes && blueprint.melodyNotes.length > 0
      ? blueprint.melodyNotes
      : ['C4', 'D#4', 'G4', 'A#4', 'C5', 'G4', 'F4', 'D#4'];

    for (let s = 0; s < totalSixteenths; s++) {
      // Create rhythmic melody pattern
      if (s % 2 === 0 || (s % 8 === 7 && isCyber)) {
        const time = s * sixteenthNote;
        const noteIndex = s % melodyNotes.length;
        const noteName = melodyNotes[noteIndex];
        const freq = NOTE_FREQS[noteName] || 440;

        const leadOsc = offlineCtx.createOscillator();
        const subLeadOsc = offlineCtx.createOscillator();
        const leadGain = offlineCtx.createGain();
        const leadFilter = offlineCtx.createBiquadFilter();

        leadOsc.type = 'sawtooth';
        leadOsc.frequency.setValueAtTime(freq, time);

        subLeadOsc.type = 'sine';
        subLeadOsc.frequency.setValueAtTime(freq * 1.004, time); // Detuned for fat chorus

        leadFilter.type = 'bandpass';
        leadFilter.frequency.setValueAtTime(1400, time);
        leadFilter.Q.value = 2.0;

        leadGain.gain.setValueAtTime(0.28, time);
        leadGain.gain.exponentialRampToValueAtTime(0.001, time + sixteenthNote * 1.7);

        leadOsc.connect(leadFilter);
        subLeadOsc.connect(leadFilter);
        leadFilter.connect(leadGain);
        leadGain.connect(masterGain);

        leadOsc.start(time);
        subLeadOsc.start(time);
        leadOsc.stop(time + sixteenthNote * 1.8);
        subLeadOsc.stop(time + sixteenthNote * 1.8);
      }
    }

    // Render offline audio context to buffer
    const renderedBuffer = await offlineCtx.startRendering();
    this.currentBuffer = renderedBuffer;
    return renderedBuffer;
  }

  // Play audio buffer
  public play(buffer?: AudioBuffer, onEnded?: () => void) {
    this.init();
    if (!this.audioCtx || !this.analyser) return;

    if (buffer) {
      this.currentBuffer = buffer;
      this.pauseOffset = 0;
    }

    if (!this.currentBuffer) return;

    if (this.isPlaying) {
      this.stop();
    }

    this.sourceNode = this.audioCtx.createBufferSource();
    this.sourceNode.buffer = this.currentBuffer;
    this.sourceNode.connect(this.analyser);
    this.analyser.connect(this.audioCtx.destination);

    this.startTime = this.audioCtx.currentTime - this.pauseOffset;
    this.sourceNode.start(0, this.pauseOffset % this.currentBuffer.duration);
    this.isPlaying = true;

    this.sourceNode.onended = () => {
      this.isPlaying = false;
      this.pauseOffset = 0;
      if (onEnded) onEnded();
    };
  }

  public pause() {
    if (!this.audioCtx || !this.isPlaying || !this.sourceNode) return;
    this.pauseOffset = this.audioCtx.currentTime - this.startTime;
    this.sourceNode.stop();
    this.isPlaying = false;
  }

  public stop() {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch (e) {}
      this.sourceNode = null;
    }
    this.isPlaying = false;
    this.pauseOffset = 0;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentTime(): number {
    if (!this.audioCtx || !this.isPlaying) return this.pauseOffset;
    return (this.audioCtx.currentTime - this.startTime) % (this.currentBuffer?.duration || 1);
  }

  public getDuration(): number {
    return this.currentBuffer?.duration || 0;
  }

  // Export AudioBuffer to WAV Blob for 1-click download
  public audioBufferToWavBlob(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const out = new DataView(new ArrayBuffer(length));
    const channels: Float32Array[] = [];
    let offset = 0;
    let pos = 0;

    function setUint16(data: number) {
      out.setUint16(pos, data, true);
      pos += 2;
    }

    function setUint32(data: number) {
      out.setUint32(pos, data, true);
      pos += 4;
    }

    // RIFF chunk descriptor
    out.setUint8(pos++, 0x52); // "R"
    out.setUint8(pos++, 0x49); // "I"
    out.setUint8(pos++, 0x46); // "F"
    out.setUint8(pos++, 0x46); // "F"
    setUint32(length - 8);
    out.setUint8(pos++, 0x57); // "W"
    out.setUint8(pos++, 0x41); // "A"
    out.setUint8(pos++, 0x56); // "V"
    out.setUint8(pos++, 0x45); // "E"

    // FMT sub-chunk
    out.setUint8(pos++, 0x66); // "f"
    out.setUint8(pos++, 0x6d); // "m"
    out.setUint8(pos++, 0x74); // "t"
    out.setUint8(pos++, 0x20); // " "
    setUint32(16); // subchunk1size (16 for PCM)
    setUint16(1); // audio format (1 = PCM)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // byte rate
    setUint16(numOfChan * 2); // block align
    setUint16(16); // bits per sample

    // Data sub-chunk
    out.setUint8(pos++, 0x64); // "d"
    out.setUint8(pos++, 0x61); // "a"
    out.setUint8(pos++, 0x74); // "t"
    out.setUint8(pos++, 0x61); // "a"
    setUint32(length - pos - 4);

    for (let i = 0; i < numOfChan; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (offset < buffer.length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
        out.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([out.buffer], { type: 'audio/wav' });
  }
}

export const globalAudioEngine = new ProceduralAudioEngine();
