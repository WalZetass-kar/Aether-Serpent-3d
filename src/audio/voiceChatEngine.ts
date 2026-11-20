import type { SoundSettings } from './soundEngine';

export interface VoiceParticipant {
  playerId: string;
  muted: boolean;
}

export interface VoiceSignalPacket {
  id?: string;
  fromId: string;
  toId: string;
  signalType: 'offer' | 'answer' | 'ice';
  payload: unknown;
  ts?: number;
}

export interface VoiceSpatialPose {
  listenerPosition: { x: number; y: number; z: number };
  listenerForward: { x: number; y: number; z: number };
  listenerUp: { x: number; y: number; z: number };
  peerPositions: Record<string, { x: number; y: number; z: number }>;
}

export type VoiceConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'muted'
  | 'denied'
  | 'unsupported'
  | 'error';

export interface VoiceChatSnapshot {
  status: VoiceConnectionStatus;
  joined: boolean;
  isMuted: boolean;
  spatialEnabled: boolean;
  voiceGateThreshold: number;
  connectedPeerIds: string[];
  speakingPeerIds: string[];
  localSpeaking: boolean;
  localLevel: number;
  peerLevels: Record<string, number>;
  errorMessage: string | null;
}

interface PeerRuntime {
  peerId: string;
  pc: RTCPeerConnection;
  remoteStream: MediaStream | null;
  hiddenAudioEl: HTMLAudioElement | null;
  sourceNode: MediaStreamAudioSourceNode | null;
  analyserNode: AnalyserNode | null;
  pannerNode: PannerNode | null;
  gainNode: GainNode | null;
  isSpatialConnected: boolean;
  pendingIce: RTCIceCandidateInit[];
  makingOffer: boolean;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

class SpatialVoiceChatEngine {
  private audioCtx: AudioContext | null = null;
  private localStream: MediaStream | null = null;
  private outgoingStream: MediaStream | null = null;
  private localSource: MediaStreamAudioSourceNode | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private localGateGain: GainNode | null = null;
  private localDest: MediaStreamAudioDestinationNode | null = null;
  private peers = new Map<string, PeerRuntime>();
  private seenSignalIds = new Set<string>();

  private roomCode: string | null = null;
  private myPlayerId: string | null = null;
  private signalSender: ((packet: Omit<VoiceSignalPacket, 'fromId'>) => void) | null = null;

  private joined = false;
  private connecting = false;
  private isMuted = false;
  private spatialEnabled = true;
  private voiceVolume = 0.85;
  private voiceGateThreshold = 0.35;
  private masterVolume = 0.65;
  private masterMuted = false;
  private errorMessage: string | null = null;
  private permissionDenied = false;
  private unsupported = false;

  private speakingPeerIds = new Set<string>();
  private localSpeaking = false;
  private localLevel = 0;
  private peerLevels: Record<string, number> = {};
  private gateOpenUntilMs = 0;
  private gateCurrentlyOpen = false;
  private meteringTimerId: number | null = null;
  private meterBuffer = new Uint8Array(128);
  private lastPose: VoiceSpatialPose | null = null;

  private listeners = new Set<(snap: VoiceChatSnapshot) => void>();

  public subscribe(listener: (snap: VoiceChatSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSnapshot(): VoiceChatSnapshot {
    let status: VoiceConnectionStatus = 'idle';
    if (this.unsupported) {
      status = 'unsupported';
    } else if (this.permissionDenied) {
      status = 'denied';
    } else if (this.connecting) {
      status = 'connecting';
    } else if (this.joined) {
      status = this.isMuted ? 'muted' : 'connected';
    } else if (this.errorMessage) {
      status = 'error';
    }

    return {
      status,
      joined: this.joined,
      isMuted: this.isMuted,
      spatialEnabled: this.spatialEnabled,
      voiceGateThreshold: this.voiceGateThreshold,
      connectedPeerIds: Array.from(this.peers.keys()),
      speakingPeerIds: Array.from(this.speakingPeerIds),
      localSpeaking: this.localSpeaking && this.joined && !this.isMuted,
      localLevel: this.joined && !this.isMuted ? this.localLevel : 0,
      peerLevels: { ...this.peerLevels },
      errorMessage: this.errorMessage,
    };
  }

  private emit(): void {
    const snap = this.getSnapshot();
    this.listeners.forEach((fn) => fn(snap));
  }

  private ensureAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  private getEffectiveGain(): number {
    if (this.masterMuted) return 0;
    return Math.max(0, Math.min(1.35, this.voiceVolume * this.masterVolume * 1.35));
  }

  public configureSession(opts: {
    roomCode: string | null;
    myPlayerId: string | null;
    onSendSignal: ((packet: Omit<VoiceSignalPacket, 'fromId'>) => void) | null;
  }): void {
    const changedRoom = opts.roomCode !== this.roomCode;
    this.roomCode = opts.roomCode;
    this.myPlayerId = opts.myPlayerId;
    this.signalSender = opts.onSendSignal;

    if (changedRoom && !opts.roomCode && (this.joined || this.connecting)) {
      this.leave();
    }
  }

  private getGateRmsThreshold(): number {
    // Logarithmic mapping from UI slider [0.05..0.95] to practical mic RMS [0.006..0.18]
    const clamped = Math.max(0.05, Math.min(0.95, this.voiceGateThreshold));
    return 0.005 * Math.pow(34, clamped);
  }

  private rmsToNormalizedLevel(rms: number): number {
    // Smooth perceptual curve mapping typical voice RMS (0.005..0.24) to 0..1
    const scaled = Math.max(0, (rms - 0.004) / 0.22);
    return Math.max(0, Math.min(1, Math.pow(scaled, 0.72)));
  }

  public applyAudioSettings(settings: SoundSettings, masterMuted: boolean): void {
    const prevSpatial = this.spatialEnabled;
    const prevGate = this.voiceGateThreshold;
    this.spatialEnabled = settings.spatialVoiceEnabled !== false;
    this.voiceVolume = Number.isFinite(settings.voiceVolume) ? settings.voiceVolume : 0.85;
    this.voiceGateThreshold = Number.isFinite(settings.voiceActivityThreshold)
      ? Math.max(0.05, Math.min(0.95, settings.voiceActivityThreshold))
      : 0.35;
    this.masterVolume = Number.isFinite(settings.masterVolume) ? settings.masterVolume : 0.65;
    this.masterMuted = masterMuted;

    const gainValue = this.getEffectiveGain();
    const ctx = this.audioCtx;
    const now = ctx ? ctx.currentTime : 0;

    for (const peer of this.peers.values()) {
      if (peer.gainNode && ctx) {
        try {
          peer.gainNode.gain.setTargetAtTime(gainValue, now, 0.04);
        } catch {
          peer.gainNode.gain.value = gainValue;
        }
      }
      if (prevSpatial !== this.spatialEnabled) {
        this.rewirePeerAudioGraph(peer);
      }
    }

    if (this.spatialEnabled && this.lastPose) {
      this.updateSpatialPositions(this.lastPose);
    }

    if (prevSpatial !== this.spatialEnabled || Math.abs(prevGate - this.voiceGateThreshold) > 0.005) {
      this.emit();
    }
  }

  public async join(initialMuted = false): Promise<{ ok: boolean; error?: string }> {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === 'undefined') {
      this.unsupported = true;
      this.errorMessage = 'Browser ini tidak mendukung obrolan suara WebRTC.';
      this.emit();
      return { ok: false, error: this.errorMessage };
    }

    if (!this.roomCode || !this.myPlayerId) {
      return { ok: false, error: 'Anda belum berada di ruangan daring aktif.' };
    }

    if (this.joined && this.localStream) {
      this.setMuted(initialMuted);
      return { ok: true };
    }

    this.connecting = true;
    this.permissionDenied = false;
    this.errorMessage = null;
    this.emit();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      this.localStream = stream;
      this.isMuted = initialMuted;
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !initialMuted;
      });

      const ctx = this.ensureAudioContext();
      if (ctx) {
        this.localSource = ctx.createMediaStreamSource(stream);
        this.localAnalyser = ctx.createAnalyser();
        this.localAnalyser.fftSize = 256;
        this.localGateGain = ctx.createGain();
        this.localGateGain.gain.setValueAtTime(0, ctx.currentTime);
        this.localDest = ctx.createMediaStreamDestination();

        // Analyze raw mic signal while transmitting noise-gated audio to WebRTC peers
        this.localSource.connect(this.localAnalyser);
        this.localSource.connect(this.localGateGain);
        this.localGateGain.connect(this.localDest);
        this.outgoingStream = this.localDest.stream;
      } else {
        this.outgoingStream = stream;
      }

      this.gateCurrentlyOpen = false;
      this.gateOpenUntilMs = 0;
      this.localLevel = 0;
      this.joined = true;
      this.connecting = false;
      this.errorMessage = null;
      this.startMeteringLoop();
      this.emit();
      return { ok: true };
    } catch (err) {
      this.connecting = false;
      this.joined = false;
      const errName = err instanceof Error ? err.name : '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        this.permissionDenied = true;
        this.errorMessage = 'Izin mikrofon ditolak. Aktifkan izin mikrofon di browser Anda.';
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        this.errorMessage = 'Mikrofon tidak ditemukan pada perangkat ini.';
      } else {
        this.errorMessage = 'Gagal mengaktifkan mikrofon untuk obrolan suara.';
      }
      this.emit();
      return { ok: false, error: this.errorMessage };
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
    if (this.outgoingStream && this.outgoingStream !== this.localStream) {
      this.outgoingStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
    if (muted) {
      this.localSpeaking = false;
      this.localLevel = 0;
      this.gateCurrentlyOpen = false;
      this.gateOpenUntilMs = 0;
      if (this.localGateGain && this.audioCtx) {
        try {
          this.localGateGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.02);
        } catch {
          this.localGateGain.gain.value = 0;
        }
      }
    }
    this.emit();
  }

  public leave(): void {
    this.stopMeteringLoop();

    for (const peerId of Array.from(this.peers.keys())) {
      this.closePeer(peerId);
    }
    this.peers.clear();
    this.speakingPeerIds.clear();
    this.peerLevels = {};
    this.seenSignalIds.clear();

    [this.localSource, this.localGateGain, this.localAnalyser].forEach((node) => {
      if (node) {
        try {
          node.disconnect();
        } catch {
          // ignore
        }
      }
    });
    this.localSource = null;
    this.localGateGain = null;
    this.localAnalyser = null;
    this.localDest = null;
    this.outgoingStream = null;

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
      this.localStream = null;
    }

    this.joined = false;
    this.connecting = false;
    this.isMuted = false;
    this.localSpeaking = false;
    this.localLevel = 0;
    this.gateCurrentlyOpen = false;
    this.gateOpenUntilMs = 0;
    this.errorMessage = null;
    this.permissionDenied = false;
    this.emit();
  }

  public syncParticipants(participants: VoiceParticipant[]): void {
    if (!this.joined || !this.myPlayerId) return;

    const activeRemoteIds = new Set(
      participants
        .map((p) => p.playerId)
        .filter((id) => Boolean(id) && id !== this.myPlayerId),
    );

    // Close peers who left voice chat
    for (const existingPeerId of Array.from(this.peers.keys())) {
      if (!activeRemoteIds.has(existingPeerId)) {
        this.closePeer(existingPeerId);
      }
    }

    // Create connections for newly joined peers
    for (const remoteId of activeRemoteIds) {
      if (!this.peers.has(remoteId)) {
        const shouldInitiate = this.myPlayerId < remoteId;
        this.createPeerConnection(remoteId, shouldInitiate);
      }
    }

    this.emit();
  }

  private createPeerConnection(remoteId: string, initiateOffer: boolean): PeerRuntime {
    const existing = this.peers.get(remoteId);
    if (existing) return existing;

    const pc = new RTCPeerConnection(RTC_CONFIG);
    const runtime: PeerRuntime = {
      peerId: remoteId,
      pc,
      remoteStream: null,
      hiddenAudioEl: null,
      sourceNode: null,
      analyserNode: null,
      pannerNode: null,
      gainNode: null,
      isSpatialConnected: false,
      pendingIce: [],
      makingOffer: false,
    };
    this.peers.set(remoteId, runtime);

    const streamToSend = this.outgoingStream ?? this.localStream;
    if (streamToSend) {
      streamToSend.getAudioTracks().forEach((track) => {
        pc.addTrack(track, streamToSend);
      });
    }

    pc.onicecandidate = (evt) => {
      if (evt.candidate && this.signalSender) {
        this.signalSender({
          toId: remoteId,
          signalType: 'ice',
          payload: evt.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (evt) => {
      const stream = evt.streams[0] ?? new MediaStream([evt.track]);
      this.attachRemoteStream(runtime, stream);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.closePeer(remoteId);
        this.emit();
      }
    };

    if (initiateOffer) {
      void this.sendOffer(runtime);
    }

    return runtime;
  }

  private async sendOffer(runtime: PeerRuntime): Promise<void> {
    if (!this.signalSender) return;
    try {
      runtime.makingOffer = true;
      const offer = await runtime.pc.createOffer({ offerToReceiveAudio: true });
      await runtime.pc.setLocalDescription(offer);
      this.signalSender({
        toId: runtime.peerId,
        signalType: 'offer',
        payload: runtime.pc.localDescription?.toJSON() ?? offer,
      });
    } catch {
      // Ignore transient WebRTC negotiation errors
    } finally {
      runtime.makingOffer = false;
    }
  }

  public async handleIncomingSignal(packet: VoiceSignalPacket): Promise<void> {
    if (!this.joined || !this.myPlayerId) return;
    if (!packet || packet.fromId === this.myPlayerId) return;
    if (packet.toId && packet.toId !== this.myPlayerId) return;

    if (packet.id) {
      if (this.seenSignalIds.has(packet.id)) return;
      this.seenSignalIds.add(packet.id);
      if (this.seenSignalIds.size > 400) {
        const first = this.seenSignalIds.values().next().value;
        if (first) this.seenSignalIds.delete(first);
      }
    }

    const runtime = this.createPeerConnection(packet.fromId, false);
    const { pc } = runtime;

    try {
      if (packet.signalType === 'offer') {
        const desc = packet.payload as RTCSessionDescriptionInit;
        const polite = this.myPlayerId > packet.fromId;
        const offerCollision = runtime.makingOffer || pc.signalingState !== 'stable';
        if (offerCollision && !polite) {
          return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(desc));
        await this.flushPendingIce(runtime);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.signalSender?.({
          toId: packet.fromId,
          signalType: 'answer',
          payload: pc.localDescription?.toJSON() ?? answer,
        });
      } else if (packet.signalType === 'answer') {
        const desc = packet.payload as RTCSessionDescriptionInit;
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(desc));
          await this.flushPendingIce(runtime);
        }
      } else if (packet.signalType === 'ice') {
        const candidate = packet.payload as RTCIceCandidateInit;
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          runtime.pendingIce.push(candidate);
        }
      }
    } catch {
      // Gracefully ignore out-of-order signaling packets
    }
  }

  private async flushPendingIce(runtime: PeerRuntime): Promise<void> {
    while (runtime.pendingIce.length > 0) {
      const next = runtime.pendingIce.shift();
      if (next) {
        try {
          await runtime.pc.addIceCandidate(new RTCIceCandidate(next));
        } catch {
          // ignore stale candidate
        }
      }
    }
  }

  private attachRemoteStream(runtime: PeerRuntime, stream: MediaStream): void {
    runtime.remoteStream = stream;

    // Chromium requires an attached muted <audio> element so WebRTC remote MediaStreams pump into Web Audio API
    if (typeof document !== 'undefined' && !runtime.hiddenAudioEl) {
      const el = document.createElement('audio');
      el.srcObject = stream;
      el.autoplay = true;
      el.muted = true;
      el.setAttribute('playsinline', 'true');
      void el.play().catch(() => {});
      runtime.hiddenAudioEl = el;
    } else if (runtime.hiddenAudioEl) {
      runtime.hiddenAudioEl.srcObject = stream;
    }

    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    this.teardownPeerAudioNodes(runtime);

    try {
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;

      const panner = ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 2.2;
      panner.maxDistance = 28;
      panner.rolloffFactor = 1.35;
      panner.coneInnerAngle = 360;
      panner.coneOuterAngle = 360;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(this.getEffectiveGain(), ctx.currentTime);

      runtime.sourceNode = source;
      runtime.analyserNode = analyser;
      runtime.pannerNode = panner;
      runtime.gainNode = gain;

      this.rewirePeerAudioGraph(runtime);

      if (this.lastPose && this.spatialEnabled) {
        this.applyPeerPannerPosition(runtime, this.lastPose.peerPositions[runtime.peerId]);
      }
    } catch {
      // Fallback: if Web Audio graph creation fails, unmute the native audio element
      if (runtime.hiddenAudioEl) {
        runtime.hiddenAudioEl.muted = this.masterMuted;
        runtime.hiddenAudioEl.volume = Math.min(1, this.voiceVolume * this.masterVolume);
      }
    }
  }

  private rewirePeerAudioGraph(runtime: PeerRuntime): void {
    const ctx = this.audioCtx;
    if (!ctx || !runtime.sourceNode || !runtime.analyserNode || !runtime.gainNode) return;

    try {
      runtime.sourceNode.disconnect();
    } catch {
      // ignore
    }
    try {
      runtime.analyserNode.disconnect();
    } catch {
      // ignore
    }
    try {
      runtime.pannerNode?.disconnect();
    } catch {
      // ignore
    }
    try {
      runtime.gainNode.disconnect();
    } catch {
      // ignore
    }

    runtime.sourceNode.connect(runtime.analyserNode);
    if (this.spatialEnabled && runtime.pannerNode) {
      runtime.analyserNode.connect(runtime.pannerNode);
      runtime.pannerNode.connect(runtime.gainNode);
      runtime.isSpatialConnected = true;
    } else {
      runtime.analyserNode.connect(runtime.gainNode);
      runtime.isSpatialConnected = false;
    }
    runtime.gainNode.connect(ctx.destination);
  }

  private teardownPeerAudioNodes(runtime: PeerRuntime): void {
    [runtime.sourceNode, runtime.analyserNode, runtime.pannerNode, runtime.gainNode].forEach(
      (node) => {
        if (node) {
          try {
            node.disconnect();
          } catch {
            // ignore
          }
        }
      },
    );
    runtime.sourceNode = null;
    runtime.analyserNode = null;
    runtime.pannerNode = null;
    runtime.gainNode = null;
    runtime.isSpatialConnected = false;
  }

  private closePeer(peerId: string): void {
    const runtime = this.peers.get(peerId);
    if (!runtime) return;

    this.teardownPeerAudioNodes(runtime);

    if (runtime.hiddenAudioEl) {
      try {
        runtime.hiddenAudioEl.pause();
        runtime.hiddenAudioEl.srcObject = null;
      } catch {
        // ignore
      }
      runtime.hiddenAudioEl = null;
    }

    try {
      runtime.pc.onicecandidate = null;
      runtime.pc.ontrack = null;
      runtime.pc.onconnectionstatechange = null;
      runtime.pc.close();
    } catch {
      // ignore
    }

    this.peers.delete(peerId);
    this.speakingPeerIds.delete(peerId);
    delete this.peerLevels[peerId];
  }

  private applyPeerPannerPosition(
    runtime: PeerRuntime,
    pos?: { x: number; y: number; z: number },
  ): void {
    if (!this.audioCtx || !runtime.pannerNode || !pos) return;
    const now = this.audioCtx.currentTime;
    const panner = runtime.pannerNode;
    if (panner.positionX && panner.positionY && panner.positionZ) {
      panner.positionX.setTargetAtTime(pos.x, now, 0.045);
      panner.positionY.setTargetAtTime(pos.y, now, 0.045);
      panner.positionZ.setTargetAtTime(pos.z, now, 0.045);
    } else {
      panner.setPosition(pos.x, pos.y, pos.z);
    }
  }

  public updateSpatialPositions(pose: VoiceSpatialPose): void {
    this.lastPose = pose;
    if (!this.joined || !this.spatialEnabled || !this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const listener = ctx.listener;

    if (listener.positionX && listener.positionY && listener.positionZ) {
      listener.positionX.setTargetAtTime(pose.listenerPosition.x, now, 0.045);
      listener.positionY.setTargetAtTime(pose.listenerPosition.y, now, 0.045);
      listener.positionZ.setTargetAtTime(pose.listenerPosition.z, now, 0.045);
    } else if (typeof listener.setPosition === 'function') {
      listener.setPosition(
        pose.listenerPosition.x,
        pose.listenerPosition.y,
        pose.listenerPosition.z,
      );
    }

    if (
      listener.forwardX &&
      listener.forwardY &&
      listener.forwardZ &&
      listener.upX &&
      listener.upY &&
      listener.upZ
    ) {
      listener.forwardX.setTargetAtTime(pose.listenerForward.x, now, 0.045);
      listener.forwardY.setTargetAtTime(pose.listenerForward.y, now, 0.045);
      listener.forwardZ.setTargetAtTime(pose.listenerForward.z, now, 0.045);
      listener.upX.setTargetAtTime(pose.listenerUp.x, now, 0.045);
      listener.upY.setTargetAtTime(pose.listenerUp.y, now, 0.045);
      listener.upZ.setTargetAtTime(pose.listenerUp.z, now, 0.045);
    } else if (typeof listener.setOrientation === 'function') {
      listener.setOrientation(
        pose.listenerForward.x,
        pose.listenerForward.y,
        pose.listenerForward.z,
        pose.listenerUp.x,
        pose.listenerUp.y,
        pose.listenerUp.z,
      );
    }

    for (const runtime of this.peers.values()) {
      const peerPos = pose.peerPositions[runtime.peerId];
      if (peerPos) {
        this.applyPeerPannerPosition(runtime, peerPos);
      }
    }
  }

  private sampleRms(analyser: AnalyserNode | null): number {
    if (!analyser) return 0;
    analyser.getByteTimeDomainData(this.meterBuffer);
    let sumSq = 0;
    for (let i = 0; i < this.meterBuffer.length; i++) {
      const v = (this.meterBuffer[i] - 128) / 128;
      sumSq += v * v;
    }
    return Math.sqrt(sumSq / this.meterBuffer.length);
  }

  private startMeteringLoop(): void {
    if (this.meteringTimerId !== null || typeof window === 'undefined') return;
    this.meteringTimerId = window.setInterval(() => {
      if (!this.joined) return;
      let changed = false;
      const nowMs = Date.now();
      const gateThresholdRms = this.getGateRmsThreshold();

      const localRms = this.isMuted ? 0 : this.sampleRms(this.localAnalyser);
      const rawLocalLevel = this.isMuted ? 0 : this.rmsToNormalizedLevel(localRms);

      // Apply noise gate with 260ms release hold to avoid clipping word endings
      if (!this.isMuted && localRms >= gateThresholdRms) {
        this.gateOpenUntilMs = nowMs + 260;
      }
      const nextGateOpen = !this.isMuted && nowMs <= this.gateOpenUntilMs;

      if (nextGateOpen !== this.gateCurrentlyOpen) {
        this.gateCurrentlyOpen = nextGateOpen;
        if (this.localGateGain && this.audioCtx) {
          const ctxNow = this.audioCtx.currentTime;
          try {
            this.localGateGain.gain.setTargetAtTime(
              nextGateOpen ? 1 : 0,
              ctxNow,
              nextGateOpen ? 0.015 : 0.055,
            );
          } catch {
            this.localGateGain.gain.value = nextGateOpen ? 1 : 0;
          }
        }
      }

      const nextLocalSpeaking = nextGateOpen;
      if (nextLocalSpeaking !== this.localSpeaking) {
        this.localSpeaking = nextLocalSpeaking;
        changed = true;
      }

      const smoothedLocal =
        rawLocalLevel > this.localLevel
          ? this.localLevel * 0.35 + rawLocalLevel * 0.65
          : this.localLevel * 0.62 + rawLocalLevel * 0.38;
      const clampedLocal = smoothedLocal < 0.02 ? 0 : Math.min(1, smoothedLocal);
      if (Math.round(clampedLocal * 20) !== Math.round(this.localLevel * 20)) {
        changed = true;
      }
      this.localLevel = clampedLocal;

      const nextSpeakingPeers = new Set<string>();
      const nextPeerLevels: Record<string, number> = {};
      for (const [peerId, runtime] of this.peers.entries()) {
        const peerRms = this.sampleRms(runtime.analyserNode);
        const rawPeerLevel = this.rmsToNormalizedLevel(peerRms);
        const prevPeerLevel = this.peerLevels[peerId] ?? 0;
        const smoothedPeer =
          rawPeerLevel > prevPeerLevel
            ? prevPeerLevel * 0.35 + rawPeerLevel * 0.65
            : prevPeerLevel * 0.62 + rawPeerLevel * 0.38;
        const clampedPeer = smoothedPeer < 0.02 ? 0 : Math.min(1, smoothedPeer);
        nextPeerLevels[peerId] = clampedPeer;

        if (peerRms > 0.022) {
          nextSpeakingPeers.add(peerId);
        }
        if (Math.round(clampedPeer * 20) !== Math.round(prevPeerLevel * 20)) {
          changed = true;
        }
      }

      if (nextSpeakingPeers.size !== this.speakingPeerIds.size) {
        changed = true;
      } else {
        for (const id of nextSpeakingPeers) {
          if (!this.speakingPeerIds.has(id)) {
            changed = true;
            break;
          }
        }
      }

      if (changed) {
        this.speakingPeerIds = nextSpeakingPeers;
        this.peerLevels = nextPeerLevels;
        this.emit();
      }
    }, 75);
  }

  private stopMeteringLoop(): void {
    if (this.meteringTimerId !== null) {
      window.clearInterval(this.meteringTimerId);
      this.meteringTimerId = null;
    }
  }
}

export const voiceChatEngine = new SpatialVoiceChatEngine();
