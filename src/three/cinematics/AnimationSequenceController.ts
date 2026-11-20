import * as THREE from 'three';
import {
  PLAYER_ARCHETYPES,
  tileToWorld,
  type PlayerState,
  type SpecialTileType,
  type TurnResolution,
} from '../../../shared/gameConfig';
import { DynamicCameraController } from '../DynamicCameraController';
import {
  type LadderBuildResult,
  type PawnModelHandle,
  type SerpentBuildResult,
} from '../models';
import { VfxPool } from './VfxPool';
import { createDicePhysicsRoll, type DicePhysicsSample } from './DicePhysicsRoll';
import type { AnimationStateName, CinematicEvent, CinematicSkillType } from './types';

export interface SequenceHostContext {
  isDisposed: () => boolean;
  pawns: Map<string, PawnModelHandle>;
  pawnArchetypes: Map<string, number>;
  pawnTargets: Map<string, THREE.Vector3>;
  snakesById: Map<string, SerpentBuildResult>;
  snakesByFromTile?: Map<number, SerpentBuildResult>;
  laddersById: Map<string, LadderBuildResult>;
  laddersByFromTile?: Map<number, LadderBuildResult>;
  diceGroup: THREE.Group;
  diceBasePos: THREE.Vector3;
  cameraController: DynamicCameraController;
  vfxPool: VfxPool;
  spawnParticleBurst: (
    origin: THREE.Vector3,
    colorHex: number,
    count: number,
    velocityScale?: number,
  ) => void;
  spawnAetherTrail: (
    origin: THREE.Vector3,
    primaryColorHex: number,
    accentColorHex: number,
    reduced: boolean,
  ) => void;
  spawnMagicDustExplosion?: (origin: THREE.Vector3, reduced: boolean) => void;
  triggerBoardShake?: (intensity?: number, durationSec?: number) => void;
  onDiceToss?: () => void;
  onDiceBounce?: (intensity: number, isRimHit: boolean) => void;
  onDiceSettle?: (faceValue: number) => void;
  onDicePoseUpdated?: () => void;
  getReducedEffects: () => boolean;
}

export interface TurnAnimationCallbacks {
  eventId?: number;
  archetypeIndex?: number;
  onDiceRolled?: (roll: number) => void;
  onHopStep?: (stepIndex: number, tile: number) => void;
  onRungStep?: (rungIndex: number, totalRungs: number) => void;
  onSnakeBite?: () => void;
  onSkillVfx?: (skillType: CinematicSkillType, blocked: boolean) => void;
  onSpecialTriggered?: (type: SpecialTileType, shieldBlocked: boolean) => void;
  onJumpTriggered?: (type: 'ladder' | 'snake', shieldBlocked: boolean) => void;
  onBattlePush?: () => void;
  onTeamSynergy?: () => void;
  onCinematicEvent?: (evt: CinematicEvent) => void;
}

// Reusable scratch objects for zero-GC animation math
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _vecC = new THREE.Vector3();
const _quatStart = new THREE.Quaternion();
const _quatTarget = new THREE.Quaternion();
const _quatSpin = new THREE.Quaternion();
const _quatGulp = new THREE.Quaternion();
const _lookMat = new THREE.Matrix4();
const _upAxis = new THREE.Vector3(0, 1, 0);
const _rightAxis = new THREE.Vector3(1, 0, 0);
const _diceSample: DicePhysicsSample = {
  position: new THREE.Vector3(),
  quaternion: new THREE.Quaternion(),
  scale: new THREE.Vector3(1, 1, 1),
  done: false,
};

export class AnimationSequenceController {
  private host: SequenceHostContext;
  private state: AnimationStateName = 'idle';
  private queue: Promise<void> = Promise.resolve();
  private processedEventIds = new Set<number>();
  private processedOrder: number[] = [];

  constructor(host: SequenceHostContext) {
    this.host = host;
  }

  public getState(): AnimationStateName {
    return this.state;
  }

  public enqueue(
    playerId: string,
    resolution: TurnResolution,
    allPlayersAfter: PlayerState[],
    callbacks: TurnAnimationCallbacks,
  ): Promise<void> {
    if (callbacks.eventId !== undefined && callbacks.eventId > 0) {
      if (this.processedEventIds.has(callbacks.eventId)) {
        return this.queue;
      }
      this.processedEventIds.add(callbacks.eventId);
      this.processedOrder.push(callbacks.eventId);
      if (this.processedOrder.length > 100) {
        const oldest = this.processedOrder.shift();
        if (oldest !== undefined) this.processedEventIds.delete(oldest);
      }
    }

    this.queue = this.queue.then(() =>
      this.runSequence(playerId, resolution, allPlayersAfter, callbacks),
    );
    return this.queue;
  }

  private emit(cb: TurnAnimationCallbacks, evt: CinematicEvent) {
    cb.onCinematicEvent?.(evt);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  private async runSequence(
    playerId: string,
    res: TurnResolution,
    allPlayersAfter: PlayerState[],
    cb: TurnAnimationCallbacks,
  ): Promise<void> {
    if (this.host.isDisposed()) return;
    const handle = this.host.pawns.get(playerId);
    if (!handle) return;

    const reduced = this.host.getReducedEffects();
    const archIdx = cb.archetypeIndex ?? this.host.pawnArchetypes.get(playerId) ?? 0;
    const archInfo = PLAYER_ARCHETYPES[archIdx % PLAYER_ARCHETYPES.length];

    // 1. DICE ROLL CINEMATIC
    this.state = 'dice';
    this.host.cameraController.setCinematicState('DICE_ACTION', {
      diceObject: this.host.diceGroup,
      followObject: handle.group,
    });
    await this.animateDiceThrow(res.roll, archInfo.hexNum, archInfo.accentHexNum, reduced);
    if (this.host.isDisposed()) return;
    cb.onDiceRolled?.(res.roll);
    await this.sleep(res.roll === 6 ? 340 : 170);

    // 2. TILE-BY-TILE PAWN HOPPING WITH AETHER TRAIL
    this.state = 'moving';
    this.host.cameraController.setCinematicState('PLAYER_FOLLOW', {
      followObject: handle.group,
    });
    handle.playClip('walk', 0.12);

    for (let i = 0; i < res.pathTiles.length; i++) {
      if (this.host.isDisposed()) return;
      const tile = res.pathTiles[i];
      const world = tileToWorld(tile);
      cb.onHopStep?.(i, tile);
      await this.animatePawnHop(
        handle.group,
        world.x,
        world.z,
        210,
        true,
        archInfo.hexNum,
        archInfo.accentHexNum,
        reduced,
      );
      this.host.pawnTargets.set(playerId, new THREE.Vector3(world.x, 0, world.z));
    }
    handle.playClip('idle', 0.14);

    // 3. SPECIAL TILE SKILL ACTIVATION
    if (res.specialHit) {
      await this.runSpecialSkillSequence(playerId, handle, res, cb, reduced);
      if (this.host.isDisposed()) return;
    }

    // 4. LADDER CLIMB OR SNAKE EATING SEQUENCE
    if (res.jumpTriggered) {
      if (res.jumpTriggered.type === 'ladder') {
        await this.runLadderClimbSequence(playerId, handle, res, cb, reduced);
      } else if (res.shieldBlocked) {
        await this.runSnakeShieldBlockSequence(playerId, handle, res, cb, reduced);
      } else {
        await this.runSnakeEatSequence(playerId, handle, res, cb, reduced);
      }
      if (this.host.isDisposed()) return;
    }

    // 5. BATTLE MODE CLASH OR TEAM SYNERGY SKILL
    if (res.battlePush) {
      await this.runBattlePushSequence(handle, res, cb, reduced);
      if (this.host.isDisposed()) return;
    }

    if (res.teamSynergy) {
      await this.runTeamSynergySequence(handle, res, allPlayersAfter, cb, reduced);
      if (this.host.isDisposed()) return;
    }

    // 6. VICTORY OR RETURN TO GAMEPLAY CAMERA
    this.recomputeSlots(allPlayersAfter);
    const updatedPlayer = allPlayersAfter.find((p) => p.id === playerId);
    handle.shieldRing.visible = (updatedPlayer?.shields ?? 0) > 0;

    if (res.won) {
      this.state = 'victory';
      handle.playClip('victory', 0.18);
      const winPos = tileToWorld(100);
      this.host.vfxPool.playSupportAura(
        new THREE.Vector3(winPos.x, 0, winPos.z),
        null,
        0xfde047,
        reduced,
      );
      this.host.spawnParticleBurst(
        new THREE.Vector3(winPos.x, 1.2, winPos.z),
        0xfde047,
        reduced ? 22 : 52,
      );
      this.host.cameraController.setCinematicState('VICTORY', { followObject: handle.group });
      this.emit(cb, { type: 'PLAYER_VICTORY', playerId, eventId: cb.eventId });
    } else {
      this.state = 'returning';
      this.host.cameraController.setCinematicState('RETURN_TO_GAMEPLAY', {
        followObject: handle.group,
      });
      await this.sleep(220);
      if (this.host.isDisposed()) return;
      this.state = 'idle';
      this.host.cameraController.setCinematicState('OVERVIEW', { followObject: handle.group });
      this.emit(cb, { type: 'PLAYER_TURN_CHANGED', playerId, eventId: cb.eventId });
    }
  }

  private async runSpecialSkillSequence(
    playerId: string,
    handle: PawnModelHandle,
    res: TurnResolution,
    cb: TurnAnimationCallbacks,
    reduced: boolean,
  ): Promise<void> {
    if (!res.specialHit) return;
    this.state = 'skill_action';

    const skillType: CinematicSkillType = res.shieldBlocked ? 'shield_block' : res.specialHit.type;
    const specWorld = tileToWorld(res.landedTile);
    const origin = new THREE.Vector3(specWorld.x, 0.2, specWorld.z);

    this.emit(cb, {
      type: 'SKILL_ACTIVATED',
      playerId,
      skillType,
      fromTile: res.landedTile,
      toTile: res.postSpecialTile,
      eventId: cb.eventId,
    });

    this.host.cameraController.setCinematicState('SKILL_ACTION', {
      followObject: handle.group,
      subPhase: 'cast',
    });
    handle.playClip('cast', 0.1);
    await this.sleep(160);
    if (this.host.isDisposed()) return;

    this.emit(cb, {
      type: 'SKILL_EFFECT_START',
      playerId,
      skillType,
      fromTile: res.landedTile,
      toTile: res.postSpecialTile,
      eventId: cb.eventId,
    });

    cb.onSpecialTriggered?.(res.specialHit.type, res.shieldBlocked);
    cb.onSkillVfx?.(skillType, res.shieldBlocked);

    const colorMap: Record<SpecialTileType, number> = {
      boost: 0x34d399,
      extra_roll: 0xfbbf24,
      shield: 0x60a5fa,
      curse: 0xc084fc,
    };
    const vfxColor = res.shieldBlocked ? 0x60a5fa : colorMap[res.specialHit.type];

    if (res.shieldBlocked || res.specialHit.type === 'shield') {
      this.host.vfxPool.playShieldEffect(origin, 0x60a5fa, res.shieldBlocked, reduced);
      if (res.specialHit.type === 'shield') {
        handle.shieldRing.visible = true;
      }
    } else if (res.specialHit.type === 'boost' || res.specialHit.type === 'curse') {
      this.host.vfxPool.playMovementBurst(
        origin,
        vfxColor,
        res.specialHit.type === 'curse',
        reduced,
      );
    } else {
      this.host.vfxPool.playSupportAura(origin, null, vfxColor, reduced);
    }

    this.host.spawnParticleBurst(
      new THREE.Vector3(origin.x, 0.65, origin.z),
      vfxColor,
      reduced ? 12 : 24,
    );

    if (res.postSpecialTile !== res.landedTile) {
      const postWorld = tileToWorld(res.postSpecialTile);
      handle.playClip('walk', 0.1);
      await this.animatePawnHop(
        handle.group,
        postWorld.x,
        postWorld.z,
        360,
        true,
        vfxColor,
        0xfef08a,
        reduced,
      );
      this.host.pawnTargets.set(playerId, new THREE.Vector3(postWorld.x, 0, postWorld.z));
      handle.playClip('idle', 0.14);
      if (res.jumpTriggered) {
        await this.sleep(190);
      }
    } else {
      await this.sleep(360);
    }

    this.emit(cb, {
      type: 'SKILL_EFFECT_COMPLETE',
      playerId,
      skillType,
      fromTile: res.landedTile,
      toTile: res.postSpecialTile,
      eventId: cb.eventId,
    });
  }

  private async runLadderClimbSequence(
    playerId: string,
    handle: PawnModelHandle,
    res: TurnResolution,
    cb: TurnAnimationCallbacks,
    reduced: boolean,
  ): Promise<void> {
    if (!res.jumpTriggered) return;
    this.state = 'ladder_climb';

    const ladder =
      this.host.laddersByFromTile?.get(res.jumpTriggered.from) ??
      this.host.laddersById.get(res.jumpTriggered.id);
    const startWorld = tileToWorld(res.jumpTriggered.from);
    const endWorld = tileToWorld(res.jumpTriggered.to);
    const archIdx = cb.archetypeIndex ?? this.host.pawnArchetypes.get(playerId) ?? 0;
    const archInfo = PLAYER_ARCHETYPES[archIdx % PLAYER_ARCHETYPES.length];

    this.emit(cb, {
      type: 'LADDER_TRIGGERED',
      playerId,
      ladderId: res.jumpTriggered.id,
      fromTile: res.jumpTriggered.from,
      toTile: res.jumpTriggered.to,
      eventId: cb.eventId,
    });

    cb.onJumpTriggered?.('ladder', false);

    // Smooth camera slide along ladder side angle
    this.host.cameraController.setCinematicState('LADDER_CLIMB', {
      followObject: handle.group,
      forwardHint: ladder?.climbForward ?? null,
      subPhase: 'climb',
    });

    // Align pawn rotation cleanly toward the ladder ascent direction
    if (ladder) {
      await this.rotatePawnToward(handle.group, ladder.climbForward, 170);
    }

    this.host.vfxPool.playSupportAura(
      new THREE.Vector3(startWorld.x, 0, startWorld.z),
      null,
      0xfbbf24,
      reduced,
    );
    this.host.spawnParticleBurst(
      new THREE.Vector3(startWorld.x, 0.5, startWorld.z),
      0xfbbf24,
      reduced ? 12 : 24,
    );

    this.emit(cb, {
      type: 'LADDER_CLIMB_START',
      playerId,
      ladderId: res.jumpTriggered.id,
      fromTile: res.jumpTriggered.from,
      toTile: res.jumpTriggered.to,
      eventId: cb.eventId,
    });

    if (ladder) {
      handle.playClip('climb', 0.12);
      const durationMs = Math.min(1850, Math.max(1050, ladder.rungPositions.length * 165));
      await this.animatePawnClimbingLadder(
        handle.group,
        ladder,
        durationMs,
        (rungIdx, total) => cb.onRungStep?.(rungIdx, total),
        archInfo.hexNum,
        archInfo.accentHexNum,
        reduced,
      );
      handle.playClip('idle', 0.14);
    }

    // Top landing camera frame + burst
    this.host.cameraController.setCinematicState('LADDER_CLIMB', {
      followObject: handle.group,
      forwardHint: ladder?.climbForward ?? null,
      subPhase: 'top',
    });
    this.host.pawnTargets.set(playerId, new THREE.Vector3(endWorld.x, 0, endWorld.z));
    this.host.spawnParticleBurst(
      new THREE.Vector3(endWorld.x, 0.65, endWorld.z),
      0xfde047,
      reduced ? 12 : 26,
    );
    await this.sleep(240);

    this.emit(cb, {
      type: 'LADDER_CLIMB_COMPLETE',
      playerId,
      ladderId: res.jumpTriggered.id,
      fromTile: res.jumpTriggered.from,
      toTile: res.jumpTriggered.to,
      eventId: cb.eventId,
    });
  }

  private async runSnakeShieldBlockSequence(
    playerId: string,
    handle: PawnModelHandle,
    res: TurnResolution,
    cb: TurnAnimationCallbacks,
    reduced: boolean,
  ): Promise<void> {
    if (!res.jumpTriggered) return;
    this.state = 'skill_action';
    const pos = tileToWorld(res.postSpecialTile);

    this.emit(cb, {
      type: 'SKILL_ACTIVATED',
      playerId,
      skillType: 'shield_block',
      fromTile: res.jumpTriggered.from,
      eventId: cb.eventId,
    });
    this.host.cameraController.setCinematicState('SKILL_ACTION', {
      followObject: handle.group,
      subPhase: 'cast',
    });
    handle.playClip('cast', 0.1);
    cb.onJumpTriggered?.('snake', true);
    cb.onSkillVfx?.('shield_block', true);
    this.host.triggerBoardShake?.(0.5, 0.34);
    this.host.vfxPool.playShieldEffect(new THREE.Vector3(pos.x, 0.2, pos.z), 0x60a5fa, true, reduced);
    this.host.spawnParticleBurst(new THREE.Vector3(pos.x, 0.85, pos.z), 0x60a5fa, reduced ? 14 : 28);
    await this.sleep(480);
    handle.playClip('idle', 0.15);

    this.emit(cb, {
      type: 'SKILL_EFFECT_COMPLETE',
      playerId,
      skillType: 'shield_block',
      fromTile: res.jumpTriggered.from,
      eventId: cb.eventId,
    });
  }

  private async runSnakeEatSequence(
    playerId: string,
    handle: PawnModelHandle,
    res: TurnResolution,
    cb: TurnAnimationCallbacks,
    reduced: boolean,
  ): Promise<void> {
    if (!res.jumpTriggered) return;
    this.state = 'snake_eat';

    const snake =
      this.host.snakesByFromTile?.get(res.jumpTriggered.from) ??
      this.host.snakesById.get(res.jumpTriggered.id);
    const headWorld = tileToWorld(res.jumpTriggered.from);
    const tailWorld = tileToWorld(res.jumpTriggered.to);

    this.emit(cb, {
      type: 'SNAKE_TRIGGERED',
      playerId,
      snakeId: res.jumpTriggered.id,
      fromTile: res.jumpTriggered.from,
      toTile: res.jumpTriggered.to,
      eventId: cb.eventId,
    });
    cb.onJumpTriggered?.('snake', false);
    this.host.triggerBoardShake?.(0.95, 0.54);

    if (!snake) {
      await this.sleep(450);
      return;
    }

    snake.eatState.active = true;
    snake.setForcedLod0(true);
    snake.eatState.swallowAmp = 0;
    snake.eatState.swallowProgress = -1;

    const headFocus = snake.baseHeadPos.clone();
    const headFwd = snake.curve.getTangent(0).negate();

    // Step 1: Close-up approach on serpent head detecting pawn
    this.host.cameraController.setCinematicState('SNAKE_EAT', {
      followObject: handle.group,
      focusPoint: headFocus,
      forwardHint: headFwd,
      subPhase: 'approach',
    });

    // Rotate snake head cleanly toward the pawn standing on head tile (guard degenerate zero-distance)
    _vecA.set(handle.group.position.x, snake.headGroup.position.y, handle.group.position.z);
    if (_vecA.distanceToSquared(snake.headGroup.position) > 0.0004) {
      _lookMat.lookAt(_vecA, snake.headGroup.position, _upAxis);
      _quatTarget.setFromRotationMatrix(_lookMat);
    } else {
      _quatTarget.copy(snake.baseHeadQuat);
    }

    const detectDuration = 340;
    const detectStart = performance.now();
    _quatStart.copy(snake.headGroup.quaternion);

    await new Promise<void>((resolve) => {
      const stepDetect = (now: number) => {
        if (this.host.isDisposed()) return resolve();
        const t = Math.min(1, (now - detectStart) / detectDuration);
        const smooth = t * t * (3 - 2 * t);
        snake.headGroup.quaternion.slerpQuaternions(_quatStart, _quatTarget, smooth);

        // Open upper cranium & lower jaw wide + rapid tongue flick
        snake.upperJawGroup.rotation.x = THREE.MathUtils.lerp(0, -0.5, smooth);
        snake.jawGroup.rotation.x = THREE.MathUtils.lerp(0.1, 0.72, smooth);
        snake.tongueMesh.scale.z = 0.8 + Math.sin(t * Math.PI * 6) * 0.45;

        // Pawn slightly flinches back right before bite
        handle.group.rotation.z = Math.sin(t * Math.PI * 5) * 0.08 * (1 - t);

        if (t < 1) {
          requestAnimationFrame(stepDetect);
        } else {
          handle.group.rotation.z = 0;
          resolve();
        }
      };
      requestAnimationFrame(stepDetect);
    });
    if (this.host.isDisposed()) {
      snake.setForcedLod0(false);
      return;
    }

    this.emit(cb, {
      type: 'SNAKE_EAT_START',
      playerId,
      snakeId: res.jumpTriggered.id,
      fromTile: res.jumpTriggered.from,
      toTile: res.jumpTriggered.to,
      eventId: cb.eventId,
    });
    cb.onSnakeBite?.();
    this.host.triggerBoardShake?.(0.72, 0.38);

    // Step 2: Serpent strikes forward & draws pawn smoothly inside dark oral gullet cavity (zero skin clipping!)
    this.host.cameraController.setCinematicState('SNAKE_EAT', {
      followObject: handle.group,
      focusPoint: headFocus,
      forwardHint: headFwd,
      subPhase: 'bite',
    });

    const biteDuration = 460;
    const biteStart = performance.now();
    _vecB.copy(handle.group.position);

    await new Promise<void>((resolve) => {
      const stepBite = (now: number) => {
        if (this.host.isDisposed()) return resolve();
        const t = Math.min(1, (now - biteStart) / biteDuration);
        snake.gulletTarget.getWorldPosition(_vecA);

        if (t < 0.65) {
          // Draw pawn into throat gullet and shrink smoothly so it never pokes through scales
          const u = t / 0.65;
          const easeU = u * u;
          handle.group.position.lerpVectors(_vecB, _vecA, easeU);
          handle.group.position.y += Math.sin(u * Math.PI) * 0.25;
          const s = THREE.MathUtils.lerp(1.0, 0.08, easeU);
          handle.group.scale.setScalar(s);

          // Head lunges slightly forward toward pawn
          snake.headGroup.position.lerpVectors(snake.baseHeadPos, _vecB, Math.sin(u * Math.PI) * 0.22);
        } else {
          // Pawn vanished inside gullet -> jaws snap shut!
          handle.group.visible = false;
          const closeT = (t - 0.65) / 0.35;
          const easeClose = 1 - Math.pow(1 - closeT, 2);
          snake.upperJawGroup.rotation.x = THREE.MathUtils.lerp(-0.5, 0.0, easeClose);
          snake.jawGroup.rotation.x = THREE.MathUtils.lerp(0.72, 0.04, easeClose);
          snake.headGroup.position.lerp(snake.baseHeadPos, easeClose);
        }

        if (t < 1) {
          requestAnimationFrame(stepBite);
        } else {
          snake.upperJawGroup.rotation.x = 0;
          snake.jawGroup.rotation.x = 0.05;
          snake.headGroup.position.copy(snake.baseHeadPos);
          handle.group.visible = false;
          resolve();
        }
      };
      requestAnimationFrame(stepBite);
    });
    if (this.host.isDisposed()) {
      snake.setForcedLod0(false);
      return;
    }

    this.host.spawnParticleBurst(
      new THREE.Vector3(headWorld.x, 0.58, headWorld.z),
      0xf43f5e,
      reduced ? 10 : 20,
    );

    // Step 3: Swallowing bulge travels from throat down the serpentine spline while camera tracks it!
    this.host.cameraController.setCinematicState('SNAKE_EAT', {
      focusPoint: headFocus,
      forwardHint: headFwd,
      subPhase: 'swallow',
    });

    const snakePathLen = snake.curve.getLength();
    const swallowDuration = Math.min(2150, Math.max(1050, Math.round(snakePathLen * 125)));
    const swallowStart = performance.now();
    _quatStart.copy(snake.headGroup.quaternion);

    await new Promise<void>((resolve) => {
      const stepSwallow = (now: number) => {
        if (this.host.isDisposed()) return resolve();
        const t = Math.min(1, (now - swallowStart) / swallowDuration);
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        snake.eatState.swallowProgress = ease;
        snake.eatState.swallowAmp = Math.sin(t * Math.PI) * 1.18;

        snake.headGroup.quaternion.slerpQuaternions(_quatStart, snake.baseHeadQuat, Math.min(1, t * 1.6));

        // Subtle throat gulping motion early in swallow (quaternion-safe!)
        if (t < 0.35) {
          const gulp = Math.sin((t / 0.35) * Math.PI * 2) * 0.12;
          _quatGulp.setFromAxisAngle(_rightAxis, gulp);
          snake.headGroup.quaternion.multiply(_quatGulp);
        }

        snake.curve.getPointAt(ease, _vecC);
        this.host.cameraController.setFocusPoint(_vecC);

        if (t < 1) {
          requestAnimationFrame(stepSwallow);
        } else {
          snake.eatState.swallowProgress = -1;
          snake.eatState.swallowAmp = 0;
          snake.headGroup.quaternion.copy(snake.baseHeadQuat);
          resolve();
        }
      };
      requestAnimationFrame(stepSwallow);
    });
    if (this.host.isDisposed()) {
      snake.setForcedLod0(false);
      return;
    }

    // Step 4: Pawn emerges cleanly at tail tile with bounce recovery!
    handle.group.position.set(tailWorld.x, 0, tailWorld.z);
    handle.group.scale.setScalar(0.15);
    handle.group.visible = true;
    handle.playClip('idle', 0.1);
    this.host.pawnTargets.set(playerId, new THREE.Vector3(tailWorld.x, 0, tailWorld.z));

    this.host.vfxPool.playMovementBurst(
      new THREE.Vector3(tailWorld.x, 0.2, tailWorld.z),
      0x34d399,
      true,
      reduced,
    );
    this.host.spawnParticleBurst(
      new THREE.Vector3(tailWorld.x, 0.45, tailWorld.z),
      0x34d399,
      reduced ? 10 : 18,
    );

    const emergeDuration = 320;
    const emergeStart = performance.now();
    await new Promise<void>((resolve) => {
      const stepEmerge = (now: number) => {
        if (this.host.isDisposed()) return resolve();
        const t = Math.min(1, (now - emergeStart) / emergeDuration);
        const s = 0.15 + Math.sin(t * Math.PI * 0.65) * 0.92;
        handle.group.scale.setScalar(t >= 0.98 ? 1 : s);
        handle.group.position.y = Math.sin(t * Math.PI) * 0.35;
        if (t < 1) {
          requestAnimationFrame(stepEmerge);
        } else {
          handle.group.scale.setScalar(1);
          handle.group.position.set(tailWorld.x, 0, tailWorld.z);
          resolve();
        }
      };
      requestAnimationFrame(stepEmerge);
    });

    snake.eatState.active = false;
    snake.setForcedLod0(false);

    this.emit(cb, {
      type: 'SNAKE_EAT_COMPLETE',
      playerId,
      snakeId: res.jumpTriggered.id,
      fromTile: res.jumpTriggered.from,
      toTile: res.jumpTriggered.to,
      eventId: cb.eventId,
    });
  }

  private async runBattlePushSequence(
    attacker: PawnModelHandle,
    res: TurnResolution,
    cb: TurnAnimationCallbacks,
    reduced: boolean,
  ): Promise<void> {
    if (!res.battlePush) return;
    this.state = 'skill_action';

    const bp = res.battlePush;
    const victim = this.host.pawns.get(bp.targetPlayerId);
    const clashWorld = tileToWorld(bp.fromTile);

    this.emit(cb, {
      type: 'SKILL_ACTIVATED',
      playerId: bp.targetPlayerId,
      skillType: 'battle_attack',
      fromTile: bp.fromTile,
      toTile: bp.toTile,
      eventId: cb.eventId,
    });

    this.host.cameraController.setCinematicState('SKILL_ACTION', {
      followObject: attacker.group,
      secondaryObject: victim?.group ?? null,
      subPhase: 'cast',
    });

    attacker.playClip('cast', 0.1);
    cb.onSkillVfx?.('battle_attack', bp.blockedByShield);

    const attackerPos = attacker.group.position.clone();
    const targetPos = victim
      ? victim.group.position.clone()
      : new THREE.Vector3(clashWorld.x, 0, clashWorld.z);

    this.host.vfxPool.playProjectileAttack(
      attackerPos,
      targetPos,
      bp.blockedByShield,
      reduced,
    );
    await this.sleep(360);
    if (this.host.isDisposed()) return;

    if (bp.blockedByShield) {
      this.host.vfxPool.playShieldEffect(targetPos, 0x60a5fa, true, reduced);
      this.host.spawnParticleBurst(
        new THREE.Vector3(clashWorld.x, 0.75, clashWorld.z),
        0x60a5fa,
        reduced ? 12 : 22,
      );
    } else {
      this.host.spawnParticleBurst(
        new THREE.Vector3(clashWorld.x, 0.75, clashWorld.z),
        0xf43f5e,
        reduced ? 14 : 28,
      );
      if (victim) {
        const pushedWorld = tileToWorld(bp.toTile);
        await this.animatePawnHop(victim.group, pushedWorld.x, pushedWorld.z, 380, true);
        this.host.pawnTargets.set(bp.targetPlayerId, new THREE.Vector3(pushedWorld.x, 0, pushedWorld.z));
      }
    }

    attacker.playClip('idle', 0.14);
    cb.onBattlePush?.();

    this.emit(cb, {
      type: 'SKILL_EFFECT_COMPLETE',
      playerId: bp.targetPlayerId,
      skillType: 'battle_attack',
      fromTile: bp.fromTile,
      toTile: bp.toTile,
      eventId: cb.eventId,
    });
  }

  private async runTeamSynergySequence(
    actor: PawnModelHandle,
    res: TurnResolution,
    allPlayersAfter: PlayerState[],
    cb: TurnAnimationCallbacks,
    reduced: boolean,
  ): Promise<void> {
    if (!res.teamSynergy) return;
    this.state = 'skill_action';

    const syn = res.teamSynergy;
    const allyHandle = this.host.pawns.get(syn.allyPlayerId);
    const synWorld = tileToWorld(res.finalTile);

    this.emit(cb, {
      type: 'SKILL_ACTIVATED',
      playerId: syn.allyPlayerId,
      skillType: 'team_synergy',
      toTile: res.finalTile,
      eventId: cb.eventId,
    });

    this.host.cameraController.setCinematicState('SKILL_ACTION', {
      followObject: actor.group,
      secondaryObject: allyHandle?.group ?? null,
      subPhase: 'resolve',
    });

    actor.playClip('cast', 0.12);
    allyHandle?.playClip('cast', 0.12);
    cb.onSkillVfx?.('team_synergy', false);

    this.host.vfxPool.playSupportAura(
      new THREE.Vector3(synWorld.x, 0, synWorld.z),
      allyHandle ? allyHandle.group.position : null,
      0xfde047,
      reduced,
    );
    this.host.spawnParticleBurst(
      new THREE.Vector3(synWorld.x, 0.78, synWorld.z),
      0xfde047,
      reduced ? 12 : 24,
    );
    cb.onTeamSynergy?.();
    await this.sleep(460);

    actor.playClip('idle', 0.14);
    allyHandle?.playClip('idle', 0.14);

    // Prevent unused parameter notice on allPlayersAfter while allowing team verification
    void allPlayersAfter;

    this.emit(cb, {
      type: 'SKILL_EFFECT_COMPLETE',
      playerId: syn.allyPlayerId,
      skillType: 'team_synergy',
      toTile: res.finalTile,
      eventId: cb.eventId,
    });
  }

  private recomputeSlots(players: PlayerState[]) {
    for (const p of players) {
      const world = tileToWorld(p.tile);
      const sameTile = players.filter((other) => other.tile === p.tile);
      if (sameTile.length <= 1) {
        this.host.pawnTargets.set(p.id, new THREE.Vector3(world.x, 0, world.z));
      } else {
        const idx = Math.max(0, sameTile.findIndex((other) => other.id === p.id));
        const offsets: Array<[number, number]> = [
          [-0.36, -0.32],
          [0.36, -0.32],
          [-0.36, 0.32],
          [0.36, 0.32],
        ];
        const [ox, oz] = offsets[idx % offsets.length];
        this.host.pawnTargets.set(p.id, new THREE.Vector3(world.x + ox, 0, world.z + oz));
      }
    }
  }

  private animateDiceThrow(
    targetFace: number,
    archetypeColorHex: number,
    accentColorHex: number,
    reduced: boolean,
  ): Promise<void> {
    return new Promise((resolve) => {
      const sim = createDicePhysicsRoll(
        this.host.diceGroup.position,
        this.host.diceGroup.quaternion,
        this.host.diceBasePos,
        targetFace,
        reduced,
      );

      const startMs = performance.now();
      let nextImpactIdx = 0;
      let tossTriggered = false;
      let lastTrailMs = 0;
      let heavyFloorHits = 0;

      const step = (now: number) => {
        if (this.host.isDisposed()) return resolve();
        const elapsedMs = now - startMs;
        const elapsedSec = elapsedMs / 1000;

        // Fire toss sound & launch burst right as wind-up transitions into airborne launch
        if (!tossTriggered && elapsedSec >= sim.windupSec) {
          tossTriggered = true;
          this.host.onDiceToss?.();
          if (!reduced) {
            _vecA.set(
              this.host.diceGroup.position.x,
              this.host.diceBasePos.y - 0.35,
              this.host.diceGroup.position.z,
            );
            this.host.spawnParticleBurst(_vecA, accentColorHex, 7, 0.55);
          }
        }

        // Sample rigid-body physics pose (zero GC)
        sim.sample(elapsedSec, _diceSample);
        this.host.diceGroup.position.copy(_diceSample.position);
        this.host.diceGroup.quaternion.copy(_diceSample.quaternion);
        this.host.diceGroup.scale.copy(_diceSample.scale);
        this.host.onDicePoseUpdated?.();

        // Dispatch any physical collision impacts reached on this frame
        while (nextImpactIdx < sim.impacts.length && sim.impacts[nextImpactIdx].timeSec <= elapsedSec) {
          const imp = sim.impacts[nextImpactIdx];
          nextImpactIdx++;

          this.host.onDiceBounce?.(imp.intensity, imp.isRimHit);

          _vecB.set(imp.x, imp.y + 0.06, imp.z);
          const sparkCount = reduced
            ? Math.max(3, Math.round(imp.intensity * 6))
            : Math.max(5, Math.round(imp.intensity * 14));
          const sparkColor = imp.isRimHit
            ? 0xfbbf24
            : imp.intensity > 0.55
              ? archetypeColorHex
              : accentColorHex;
          this.host.spawnParticleBurst(_vecB, sparkColor, sparkCount, 0.45 + imp.intensity * 0.55);

          if (!imp.isRimHit && imp.intensity > 0.32) {
            heavyFloorHits++;
            this.host.vfxPool.playAetherStepWake(_vecB, archetypeColorHex, reduced);
            if (!reduced && heavyFloorHits === 1 && imp.intensity > 0.45) {
              this.host.triggerBoardShake?.(0.26 * imp.intensity, 0.16);
            }
          }
        }

        // Subtle mid-air energy trail while cube is high off the altar
        const altitude = _diceSample.position.y - this.host.diceBasePos.y;
        if (!reduced && altitude > 0.45 && elapsedMs - lastTrailMs >= 58) {
          lastTrailMs = elapsedMs;
          _vecA.set(
            _diceSample.position.x + (Math.random() - 0.5) * 0.35,
            _diceSample.position.y,
            _diceSample.position.z + (Math.random() - 0.5) * 0.35,
          );
          this.host.spawnParticleBurst(
            _vecA,
            Math.random() > 0.4 ? archetypeColorHex : accentColorHex,
            3,
            0.35,
          );
        }

        if (!_diceSample.done && elapsedSec < sim.durationSec + 0.06) {
          requestAnimationFrame(step);
        } else {
          // Lock exact settled physics position & target face orientation
          this.host.diceGroup.position.copy(sim.finalPosition);
          this.host.diceGroup.quaternion.copy(sim.finalQuaternion);
          this.host.diceGroup.scale.set(1, 1, 1);
          this.host.onDicePoseUpdated?.();
          this.host.onDiceSettle?.(targetFace);

          _vecC.set(sim.finalPosition.x, sim.finalPosition.y + 0.32, sim.finalPosition.z);
          if (targetFace === 6) {
            this.host.spawnMagicDustExplosion?.(sim.finalPosition, reduced);
          } else {
            this.host.spawnParticleBurst(_vecC, archetypeColorHex, reduced ? 8 : 16, 0.85);
            if (!reduced) {
              this.host.spawnParticleBurst(_vecC, accentColorHex, 9, 0.82);
              this.host.vfxPool.playAetherStepWake(_vecC, accentColorHex, false);
            }
          }
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

  private animatePawnHop(
    pawn: THREE.Group,
    targetX: number,
    targetZ: number,
    durationMs: number,
    faceDirection: boolean,
    primaryColorHex = 0x38bdf8,
    accentColorHex = 0xfef08a,
    reduced = false,
  ): Promise<void> {
    return new Promise((resolve) => {
      const startX = pawn.position.x;
      const startZ = pawn.position.z;
      const dx = targetX - startX;
      const dz = targetZ - startZ;
      const startRotY = pawn.rotation.y;
      const targetRotY =
        faceDirection && Math.hypot(dx, dz) > 0.05 ? Math.atan2(dx, dz) : startRotY;
      const rotDelta = Math.atan2(Math.sin(targetRotY - startRotY), Math.cos(targetRotY - startRotY));
      const startTime = performance.now();
      let lastTrailEmit = -40;

      // Emit glowing Aether Wake ring at takeoff tile
      _vecB.set(startX, 0.04, startZ);
      this.host.vfxPool.playAetherStepWake(_vecB, accentColorHex, reduced);

      const step = (now: number) => {
        if (this.host.isDisposed()) return resolve();
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / durationMs);
        const smooth = t * t * (3 - 2 * t);
        const hopY = Math.sin(t * Math.PI) * 0.65;

        pawn.position.set(
          THREE.MathUtils.lerp(startX, targetX, smooth),
          hopY,
          THREE.MathUtils.lerp(startZ, targetZ, smooth),
        );
        if (faceDirection) {
          pawn.rotation.y = startRotY + rotDelta * Math.min(1, t * 2.5);
        }

        // Stream luminous Aether Trail particles behind the moving pawn
        const trailInterval = reduced ? 48 : 24;
        if (elapsed - lastTrailEmit >= trailInterval) {
          lastTrailEmit = elapsed;
          _vecC.set(pawn.position.x, pawn.position.y + 0.32, pawn.position.z);
          this.host.spawnAetherTrail(_vecC, primaryColorHex, accentColorHex, reduced);
        }

        const stretch = 1 + Math.sin(t * Math.PI) * 0.14;
        const squash = 1 / Math.sqrt(stretch);
        pawn.scale.set(squash, stretch, squash);

        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          pawn.position.set(targetX, 0, targetZ);
          pawn.scale.set(1, 1, 1);
          _vecB.set(targetX, 0.04, targetZ);
          this.host.vfxPool.playAetherStepWake(_vecB, primaryColorHex, reduced);
          this.host.spawnAetherTrail(_vecB, primaryColorHex, accentColorHex, reduced);
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

  private rotatePawnToward(pawn: THREE.Group, dir: THREE.Vector3, durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      const startY = pawn.rotation.y;
      const targetY = Math.atan2(dir.x, dir.z);
      const delta = Math.atan2(Math.sin(targetY - startY), Math.cos(targetY - startY));
      const startTime = performance.now();

      const step = (now: number) => {
        if (this.host.isDisposed()) return resolve();
        const t = Math.min(1, (now - startTime) / durationMs);
        const smooth = t * t * (3 - 2 * t);
        pawn.rotation.y = startY + delta * smooth;
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  private animatePawnClimbingLadder(
    pawn: THREE.Group,
    ladder: LadderBuildResult,
    durationMs: number,
    onRungReached: (rungIndex: number, totalRungs: number) => void,
    primaryColorHex = 0xfbbf24,
    accentColorHex = 0xfef08a,
    reduced = false,
  ): Promise<void> {
    return new Promise((resolve) => {
      const totalRungs = Math.max(1, ladder.rungPositions.length);
      let lastRungHit = -1;
      let lastTrailEmit = -40;
      const startTime = performance.now();

      const step = (now: number) => {
        if (this.host.isDisposed()) return resolve();
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / durationMs);
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        ladder.curve.getPointAt(ease, _vecA);
        // Subtle step cadence along rungs while staying seated on the ladder incline
        const rungPhase = ease * totalRungs;
        const rungIdx = Math.min(totalRungs - 1, Math.floor(rungPhase));
        if (rungIdx > lastRungHit && t > 0.05 && t < 0.96) {
          lastRungHit = rungIdx;
          onRungReached(rungIdx, totalRungs);
        }

        const stepPulse = Math.abs(Math.sin(rungPhase * Math.PI)) * 0.09;
        pawn.position.set(_vecA.x, _vecA.y + stepPulse, _vecA.z);

        // Emit Aether Trail along ladder ascent
        const trailInterval = reduced ? 52 : 28;
        if (elapsed - lastTrailEmit >= trailInterval) {
          lastTrailEmit = elapsed;
          _vecC.set(pawn.position.x, pawn.position.y + 0.28, pawn.position.z);
          this.host.spawnAetherTrail(_vecC, primaryColorHex, accentColorHex, reduced);
        }

        // Keep pawn tilted subtly along the ladder ascent & facing upward direction
        const targetYaw = Math.atan2(ladder.climbForward.x, ladder.climbForward.z);
        pawn.rotation.set(0.18, targetYaw, 0);

        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          ladder.curve.getPointAt(1, _vecA);
          pawn.position.set(_vecA.x, 0, _vecA.z);
          pawn.rotation.set(0, targetYaw, 0);
          pawn.scale.set(1, 1, 1);
          this.host.vfxPool.playAetherStepWake(_vecA, accentColorHex, reduced);
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }
}
