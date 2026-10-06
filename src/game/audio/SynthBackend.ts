import type { SoundBackend, SoundId } from './AudioManager';
import { AmbientMusic } from './AmbientMusic';

const NOISE_SECONDS = 1.5;
/** Smoothing time constant for volume changes, seconds. */
const VOLUME_SMOOTHING = 0.05;

/**
 * Generates every sound effect procedurally with the Web Audio API — no audio
 * files are shipped. Each effect is a short graph of oscillators / filtered
 * noise with an amplitude envelope.
 */
export class SynthBackend implements SoundBackend {
  private context: AudioContext | null = null;
  private effectsGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private music: AmbientMusic | null = null;
  private effectsVolume = 1;
  private musicVolume = 1;
  private musicRequested = false;

  unlock(): void {
    if (!this.context) {
      if (typeof window === 'undefined' || typeof window.AudioContext !== 'function') return;
      const context = new window.AudioContext();
      this.context = context;
      this.effectsGain = context.createGain();
      this.musicGain = context.createGain();
      this.effectsGain.connect(context.destination);
      this.musicGain.connect(context.destination);
      this.noise = createNoiseBuffer(context);
      this.music = new AmbientMusic(context, this.musicGain);
      this.applyVolumes();
      if (this.musicRequested) this.music.start();
    }
    if (this.context.state === 'suspended') {
      void this.context.resume();
    }
  }

  setVolumes(effects: number, music: number): void {
    this.effectsVolume = effects;
    this.musicVolume = music;
    this.applyVolumes();
  }

  startMusic(): void {
    this.musicRequested = true;
    this.music?.start();
  }

  stopMusic(): void {
    this.musicRequested = false;
    this.music?.stop();
  }

  play(id: SoundId, intensity: number, delaySeconds: number): void {
    const context = this.context;
    const out = this.effectsGain;
    if (!context || !out || context.state !== 'running' || this.effectsVolume <= 0) return;
    const t = context.currentTime + Math.max(0, delaySeconds);
    switch (id) {
      case 'fire':
        this.noiseBurst(t, 0.22, 2400, 300, 0.5);
        this.tone(t, 'sine', 150, 45, 0.25, 0.6);
        break;
      case 'explosion': {
        const size = Math.min(1.6, Math.max(0.4, intensity));
        this.noiseBurst(t, 0.5 + 0.6 * size, 1600 * size, 90, 0.7);
        this.tone(t, 'sine', 90, 28, 0.6 + 0.4 * size, 0.8 * size);
        break;
      }
      case 'bounce':
        this.tone(t, 'triangle', 620, 240, 0.14, 0.35);
        break;
      case 'split':
        this.tone(t, 'square', 760, 1500, 0.09, 0.15);
        this.noiseBurst(t, 0.12, 5000, 2000, 0.2);
        break;
      case 'airstrike':
        this.tone(t, 'sawtooth', 520, 880, 0.45, 0.12);
        this.tone(t + 0.45, 'sawtooth', 880, 520, 0.45, 0.12);
        break;
      case 'hit':
        this.tone(t, 'square', 240, 90, 0.18, 0.25);
        break;
      case 'destroyed':
        this.noiseBurst(t, 1.6, 900, 60, 0.8);
        this.tone(t, 'sawtooth', 160, 30, 1.2, 0.35);
        break;
      case 'turn':
        this.tone(t, 'sine', 660, 660, 0.09, 0.22);
        this.tone(t + 0.09, 'sine', 990, 990, 0.12, 0.22);
        break;
      case 'click':
        this.tone(t, 'sine', 1100, 900, 0.05, 0.18);
        break;
      case 'drill':
        this.tone(t, 'sawtooth', 110, 70, 0.3, 0.12);
        break;
      case 'dirt':
        this.noiseBurst(t, 0.55, 700, 70, 0.75);
        this.tone(t, 'sine', 70, 35, 0.35, 0.7);
        break;
      case 'sizzle':
        this.noiseBurst(t, 0.6, 7500, 2600, 0.22);
        this.tone(t, 'sawtooth', 95, 60, 0.4, 0.08);
        break;
      case 'victory':
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => this.tone(t + i * 0.14, 'triangle', freq, freq, 0.32, 0.3));
        break;
    }
  }

  private applyVolumes(): void {
    const context = this.context;
    if (!context || !this.effectsGain || !this.musicGain) return;
    this.effectsGain.gain.setTargetAtTime(this.effectsVolume, context.currentTime, VOLUME_SMOOTHING);
    this.musicGain.gain.setTargetAtTime(this.musicVolume, context.currentTime, VOLUME_SMOOTHING);
  }

  /** Oscillator sweeping from f0 to f1 with an exponential decay envelope. */
  private tone(start: number, type: OscillatorType, f0: number, f1: number, duration: number, peak: number): void {
    const context = this.context;
    if (!context || !this.effectsGain) return;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), start + duration);
    envelope(gain.gain, start, duration, peak);
    osc.connect(gain).connect(this.effectsGain);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  /** White noise through a low-pass filter whose cutoff sweeps from `fromHz` to `toHz`. */
  private noiseBurst(start: number, duration: number, fromHz: number, toHz: number, peak: number): void {
    const context = this.context;
    if (!context || !this.effectsGain || !this.noise) return;
    const source = context.createBufferSource();
    source.buffer = this.noise;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(fromHz, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, toHz), start + duration);
    const gain = context.createGain();
    envelope(gain.gain, start, duration, peak);
    source.connect(filter).connect(gain).connect(this.effectsGain);
    source.start(start, 0, Math.min(duration + 0.05, NOISE_SECONDS));
  }
}

/** Quick attack, exponential release. */
function envelope(param: AudioParam, start: number, duration: number, peak: number): void {
  param.setValueAtTime(0.0001, start);
  param.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + 0.01);
  param.exponentialRampToValueAtTime(0.0001, start + duration);
}

function createNoiseBuffer(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * NOISE_SECONDS), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1; // cosmetic randomness only
  }
  return buffer;
}
