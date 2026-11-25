import type { TrackId } from './types';

export type OstTrack = 'menu' | TrackId;

interface SongData {
  bpm: number;
  stepsPerBeat: number;
  length: number; // total 16th steps
  lead: number[]; // MIDI notes (0 = rest)
  harmony: number[]; // MIDI notes
  bass: number[]; // MIDI notes
  chords: number[][]; // chord per 4 steps
  drumPattern: ('K' | 'S' | 'H' | 'C' | 'KS' | '')[];
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// 4-bar (64-step 16th note) energetic Mario Kart Wii-inspired compositions
const SONGS: Record<OstTrack, SongData> = {
  menu: {
    bpm: 134,
    stepsPerBeat: 4,
    length: 64,
    // Catchy bright MKW menu brass & lead riff in F major / G mixolydian
    lead: [
      77, 0, 77, 79, 81, 0, 84, 0, 81, 0, 79, 77, 79, 0, 0, 0,
      74, 0, 74, 77, 79, 0, 81, 0, 79, 0, 77, 74, 72, 0, 0, 0,
      77, 0, 79, 81, 84, 0, 86, 0, 84, 0, 81, 79, 81, 0, 84, 0,
      86, 0, 84, 81, 79, 0, 77, 0, 79, 0, 81, 79, 77, 0, 0, 0,
    ],
    harmony: [
      72, 0, 72, 74, 77, 0, 79, 0, 77, 0, 74, 72, 74, 0, 0, 0,
      69, 0, 69, 72, 74, 0, 77, 0, 74, 0, 72, 69, 67, 0, 0, 0,
      72, 0, 74, 77, 79, 0, 81, 0, 79, 0, 77, 74, 77, 0, 79, 0,
      81, 0, 79, 77, 74, 0, 72, 0, 74, 0, 77, 74, 72, 0, 0, 0,
    ],
    bass: [
      41, 0, 53, 0, 41, 0, 53, 41, 43, 0, 55, 0, 43, 0, 55, 0,
      38, 0, 50, 0, 38, 0, 50, 38, 36, 0, 48, 0, 36, 48, 38, 40,
      41, 0, 53, 0, 41, 0, 53, 41, 45, 0, 57, 0, 45, 0, 57, 0,
      46, 0, 58, 0, 48, 0, 60, 0, 43, 0, 48, 0, 41, 0, 53, 0,
    ],
    chords: [
      [65, 69, 72, 76], [65, 69, 72, 76], [67, 71, 74, 77], [67, 71, 74, 77],
      [62, 65, 69, 72], [62, 65, 69, 72], [60, 64, 67, 70], [60, 64, 67, 70],
      [65, 69, 72, 76], [65, 69, 72, 76], [69, 72, 76, 79], [69, 72, 76, 79],
      [70, 74, 77, 81], [72, 76, 79, 82], [67, 71, 74, 79], [65, 69, 72, 76],
    ],
    drumPattern: [
      'K', 'H', 'H', 'H', 'S', 'H', 'K', 'H', 'K', 'H', 'H', 'K', 'S', 'H', 'C', 'H',
      'K', 'H', 'H', 'H', 'S', 'H', 'K', 'H', 'K', 'H', 'S', 'H', 'S', 'K', 'S', 'H',
      'K', 'H', 'H', 'H', 'S', 'H', 'K', 'H', 'K', 'H', 'H', 'K', 'S', 'H', 'C', 'H',
      'K', 'H', 'K', 'H', 'S', 'H', 'K', 'H', 'K', 'S', 'K', 'S', 'KS', 'H', 'S', 'C',
    ],
  },

  nordic_gravel: {
    bpm: 146,
    stepsPerBeat: 4,
    length: 64,
    // Sunny high-octane Nordic Rally funk-brass theme
    lead: [
      76, 79, 83, 0, 84, 0, 83, 79, 81, 0, 79, 76, 74, 0, 76, 0,
      79, 0, 83, 86, 84, 0, 83, 0, 81, 79, 76, 74, 76, 0, 0, 0,
      76, 79, 83, 0, 86, 0, 88, 0, 86, 84, 83, 81, 79, 0, 81, 0,
      83, 81, 79, 76, 74, 0, 79, 0, 81, 0, 83, 0, 88, 0, 86, 0,
    ],
    harmony: [
      72, 76, 79, 0, 81, 0, 79, 76, 77, 0, 76, 72, 71, 0, 72, 0,
      76, 0, 79, 83, 81, 0, 79, 0, 77, 76, 72, 71, 72, 0, 0, 0,
      72, 76, 79, 0, 83, 0, 84, 0, 83, 81, 79, 77, 76, 0, 77, 0,
      79, 77, 76, 72, 71, 0, 74, 0, 77, 0, 79, 0, 84, 0, 83, 0,
    ],
    bass: [
      40, 0, 52, 40, 40, 52, 0, 40, 45, 0, 57, 45, 43, 0, 55, 0,
      40, 0, 52, 40, 48, 0, 60, 48, 45, 0, 43, 0, 40, 43, 45, 47,
      48, 0, 60, 48, 48, 60, 0, 48, 45, 0, 57, 45, 43, 0, 55, 0,
      41, 0, 53, 41, 43, 0, 55, 43, 45, 0, 47, 0, 48, 52, 55, 48,
    ],
    chords: [
      [64, 67, 71, 74], [64, 67, 71, 74], [69, 72, 76, 79], [67, 71, 74, 79],
      [64, 67, 71, 74], [60, 64, 67, 71], [69, 72, 76], [64, 67, 71],
      [60, 64, 67, 71], [60, 64, 67, 71], [69, 72, 76], [67, 71, 74],
      [65, 69, 72, 76], [67, 71, 74, 79], [69, 72, 76], [67, 71, 74, 79],
    ],
    drumPattern: [
      'K', 'H', 'C', 'H', 'S', 'H', 'K', 'C', 'K', 'H', 'K', 'H', 'S', 'H', 'C', 'H',
      'K', 'H', 'C', 'H', 'S', 'H', 'K', 'H', 'K', 'C', 'S', 'H', 'KS', 'K', 'S', 'C',
      'K', 'H', 'C', 'H', 'S', 'H', 'K', 'C', 'K', 'H', 'K', 'H', 'S', 'H', 'C', 'H',
      'K', 'K', 'S', 'H', 'K', 'S', 'K', 'H', 'S', 'S', 'K', 'S', 'KS', 'C', 'S', 'S',
    ],
  },

  sunset_touge: {
    bpm: 158,
    stepsPerBeat: 4,
    length: 64,
    // Eurobeat / MKW Toad's Factory meets Wario's Gold Mine drive in D minor
    lead: [
      74, 0, 77, 0, 81, 0, 86, 0, 84, 81, 79, 77, 79, 0, 81, 0,
      74, 0, 77, 0, 81, 0, 84, 0, 82, 81, 79, 77, 76, 0, 0, 0,
      74, 77, 81, 86, 88, 0, 86, 84, 82, 0, 81, 79, 77, 0, 79, 0,
      81, 0, 84, 0, 86, 0, 89, 0, 88, 86, 84, 81, 86, 0, 0, 0,
    ],
    harmony: [
      69, 0, 72, 0, 77, 0, 81, 0, 79, 77, 74, 72, 74, 0, 76, 0,
      69, 0, 72, 0, 77, 0, 79, 0, 77, 76, 74, 72, 72, 0, 0, 0,
      69, 72, 77, 81, 84, 0, 81, 79, 77, 0, 76, 74, 72, 0, 74, 0,
      76, 0, 79, 0, 81, 0, 84, 0, 84, 81, 79, 76, 81, 0, 0, 0,
    ],
    bass: [
      38, 50, 38, 50, 38, 50, 38, 50, 46, 58, 46, 58, 48, 60, 48, 60,
      38, 50, 38, 50, 38, 50, 38, 50, 43, 55, 43, 55, 45, 57, 45, 57,
      46, 58, 46, 58, 48, 60, 48, 60, 43, 55, 43, 55, 45, 57, 45, 57,
      46, 58, 46, 58, 48, 60, 48, 60, 45, 57, 45, 57, 38, 50, 38, 50,
    ],
    chords: [
      [62, 65, 69], [62, 65, 69], [70, 74, 77], [72, 76, 79],
      [62, 65, 69], [62, 65, 69], [67, 70, 74], [69, 73, 76],
      [70, 74, 77], [72, 76, 79], [67, 70, 74], [69, 73, 76],
      [70, 74, 77], [72, 76, 79], [69, 73, 76], [62, 65, 69],
    ],
    drumPattern: [
      'K', 'H', 'H', 'H', 'KS', 'H', 'H', 'K', 'K', 'H', 'H', 'H', 'KS', 'H', 'C', 'H',
      'K', 'H', 'H', 'H', 'KS', 'H', 'H', 'K', 'K', 'H', 'S', 'H', 'KS', 'K', 'S', 'C',
      'K', 'H', 'K', 'H', 'KS', 'H', 'H', 'K', 'K', 'H', 'H', 'K', 'KS', 'H', 'C', 'H',
      'K', 'H', 'K', 'H', 'KS', 'H', 'K', 'H', 'S', 'S', 'K', 'S', 'KS', 'S', 'S', 'C',
    ],
  },

  arctic_bowl: {
    bpm: 168,
    stepsPerBeat: 4,
    length: 64,
    // Hyper-kinetic Rainbow Road / Final Cup Drum & Bass in E minor / G major
    lead: [
      83, 0, 86, 0, 91, 0, 88, 86, 83, 0, 81, 79, 81, 0, 83, 0,
      79, 81, 83, 86, 88, 0, 91, 0, 90, 0, 88, 86, 83, 0, 0, 0,
      84, 0, 88, 0, 91, 0, 93, 0, 91, 88, 86, 84, 83, 0, 86, 0,
      88, 86, 84, 83, 81, 0, 86, 0, 88, 0, 90, 0, 95, 0, 91, 0,
    ],
    harmony: [
      76, 0, 79, 0, 83, 0, 81, 79, 76, 0, 74, 72, 74, 0, 76, 0,
      72, 74, 76, 79, 81, 0, 83, 0, 83, 0, 81, 79, 76, 0, 0, 0,
      77, 0, 81, 0, 84, 0, 86, 0, 84, 81, 79, 77, 76, 0, 79, 0,
      81, 79, 77, 76, 74, 0, 79, 0, 81, 0, 83, 0, 88, 0, 83, 0,
    ],
    bass: [
      40, 0, 40, 52, 40, 0, 40, 52, 43, 0, 43, 55, 45, 0, 47, 0,
      48, 0, 48, 60, 48, 0, 48, 60, 47, 0, 59, 0, 40, 43, 47, 52,
      41, 0, 41, 53, 41, 0, 41, 53, 43, 0, 43, 55, 40, 0, 52, 0,
      45, 0, 45, 57, 47, 0, 47, 59, 48, 0, 50, 0, 52, 0, 40, 0,
    ],
    chords: [
      [64, 67, 71, 76], [64, 67, 71, 76], [67, 71, 74, 79], [69, 72, 76, 81],
      [60, 64, 67, 72], [60, 64, 67, 72], [66, 71, 74, 78], [64, 67, 71, 76],
      [65, 69, 72, 77], [65, 69, 72, 77], [67, 71, 74, 79], [64, 67, 71, 76],
      [69, 72, 76, 81], [71, 74, 78, 83], [72, 76, 79, 84], [64, 67, 71, 76],
    ],
    drumPattern: [
      'K', 'H', 'H', 'K', 'S', 'H', 'H', 'S', 'H', 'K', 'K', 'H', 'S', 'H', 'H', 'C',
      'K', 'H', 'H', 'K', 'S', 'H', 'K', 'H', 'S', 'K', 'S', 'H', 'KS', 'C', 'S', 'S',
      'K', 'H', 'H', 'K', 'S', 'H', 'H', 'S', 'H', 'K', 'K', 'H', 'S', 'H', 'H', 'C',
      'K', 'K', 'S', 'K', 'S', 'H', 'K', 'S', 'K', 'S', 'K', 'S', 'KS', 'C', 'KS', 'S',
    ],
  },
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private skidSource: AudioBufferSourceNode | null = null;
  private skidGain: GainNode | null = null;

  private currentTrack: OstTrack = 'menu';
  private isPlayingMusic = false;
  private isMuted = false;
  private musicVolume = 0.52;
  private sfxVolume = 0.65;
  private finalLap = false;
  private hyperMode = false;

  private schedulerTimer: number | null = null;
  private currentStep = 0;
  private nextNoteTime = 0;

  public ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 1;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      // White noise buffer for snares, hihats, gravel skids
      const bufferSize = this.ctx.sampleRate * 1.5;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlockAndStartMenu(): void {
    this.ensureContext();
    if (!this.isPlayingMusic) {
      this.playOst('menu');
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.03);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMusicVolume(vol: number): void {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.04);
    }
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.04);
    }
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public getCurrentTrack(): OstTrack {
    return this.currentTrack;
  }

  public setFinalLap(active: boolean): void {
    if (active && !this.finalLap) {
      this.finalLap = true;
      this.playFinalLapFanfare();
    } else if (!active) {
      this.finalLap = false;
    }
  }

  public setHyperStar(active: boolean): void {
    this.hyperMode = active;
  }

  public playOst(track: OstTrack): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (this.currentTrack === track && this.isPlayingMusic) return;

    this.currentTrack = track;
    this.isPlayingMusic = true;
    this.currentStep = 0;
    this.nextNoteTime = ctx.currentTime + 0.05;

    if (this.schedulerTimer !== null) {
      window.clearInterval(this.schedulerTimer);
    }

    this.schedulerTimer = window.setInterval(() => this.scheduleLoop(), 25);
  }

  public stopOst(): void {
    this.isPlayingMusic = false;
    if (this.schedulerTimer !== null) {
      window.clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  private scheduleLoop(): void {
    if (!this.ctx || !this.isPlayingMusic || this.ctx.state !== 'running') return;
    const song = SONGS[this.currentTrack];
    const tempoMultiplier = this.hyperMode ? 1.32 : this.finalLap ? 1.18 : 1.0;
    const effectiveBpm = song.bpm * tempoMultiplier;
    const stepDuration = 60 / effectiveBpm / song.stepsPerBeat;

    while (this.nextNoteTime < this.ctx.currentTime + 0.12) {
      this.scheduleStep(song, this.currentStep, this.nextNoteTime, stepDuration);
      this.nextNoteTime += stepDuration;
      this.currentStep = (this.currentStep + 1) % song.length;
    }
  }

  private scheduleStep(song: SongData, step: number, time: number, stepDur: number): void {
    if (!this.ctx || !this.musicGain) return;
    const transpose = this.hyperMode ? 4 : this.finalLap ? 2 : 0;

    // 1. Lead synth (detuned saw + square MKW brassy lead)
    const leadNote = this.hyperMode
      ? [72, 76, 79, 84, 79, 76, 74, 77, 81, 86, 81, 77, 76, 79, 83, 88][step % 16]
      : song.lead[step];

    if (leadNote > 0) {
      this.triggerLeadNote(midiToFreq(leadNote + transpose), time, stepDur * 1.45, 0.16);
    }

    // 2. Harmony synth
    if (!this.hyperMode && song.harmony[step] > 0) {
      this.triggerLeadNote(midiToFreq(song.harmony[step] + transpose), time, stepDur * 1.25, 0.075);
    }

    // 3. Punchy slap bass
    const bassNote = song.bass[step];
    if (bassNote > 0) {
      this.triggerBassNote(midiToFreq(bassNote + transpose), time, stepDur * 1.1);
    }

    // 4. Staccato chord stabs on beat steps
    if (step % 4 === 0 || (step % 8 === 6 && !this.hyperMode)) {
      const chordIdx = Math.floor(step / 4) % song.chords.length;
      const chord = song.chords[chordIdx];
      for (const n of chord) {
        this.triggerChordNote(midiToFreq(n + transpose), time, stepDur * 1.1, 0.04);
      }
    }

    // 5. Drums
    const drum = song.drumPattern[step % song.drumPattern.length];
    if (drum.includes('K')) this.triggerKick(time);
    if (drum.includes('S')) this.triggerSnare(time);
    if (drum.includes('H')) this.triggerHiHat(time);
    if (drum.includes('C')) this.triggerCowbell(time);
  }

  private triggerLeadNote(freq: number, time: number, dur: number, vol: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq * 1.004, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3400, time);
    filter.frequency.exponentialRampToValueAtTime(1400, time + dur);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur + 0.02);
    osc2.stop(time + dur + 0.02);
  }

  private triggerBassNote(freq: number, time: number, dur: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, time);
    filter.frequency.exponentialRampToValueAtTime(240, time + dur);
    filter.Q.value = 3;

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.24, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private triggerChordNote(freq: number, time: number, dur: number, vol: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private triggerKick(time: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.11);

    gain.gain.setValueAtTime(0.38, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.15);
  }

  private triggerSnare(time: number): void {
    if (!this.ctx || !this.musicGain || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1100;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    src.start(time);
    src.stop(time + 0.12);
  }

  private triggerHiHat(time: number): void {
    if (!this.ctx || !this.musicGain || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6500;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.06, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    src.start(time);
    src.stop(time + 0.05);
  }

  private triggerCowbell(time: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'square';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(540, time);
    osc2.frequency.setValueAtTime(800, time);

    gain.gain.setValueAtTime(0.075, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.musicGain);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.09);
    osc2.stop(time + 0.09);
  }

  // --- Continuous Engine & Skid Audio ---
  public startEngineLoop(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.engineOsc) return;

    this.engineOsc = ctx.createOscillator();
    this.engineSubOsc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    this.engineGain = ctx.createGain();

    this.engineOsc.type = 'sawtooth';
    this.engineSubOsc.type = 'triangle';
    this.engineOsc.frequency.value = 55;
    this.engineSubOsc.frequency.value = 27.5;

    filter.type = 'lowpass';
    filter.frequency.value = 320;

    this.engineGain.gain.value = 0.0;

    this.engineOsc.connect(filter);
    this.engineSubOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);

    this.engineOsc.start();
    this.engineSubOsc.start();

    if (this.noiseBuffer) {
      this.skidSource = ctx.createBufferSource();
      this.skidSource.buffer = this.noiseBuffer;
      this.skidSource.loop = true;

      const skidFilter = ctx.createBiquadFilter();
      skidFilter.type = 'bandpass';
      skidFilter.frequency.value = 1800;
      skidFilter.Q.value = 1.6;

      this.skidGain = ctx.createGain();
      this.skidGain.gain.value = 0;

      this.skidSource.connect(skidFilter);
      skidFilter.connect(this.skidGain);
      this.skidGain.connect(this.sfxGain);
      this.skidSource.start();
    }
  }

  public updateEngine(speedRatio: number, isDrifting: boolean, isBoosting: boolean): void {
    if (!this.ctx || !this.engineOsc || !this.engineSubOsc || !this.engineGain) return;
    const now = this.ctx.currentTime;
    const baseFreq = 48 + speedRatio * 95 + (isBoosting ? 28 : 0);
    this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.05);
    this.engineSubOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.05);
    this.engineGain.gain.setTargetAtTime(0.055 + speedRatio * 0.045, now, 0.06);

    if (this.skidGain) {
      const skidTarget = isDrifting && speedRatio > 0.25 ? 0.075 : 0;
      this.skidGain.gain.setTargetAtTime(skidTarget, now, 0.05);
    }
  }

  public stopEngineLoop(): void {
    try {
      this.engineOsc?.stop();
      this.engineSubOsc?.stop();
      this.skidSource?.stop();
    } catch {
      // ignore if already stopped
    }
    this.engineOsc?.disconnect();
    this.engineSubOsc?.disconnect();
    this.engineGain?.disconnect();
    this.skidSource?.disconnect();
    this.skidGain?.disconnect();
    this.engineOsc = null;
    this.engineSubOsc = null;
    this.engineGain = null;
    this.skidSource = null;
    this.skidGain = null;
  }

  // --- One-Shot Arcade SFX ---
  public playCountdownBeep(isGo: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isGo ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(isGo ? 880 : 440, now);
    if (isGo) {
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.18);
    }
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.45 : 0.2));
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + (isGo ? 0.46 : 0.22));
  }

  public playMiniTurboTier(tier: 1 | 2 | 3): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const freqs = [587, 784, 1046];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freqs[tier - 1], now);
    osc.frequency.exponentialRampToValueAtTime(freqs[tier - 1] * 1.25, now + 0.09);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playBoost(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.24);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.34);
  }

  public playItemTick(finalItem = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(finalItem ? 1046 : 660 + Math.random() * 240, now);
    if (finalItem) {
      osc.frequency.setValueAtTime(1318, now + 0.07);
    }
    gain.gain.setValueAtTime(finalItem ? 0.26 : 0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (finalItem ? 0.22 : 0.05));
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + (finalItem ? 0.24 : 0.06));
  }

  public playSpinout(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(130, now + 0.48);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.52);
  }

  public playPuckLaunch(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.16);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playLapComplete(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, idx) => {
      const t = ctx.currentTime + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  public playFinalLapFanfare(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const notes = [587.33, 659.25, 783.99, 1174.66];
    notes.forEach((f, idx) => {
      const t = ctx.currentTime + idx * 0.085;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  public playFinishFanfare(won: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const notes = won
      ? [523.25, 659.25, 783.99, 1046.5, 987.77, 1046.5]
      : [440, 523.25, 587.33, 659.25];
    notes.forEach((f, idx) => {
      const t = ctx.currentTime + idx * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  public playUiClick(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(720, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.05);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }
}

export const soundEngine = new SoundEngine();
