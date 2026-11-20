import type { SpecialTileType } from '../../shared/gameConfig';

export interface SoundSettings {
  masterVolume: number;
  musicEnabled: boolean;
  musicVolume: number;
  uiSoundsEnabled: boolean;
  boardEffectsEnabled: boolean;
  ambientBoardEnabled: boolean;
  ambientVolume: number;
  spatialVoiceEnabled: boolean;
  voiceVolume: number;
  voiceActivityThreshold: number;
}

export const SOUND_SETTINGS_KEY = 'aether_serpent_sound_v1';

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  masterVolume: 0.65,
  musicEnabled: true,
  musicVolume: 0.45,
  uiSoundsEnabled: true,
  boardEffectsEnabled: true,
  ambientBoardEnabled: true,
  ambientVolume: 0.42,
  spatialVoiceEnabled: true,
  voiceVolume: 0.85,
  voiceActivityThreshold: 0.35,
};

function clamp01(val: unknown, fallback: number): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(1, num));
}

export function loadSoundSettings(): SoundSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SOUND_SETTINGS };
  try {
    const raw = localStorage.getItem(SOUND_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SOUND_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<SoundSettings>;
    return {
      masterVolume: clamp01(parsed.masterVolume, DEFAULT_SOUND_SETTINGS.masterVolume),
      musicEnabled:
        typeof parsed.musicEnabled === 'boolean'
          ? parsed.musicEnabled
          : DEFAULT_SOUND_SETTINGS.musicEnabled,
      musicVolume: clamp01(parsed.musicVolume, DEFAULT_SOUND_SETTINGS.musicVolume),
      uiSoundsEnabled:
        typeof parsed.uiSoundsEnabled === 'boolean'
          ? parsed.uiSoundsEnabled
          : DEFAULT_SOUND_SETTINGS.uiSoundsEnabled,
      boardEffectsEnabled:
        typeof parsed.boardEffectsEnabled === 'boolean'
          ? parsed.boardEffectsEnabled
          : DEFAULT_SOUND_SETTINGS.boardEffectsEnabled,
      ambientBoardEnabled:
        typeof parsed.ambientBoardEnabled === 'boolean'
          ? parsed.ambientBoardEnabled
          : DEFAULT_SOUND_SETTINGS.ambientBoardEnabled,
      ambientVolume: clamp01(parsed.ambientVolume, DEFAULT_SOUND_SETTINGS.ambientVolume),
      spatialVoiceEnabled:
        typeof parsed.spatialVoiceEnabled === 'boolean'
          ? parsed.spatialVoiceEnabled
          : DEFAULT_SOUND_SETTINGS.spatialVoiceEnabled,
      voiceVolume: clamp01(parsed.voiceVolume, DEFAULT_SOUND_SETTINGS.voiceVolume),
      voiceActivityThreshold: Math.max(
        0.05,
        Math.min(
          0.95,
          clamp01(parsed.voiceActivityThreshold, DEFAULT_SOUND_SETTINGS.voiceActivityThreshold),
        ),
      ),
    };
  } catch {
    return { ...DEFAULT_SOUND_SETTINGS };
  }
}

export function saveSoundSettings(next: SoundSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota errors
  }
}

type AudioCategory = 'ui' | 'board';

// Gentle sanctuary pentatonic progression (D minor 9 -> Bb maj7 -> F maj7 -> C add9)
const MUSIC_CHORDS: number[][] = [
  [146.83, 220.0, 261.63, 329.63],
  [116.54, 174.61, 220.0, 293.66],
  [174.61, 220.0, 261.63, 329.63],
  [130.81, 196.0, 261.63, 293.66],
];

const MUSIC_MELODY_NOTES = [587.33, 659.25, 523.25, 440.0, 523.25, 659.25, 783.99, 587.33];

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private settings: SoundSettings = loadSoundSettings();
  private userUnlocked = false;
  private listenersAttached = false;

  // Continuous soundscape nodes
  private musicMasterGain: GainNode | null = null;
  private musicTimerId: number | null = null;
  private musicStep = 0;

  private ambientMasterGain: GainNode | null = null;
  private ambientSource: AudioBufferSourceNode | null = null;
  private ambientLfo: OscillatorNode | null = null;
  private ambientChimeTimerId: number | null = null;

  private ensureContext(allowCreate = true): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      if (!allowCreate) return null;
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {
        // Browser may block resume before a user gesture
      });
    }
    return this.ctx;
  }

  public attachUnlockListeners(): () => void {
    if (typeof window === 'undefined') return () => {};
    if (this.listenersAttached) return () => {};
    this.listenersAttached = true;

    const handleUnlock = () => {
      this.userUnlocked = true;
      const ctx = this.ensureContext(true);
      if (ctx && ctx.state === 'suspended') {
        void ctx.resume().then(() => {
          this.syncContinuousLayers();
        });
      } else {
        this.syncContinuousLayers();
      }
      window.removeEventListener('pointerdown', handleUnlock);
      window.removeEventListener('keydown', handleUnlock);
    };

    const handleVisibility = () => {
      if (!this.ctx) return;
      if (document.hidden) {
        this.rampGain(this.musicMasterGain, 0, 0.25);
        this.rampGain(this.ambientMasterGain, 0, 0.25);
      } else {
        this.syncContinuousLayers();
      }
    };

    window.addEventListener('pointerdown', handleUnlock, { passive: true });
    window.addEventListener('keydown', handleUnlock, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      this.listenersAttached = false;
      window.removeEventListener('pointerdown', handleUnlock);
      window.removeEventListener('keydown', handleUnlock);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    this.syncContinuousLayers();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setVolume(vol: number) {
    this.settings = {
      ...this.settings,
      masterVolume: clamp01(vol, this.settings.masterVolume),
    };
    this.syncContinuousLayers();
  }

  public getVolume(): number {
    return this.settings.masterVolume;
  }

  public setSettings(next: SoundSettings) {
    this.settings = {
      masterVolume: clamp01(next.masterVolume, DEFAULT_SOUND_SETTINGS.masterVolume),
      musicEnabled: Boolean(next.musicEnabled),
      musicVolume: clamp01(next.musicVolume, DEFAULT_SOUND_SETTINGS.musicVolume),
      uiSoundsEnabled: Boolean(next.uiSoundsEnabled),
      boardEffectsEnabled: Boolean(next.boardEffectsEnabled),
      ambientBoardEnabled: Boolean(next.ambientBoardEnabled),
      ambientVolume: clamp01(next.ambientVolume, DEFAULT_SOUND_SETTINGS.ambientVolume),
      spatialVoiceEnabled:
        typeof next.spatialVoiceEnabled === 'boolean'
          ? next.spatialVoiceEnabled
          : DEFAULT_SOUND_SETTINGS.spatialVoiceEnabled,
      voiceVolume: clamp01(next.voiceVolume, DEFAULT_SOUND_SETTINGS.voiceVolume),
      voiceActivityThreshold: Math.max(
        0.05,
        Math.min(
          0.95,
          clamp01(next.voiceActivityThreshold, DEFAULT_SOUND_SETTINGS.voiceActivityThreshold),
        ),
      ),
    };
    if (this.userUnlocked || this.ctx) {
      this.syncContinuousLayers();
    }
  }

  public getSettings(): SoundSettings {
    return { ...this.settings };
  }

  private rampGain(node: GainNode | null, target: number, durationSec = 0.28) {
    if (!node || !this.ctx) return;
    const now = this.ctx.currentTime;
    try {
      node.gain.cancelScheduledValues(now);
      node.gain.setValueAtTime(node.gain.value, now);
      node.gain.linearRampToValueAtTime(Math.max(0, target), now + durationSec);
    } catch {
      node.gain.value = Math.max(0, target);
    }
  }

  private syncContinuousLayers() {
    if (typeof window === 'undefined') return;
    const hidden = typeof document !== 'undefined' && document.hidden;
    const shouldPlayMusic =
      !this.muted &&
      !hidden &&
      this.settings.musicEnabled &&
      this.settings.masterVolume > 0.005 &&
      this.settings.musicVolume > 0.005;

    const shouldPlayAmbient =
      !this.muted &&
      !hidden &&
      this.settings.ambientBoardEnabled &&
      this.settings.masterVolume > 0.005 &&
      this.settings.ambientVolume > 0.005;

    if (shouldPlayMusic) {
      this.startMusicLoop();
      this.rampGain(
        this.musicMasterGain,
        this.settings.masterVolume * this.settings.musicVolume * 0.24,
        0.32,
      );
    } else {
      this.stopMusicLoop();
    }

    if (shouldPlayAmbient) {
      this.startAmbientLoop();
      this.rampGain(
        this.ambientMasterGain,
        this.settings.masterVolume * this.settings.ambientVolume * 0.22,
        0.35,
      );
    } else {
      this.stopAmbientLoop();
    }
  }

  private startMusicLoop() {
    const ctx = this.ensureContext(true);
    if (!ctx) return;

    if (!this.musicMasterGain) {
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.connect(ctx.destination);
      this.musicMasterGain = gain;
    }

    if (this.musicTimerId !== null) return;

    const playMusicBar = () => {
      if (!this.ctx || !this.musicMasterGain || this.muted || !this.settings.musicEnabled) return;
      if (this.ctx.state !== 'running') return;

      const chord = MUSIC_CHORDS[this.musicStep % MUSIC_CHORDS.length];
      const now = this.ctx.currentTime;

      // Warm low-passed sanctuary pad chord
      chord.forEach((freq, idx) => {
        if (!this.ctx || !this.musicMasterGain) return;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const env = this.ctx.createGain();

        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(idx === 0 ? 520 : 900, now);

        env.gain.setValueAtTime(0.0001, now);
        env.gain.linearRampToValueAtTime(idx === 0 ? 0.26 : 0.12, now + 0.55);
        env.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

        osc.connect(filter);
        filter.connect(env);
        env.connect(this.musicMasterGain);

        osc.start(now);
        osc.stop(now + 3.25);
      });

      // Soft pentatonic harp pluck accents
      const noteA = MUSIC_MELODY_NOTES[(this.musicStep * 2) % MUSIC_MELODY_NOTES.length];
      const noteB = MUSIC_MELODY_NOTES[(this.musicStep * 2 + 1) % MUSIC_MELODY_NOTES.length];
      [
        { freq: noteA, offset: 0.35, peak: 0.14 },
        { freq: noteB, offset: 1.55, peak: 0.11 },
      ].forEach(({ freq, offset, peak }) => {
        if (!this.ctx || !this.musicMasterGain) return;
        const osc = this.ctx.createOscillator();
        const env = this.ctx.createGain();
        const t = now + offset;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        env.gain.setValueAtTime(0.0001, t);
        env.gain.linearRampToValueAtTime(peak, t + 0.04);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 1.25);
        osc.connect(env);
        env.connect(this.musicMasterGain);
        osc.start(t);
        osc.stop(t + 1.3);
      });

      this.musicStep = (this.musicStep + 1) % 64;
    };

    playMusicBar();
    this.musicTimerId = window.setInterval(playMusicBar, 2850);
  }

  private stopMusicLoop() {
    if (this.musicTimerId !== null) {
      window.clearInterval(this.musicTimerId);
      this.musicTimerId = null;
    }
    this.rampGain(this.musicMasterGain, 0, 0.24);
  }

  private startAmbientLoop() {
    const ctx = this.ensureContext(true);
    if (!ctx) return;

    if (!this.ambientMasterGain) {
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.connect(ctx.destination);
      this.ambientMasterGain = gain;
    }

    if (!this.ambientSource) {
      // Synthesize a 3-second soft pink-tinted breeze / distant waterfall noise buffer
      const length = Math.floor(ctx.sampleRate * 3);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + white * 0.029;
        b1 = 0.985 * b1 + white * 0.032;
        b2 = 0.95 * b2 + white * 0.048;
        data[i] = (b0 + b1 + b2 + white * 0.015) * 0.45;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(420, ctx.currentTime);
      bandpass.Q.setValueAtTime(0.75, ctx.currentTime);

      // Slow organic breeze modulation on filter frequency
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.14, ctx.currentTime);
      lfoGain.gain.setValueAtTime(160, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(bandpass.frequency);

      source.connect(bandpass);
      bandpass.connect(this.ambientMasterGain);

      source.start();
      lfo.start();
      this.ambientSource = source;
      this.ambientLfo = lfo;
    }

    if (this.ambientChimeTimerId === null) {
      const shimmerNotes = [880, 1046.5, 1174.66, 1318.51];
      this.ambientChimeTimerId = window.setInterval(() => {
        if (!this.ctx || !this.ambientMasterGain || this.muted || !this.settings.ambientBoardEnabled) {
          return;
        }
        if (this.ctx.state !== 'running') return;
        const now = this.ctx.currentTime;
        const freq = shimmerNotes[Math.floor(Math.random() * shimmerNotes.length)];
        const osc = this.ctx.createOscillator();
        const env = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        env.gain.setValueAtTime(0.0001, now);
        env.gain.linearRampToValueAtTime(0.075, now + 0.08);
        env.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
        osc.connect(env);
        env.connect(this.ambientMasterGain);
        osc.start(now);
        osc.stop(now + 1.65);
      }, 5200);
    }
  }

  private stopAmbientLoop() {
    if (this.ambientChimeTimerId !== null) {
      window.clearInterval(this.ambientChimeTimerId);
      this.ambientChimeTimerId = null;
    }
    this.rampGain(this.ambientMasterGain, 0, 0.25);
    if (this.ambientSource) {
      const src = this.ambientSource;
      const lfo = this.ambientLfo;
      this.ambientSource = null;
      this.ambientLfo = null;
      window.setTimeout(() => {
        try {
          src.stop();
          src.disconnect();
        } catch {
          // already stopped
        }
        try {
          lfo?.stop();
          lfo?.disconnect();
        } catch {
          // already stopped
        }
      }, 280);
    }
  }

  private isCategoryAllowed(category: AudioCategory): boolean {
    if (this.muted || this.settings.masterVolume <= 0.005) return false;
    if (category === 'ui') return this.settings.uiSoundsEnabled;
    return this.settings.boardEffectsEnabled;
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    delay = 0,
    gainPeak = 0.22,
    endFreq?: number,
    category: AudioCategory = 'board',
  ) {
    if (!this.isCategoryAllowed(category)) return;
    const ctx = this.ensureContext(true);
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
    gain.gain.linearRampToValueAtTime(gainPeak * this.settings.masterVolume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public previewCategory(category: 'music' | 'ui' | 'board' | 'ambient') {
    this.userUnlocked = true;
    const ctx = this.ensureContext(true);
    if (!ctx || this.muted || this.settings.masterVolume <= 0.005) return;

    if (category === 'ui') {
      this.tone(560, 0.06, 'sine', 0, 0.14, 720, 'ui');
      this.tone(740, 0.08, 'triangle', 0.05, 0.12, undefined, 'ui');
      return;
    }
    if (category === 'board') {
      this.playDiceRoll();
      return;
    }
    if (category === 'music') {
      this.syncContinuousLayers();
      const now = ctx.currentTime;
      const vol = this.settings.masterVolume * Math.max(0.25, this.settings.musicVolume) * 0.2;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        const t = now + i * 0.11;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        env.gain.setValueAtTime(0.0001, t);
        env.gain.linearRampToValueAtTime(vol, t + 0.03);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
        osc.connect(env);
        env.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.6);
      });
      return;
    }
    if (category === 'ambient') {
      this.syncContinuousLayers();
      const now = ctx.currentTime;
      const vol = this.settings.masterVolume * Math.max(0.25, this.settings.ambientVolume) * 0.16;
      [880, 1318.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        const t = now + i * 0.16;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        env.gain.setValueAtTime(0.0001, t);
        env.gain.linearRampToValueAtTime(vol, t + 0.06);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
        osc.connect(env);
        env.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.8);
      });
    }
  }

  /**
   * Plays a short spatialized chime orbiting left-to-right when 3D spatial voice is enabled,
   * or a centered mono chime when disabled, so players can preview the difference immediately.
   */
  public previewSpatialVoice(spatialEnabled: boolean) {
    this.userUnlocked = true;
    const ctx = this.ensureContext(true);
    if (!ctx || this.muted || this.settings.masterVolume <= 0.005) return;

    const now = ctx.currentTime;
    const vol = this.settings.masterVolume * Math.max(0.3, this.settings.voiceVolume) * 0.24;
    const notes = [440, 554.37, 659.25];
    const positionsX = [-4.2, 0, 4.2];

    notes.forEach((freq, idx) => {
      const t = now + idx * 0.22;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(vol, t + 0.03);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);

      osc.connect(env);

      if (spatialEnabled && typeof ctx.createPanner === 'function') {
        const panner = ctx.createPanner();
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'inverse';
        panner.refDistance = 2.0;
        panner.maxDistance = 20;
        panner.rolloffFactor = 1.2;
        if (panner.positionX) {
          panner.positionX.setValueAtTime(positionsX[idx], t);
          panner.positionY.setValueAtTime(0.2, t);
          panner.positionZ.setValueAtTime(-1.8, t);
        } else {
          panner.setPosition(positionsX[idx], 0.2, -1.8);
        }
        env.connect(panner);
        panner.connect(ctx.destination);
      } else {
        env.connect(ctx.destination);
      }

      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  public playDiceRoll() {
    const delays = [0, 0.07, 0.15, 0.24, 0.35, 0.48];
    const freqs = [320, 410, 360, 480, 390, 540];
    delays.forEach((d, i) => {
      this.tone(freqs[i], 0.055, 'triangle', d, 0.2, freqs[i] * 0.65, 'board');
    });
  }

  /** Tactile upward flick/whoosh when the 3D dice launches off the altar */
  public playDiceToss() {
    if (!this.isCategoryAllowed('board')) return;
    const ctx = this.ensureContext(true);
    if (!ctx) return;

    const now = ctx.currentTime;
    const master = this.settings.masterVolume;

    // Brief filtered air-whoosh
    const dur = 0.12;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / data.length) * Math.PI);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(520, now);
    filter.frequency.exponentialRampToValueAtTime(1650, now + dur);
    filter.Q.value = 1.6;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.14 * master, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + dur + 0.01);

    // Subtle wooden/stone flick transient
    this.tone(250, 0.06, 'triangle', 0, 0.12, 420, 'board');
  }

  /**
   * Velocity-scaled physical dice impact clack on the stone altar or metallic golden rim.
   */
  public playDiceBounce(intensity = 0.7, isRimHit = false) {
    if (!this.isCategoryAllowed('board')) return;
    const ctx = this.ensureContext(true);
    if (!ctx) return;

    const strength = Math.max(0.12, Math.min(1, intensity));
    const now = ctx.currentTime;
    const master = this.settings.masterVolume;
    const jitter = 0.9 + Math.random() * 0.22;

    // 1. Crisp percussive contact click (short filtered noise impulse)
    const clickDur = isRimHit ? 0.038 : 0.032;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * clickDur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2.2);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime((isRimHit ? 2600 : 1450) * jitter, now);
    bp.Q.value = isRimHit ? 3.2 : 1.9;

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.24 * strength * master, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + clickDur);

    src.connect(bp);
    bp.connect(clickGain);
    clickGain.connect(ctx.destination);
    src.start(now);
    src.stop(now + clickDur + 0.01);

    // 2. Resonant body thud / rim clink
    if (isRimHit) {
      this.tone(1180 * jitter, 0.095, 'sine', 0, 0.13 * strength, 980 * jitter, 'board');
      this.tone(1760 * jitter, 0.065, 'triangle', 0.005, 0.08 * strength, undefined, 'board');
    } else {
      this.tone(360 * jitter, 0.055, 'triangle', 0, 0.22 * strength, 170 * jitter, 'board');
      this.tone(720 * jitter, 0.038, 'sine', 0.004, 0.1 * strength, 480 * jitter, 'board');
    }
  }

  /** Crisp lock-in sound when the dice settles on its final number */
  public playDiceSettle(faceValue: number) {
    if (!this.isCategoryAllowed('board')) return;
    if (faceValue >= 6) {
      this.tone(587.33, 0.11, 'triangle', 0, 0.14, undefined, 'board');
      this.tone(880, 0.2, 'sine', 0.06, 0.16, undefined, 'board');
    } else {
      this.tone(420 + faceValue * 34, 0.075, 'triangle', 0, 0.11, undefined, 'board');
    }
  }

  public playHop(stepIndex = 0) {
    const scale = [392, 440, 493.88, 587.33, 659.25, 783.99];
    const f = scale[stepIndex % scale.length];
    this.tone(f, 0.09, 'sine', 0, 0.18, f * 1.12, 'board');
  }

  public playLadder() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((n, idx) => {
      this.tone(n, 0.28, 'triangle', idx * 0.08, 0.22, undefined, 'board');
    });
  }

  public playSnake() {
    this.tone(420, 0.55, 'sawtooth', 0, 0.14, 115, 'board');
    this.tone(210, 0.6, 'triangle', 0.08, 0.18, 75, 'board');
  }

  public playShieldBlock() {
    this.tone(660, 0.35, 'sine', 0, 0.24, undefined, 'board');
    this.tone(990, 0.4, 'triangle', 0.05, 0.18, undefined, 'board');
  }

  public playSpecial(type: SpecialTileType) {
    switch (type) {
      case 'boost':
        this.tone(440, 0.22, 'sine', 0, 0.2, 880, 'board');
        this.tone(660, 0.24, 'triangle', 0.08, 0.18, 1100, 'board');
        break;
      case 'extra_roll':
        this.tone(587.33, 0.14, 'triangle', 0, 0.22, undefined, 'board');
        this.tone(880, 0.25, 'triangle', 0.11, 0.24, undefined, 'board');
        break;
      case 'shield':
        this.playShieldBlock();
        break;
      case 'curse':
        this.tone(260, 0.35, 'sawtooth', 0, 0.13, 140, 'board');
        break;
    }
  }

  public playVictory() {
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    chord.forEach((n, i) => {
      this.tone(n, 0.55, i % 2 === 0 ? 'triangle' : 'sine', i * 0.09, 0.22, undefined, 'board');
    });
  }

  public playDefeat() {
    const notes = [392, 349.23, 311.13, 261.63];
    notes.forEach((n, i) => {
      this.tone(n, 0.42, 'triangle', i * 0.14, 0.18, n * 0.94, 'board');
    });
  }

  public playClash() {
    this.tone(240, 0.12, 'sawtooth', 0, 0.2, 120, 'board');
    this.tone(480, 0.18, 'triangle', 0.04, 0.18, 220, 'board');
  }

  public playSnakeSwallow() {
    this.tone(310, 0.08, 'square', 0, 0.14, 95, 'board');
    this.tone(185, 0.42, 'sine', 0.12, 0.22, 68, 'board');
    this.tone(140, 0.35, 'triangle', 0.32, 0.16, 85, 'board');
  }

  public playLadderStep(rungIdx = 0) {
    const f = 260 + Math.min(8, rungIdx) * 32;
    this.tone(f, 0.065, 'triangle', 0, 0.14, f * 1.15, 'board');
  }

  public playSkillCast(kind: 'defensive' | 'offensive' | 'movement' | 'support') {
    switch (kind) {
      case 'defensive':
        this.tone(440, 0.18, 'sine', 0, 0.2, 880, 'board');
        this.tone(660, 0.28, 'triangle', 0.05, 0.16, 990, 'board');
        break;
      case 'offensive':
        this.tone(340, 0.14, 'sawtooth', 0, 0.16, 150, 'board');
        this.tone(580, 0.2, 'triangle', 0.06, 0.18, 220, 'board');
        break;
      case 'movement':
        this.tone(380, 0.22, 'sine', 0, 0.18, 920, 'board');
        break;
      case 'support':
        this.tone(523.25, 0.18, 'triangle', 0, 0.18, undefined, 'board');
        this.tone(783.99, 0.24, 'sine', 0.08, 0.18, undefined, 'board');
        break;
    }
  }

  public playUiClick() {
    this.userUnlocked = true;
    this.tone(520, 0.05, 'sine', 0, 0.1, undefined, 'ui');
  }

  public playUiToggle(enabled: boolean) {
    this.userUnlocked = true;
    if (enabled) {
      this.tone(480, 0.055, 'sine', 0, 0.11, 680, 'ui');
    } else {
      this.tone(460, 0.055, 'sine', 0, 0.09, 340, 'ui');
    }
  }
}

export const soundEngine = new SoundEngine();
