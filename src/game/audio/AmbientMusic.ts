/**
 * A quiet, generative ambient pad: three detuned oscillator voices through a
 * slowly breathing low-pass filter, gliding between an original chord loop.
 * Entirely synthesised, so it ships no audio assets.
 */
const CHORDS: readonly (readonly number[])[] = [
  [110.0, 164.81, 261.63], // A2  E3  C4
  [98.0, 146.83, 246.94], // G2  D3  B3
  [87.31, 130.81, 220.0], // F2  C3  A3
  [98.0, 146.83, 233.08], // G2  D3  A#3
];
const CHORD_SECONDS = 7;
const GLIDE = 1.2;
const VOICE_GAIN = 0.06;
const DETUNE_CENTS = 7;
const FILTER_BASE = 520;
const FILTER_DEPTH = 260;
const LFO_RATE = 0.07;

export class AmbientMusic {
  private voices: OscillatorNode[] = [];
  private nodes: AudioNode[] = [];
  private timer: number | null = null;
  private chordIndex = 0;

  constructor(
    private readonly context: AudioContext,
    private readonly output: AudioNode,
  ) {}

  start(): void {
    if (this.voices.length > 0) return;
    const ctx = this.context;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = FILTER_BASE;
    filter.Q.value = 0.7;

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = LFO_RATE;
    lfoGain.gain.value = FILTER_DEPTH;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0.0001, ctx.currentTime);
    bus.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 3);
    filter.connect(bus).connect(this.output);

    const chord = CHORDS[0] ?? [];
    chord.forEach((freq, i) => {
      for (const detune of [-DETUNE_CENTS, DETUNE_CENTS]) {
        const osc = ctx.createOscillator();
        osc.type = i === 0 ? 'triangle' : 'sine';
        osc.frequency.value = freq;
        osc.detune.value = detune;
        const gain = ctx.createGain();
        gain.gain.value = VOICE_GAIN;
        osc.connect(gain).connect(filter);
        osc.start();
        this.voices.push(osc);
        this.nodes.push(gain);
      }
    });
    this.nodes.push(filter, lfoGain, bus, lfo);
    this.voices.push(lfo);
    this.timer = window.setInterval(() => this.nextChord(), CHORD_SECONDS * 1000);
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    for (const osc of this.voices) {
      try {
        osc.stop();
      } catch {
        // already stopped
      }
    }
    for (const node of this.nodes) node.disconnect();
    this.voices = [];
    this.nodes = [];
  }

  private nextChord(): void {
    this.chordIndex = (this.chordIndex + 1) % CHORDS.length;
    const chord = CHORDS[this.chordIndex] ?? [];
    const now = this.context.currentTime;
    // Two detuned oscillators per chord tone; the LFO is the last voice and is skipped.
    chord.forEach((freq, i) => {
      for (let k = 0; k < 2; k++) {
        this.voices[i * 2 + k]?.frequency.setTargetAtTime(freq, now, GLIDE);
      }
    });
  }
}
