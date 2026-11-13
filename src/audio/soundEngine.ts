import type { SpecialTileType } from '../../shared/gameConfig';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private volume = 0.65;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.volume;
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    delay = 0,
    gainPeak = 0.22,
    endFreq?: number,
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak * this.volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playDiceRoll() {
    // Crisp percussive wood/ivory clacks
    const delays = [0, 0.07, 0.15, 0.24, 0.35, 0.48];
    const freqs = [320, 410, 360, 480, 390, 540];
    delays.forEach((d, i) => {
      this.tone(freqs[i], 0.055, 'triangle', d, 0.2, freqs[i] * 0.65);
    });
  }

  public playHop(stepIndex = 0) {
    // Pentatonic stone-tap ascending gently per hop
    const scale = [392, 440, 493.88, 587.33, 659.25, 783.99];
    const f = scale[stepIndex % scale.length];
    this.tone(f, 0.09, 'sine', 0, 0.18, f * 1.12);
  }

  public playLadder() {
    // Enchanted harp arpeggio ascending
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((n, idx) => {
      this.tone(n, 0.28, 'triangle', idx * 0.08, 0.22);
    });
  }

  public playSnake() {
    // Dramatic serpent descending hiss & low brass rumble
    this.tone(420, 0.55, 'sawtooth', 0, 0.14, 115);
    this.tone(210, 0.6, 'triangle', 0.08, 0.18, 75);
  }

  public playShieldBlock() {
    // Resonant crystal aegis bell
    this.tone(660, 0.35, 'sine', 0, 0.24);
    this.tone(990, 0.4, 'triangle', 0.05, 0.18);
  }

  public playSpecial(type: SpecialTileType) {
    switch (type) {
      case 'boost':
        this.tone(440, 0.22, 'sine', 0, 0.2, 880);
        this.tone(660, 0.24, 'triangle', 0.08, 0.18, 1100);
        break;
      case 'extra_roll':
        this.tone(587.33, 0.14, 'triangle', 0, 0.22);
        this.tone(880, 0.25, 'triangle', 0.11, 0.24);
        break;
      case 'shield':
        this.playShieldBlock();
        break;
      case 'curse':
        this.tone(260, 0.35, 'sawtooth', 0, 0.13, 140);
        break;
    }
  }

  public playVictory() {
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    chord.forEach((n, i) => {
      this.tone(n, 0.55, i % 2 === 0 ? 'triangle' : 'sine', i * 0.09, 0.22);
    });
  }

  public playDefeat() {
    const notes = [392, 349.23, 311.13, 261.63];
    notes.forEach((n, i) => {
      this.tone(n, 0.42, 'triangle', i * 0.14, 0.18, n * 0.94);
    });
  }

  public playClash() {
    this.tone(240, 0.12, 'sawtooth', 0, 0.2, 120);
    this.tone(480, 0.18, 'triangle', 0.04, 0.18, 220);
  }

  public playSnakeSwallow() {
    // Low menacing snap followed by deep throat swallow sweep
    this.tone(310, 0.08, 'square', 0, 0.14, 95);
    this.tone(185, 0.42, 'sine', 0.12, 0.22, 68);
    this.tone(140, 0.35, 'triangle', 0.32, 0.16, 85);
  }

  public playLadderStep(rungIdx = 0) {
    const f = 260 + Math.min(8, rungIdx) * 32;
    this.tone(f, 0.065, 'triangle', 0, 0.14, f * 1.15);
  }

  public playSkillCast(kind: 'defensive' | 'offensive' | 'movement' | 'support') {
    switch (kind) {
      case 'defensive':
        this.tone(440, 0.18, 'sine', 0, 0.2, 880);
        this.tone(660, 0.28, 'triangle', 0.05, 0.16, 990);
        break;
      case 'offensive':
        this.tone(340, 0.14, 'sawtooth', 0, 0.16, 150);
        this.tone(580, 0.2, 'triangle', 0.06, 0.18, 220);
        break;
      case 'movement':
        this.tone(380, 0.22, 'sine', 0, 0.18, 920);
        break;
      case 'support':
        this.tone(523.25, 0.18, 'triangle', 0, 0.18);
        this.tone(783.99, 0.24, 'sine', 0.08, 0.18);
        break;
    }
  }

  public playUiClick() {
    this.tone(520, 0.05, 'sine', 0, 0.1);
  }
}

export const soundEngine = new SoundEngine();
