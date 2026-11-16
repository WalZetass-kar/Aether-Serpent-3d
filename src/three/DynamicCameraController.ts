import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CinematicCameraState } from './cinematics/types';

export type CameraMode = 'auto_follow' | 'isometric' | 'cinematic' | 'manual';
export type CameraPhase = 'overview' | 'dice' | 'pawn_follow' | 'climb_slide' | 'victory';
export type { CinematicCameraState };

export interface CameraSettings {
  mode: CameraMode;
  distance: number; // 6.5 - 22
  height: number; // 4.0 - 18.0
  sensitivity: number; // 0.4 - 2.0
  smoothness: number; // 2.0 - 14.0 (damp lambda)
  fov: number; // 34 - 64
  reducedEffects: boolean;
}

export interface CameraDofTarget {
  active: boolean;
  focus: number;
  aperture: number;
  maxblur: number;
}

export const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
  mode: 'auto_follow',
  distance: 12.2,
  height: 9.4,
  sensitivity: 1.05,
  smoothness: 5.5,
  fov: 48,
  reducedEffects: false,
};

export interface CinematicStateConfig {
  followObject?: THREE.Object3D | null;
  diceObject?: THREE.Object3D | null;
  secondaryObject?: THREE.Object3D | null;
  focusPoint?: THREE.Vector3 | null;
  forwardHint?: THREE.Vector3 | null;
  subPhase?: 'approach' | 'bite' | 'swallow' | 'climb' | 'top' | 'cast' | 'resolve';
}

interface ObstacleCylinder {
  x: number;
  z: number;
  radius: number;
  height: number;
}

const STATIC_OBSTACLES: ObstacleCylinder[] = [
  { x: -11.1, z: -11.1, radius: 1.35, height: 4.1 },
  { x: 11.1, z: -11.1, radius: 1.35, height: 4.1 },
  { x: -11.1, z: 11.1, radius: 1.35, height: 4.1 },
  { x: 11.1, z: 11.1, radius: 1.35, height: 4.1 },
];

// Pre-allocated scratch vectors (zero GC in render loop)
const _worldPos = new THREE.Vector3();
const _secPos = new THREE.Vector3();
const _desiredPos = new THREE.Vector3();
const _desiredTarget = new THREE.Vector3();
const _sideDir = new THREE.Vector3();
const _prevFollowPos = new THREE.Vector3();
const _dofTargetPos = new THREE.Vector3();
const _dofCamForward = new THREE.Vector3();
const _dofToTarget = new THREE.Vector3();

export class DynamicCameraController {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private settings: CameraSettings;

  private cinematicState: CinematicCameraState = 'OVERVIEW';
  private phase: CameraPhase = 'overview';
  private followObject: THREE.Object3D | null = null;
  private diceObject: THREE.Object3D | null = null;
  private secondaryObject: THREE.Object3D | null = null;
  private customFocusPoint = new THREE.Vector3();
  private hasCustomFocus = false;
  private forwardHint = new THREE.Vector3(0, 0, -1);
  private hasForwardHint = false;
  private subPhase: NonNullable<CinematicStateConfig['subPhase']> = 'approach';
  private climbKind: 'ladder' | 'snake' = 'ladder';
  private overviewSnapshot: 'isometric' | 'topdown' = 'isometric';

  private hasPrevFollow = false;
  private smoothedVelocity = new THREE.Vector3(0, 0, 0);
  private victoryOrbitAngle = 0.35;

  private isUserDragging = false;
  private manualPauseUntil = 0;
  private oneShotTransitionActive = false;

  constructor(
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls,
    initialSettings: Partial<CameraSettings> = {},
  ) {
    this.camera = camera;
    this.controls = controls;
    this.settings = { ...DEFAULT_CAMERA_SETTINGS, ...initialSettings };

    this.applyControlsAndFov(1, true);

    this.controls.addEventListener('start', this.handleControlsStart);
    this.controls.addEventListener('end', this.handleControlsEnd);
  }

  private handleControlsStart = () => {
    this.isUserDragging = true;
    this.oneShotTransitionActive = false;
  };

  private handleControlsEnd = () => {
    this.isUserDragging = false;
    // Give mobile/touch players plenty of time to inspect the board freely after dragging/pinching
    this.manualPauseUntil = performance.now() + 4200;
  };

  public getSettings(): CameraSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<CameraSettings>) {
    this.settings = {
      ...this.settings,
      ...partial,
      distance: THREE.MathUtils.clamp(partial.distance ?? this.settings.distance, 6.5, 24),
      height: THREE.MathUtils.clamp(partial.height ?? this.settings.height, 4.0, 20.0),
      sensitivity: THREE.MathUtils.clamp(partial.sensitivity ?? this.settings.sensitivity, 0.4, 2.0),
      smoothness: THREE.MathUtils.clamp(partial.smoothness ?? this.settings.smoothness, 2.0, 14.0),
      fov: THREE.MathUtils.clamp(partial.fov ?? this.settings.fov, 34, 68),
      reducedEffects: partial.reducedEffects ?? this.settings.reducedEffects,
    };

    if (partial.mode) {
      this.manualPauseUntil = 0;
      if (partial.mode === 'isometric') {
        this.overviewSnapshot = 'isometric';
        this.oneShotTransitionActive = true;
      } else if (partial.mode === 'auto_follow' || partial.mode === 'cinematic') {
        this.oneShotTransitionActive = true;
      }
    }

    this.applyControlsAndFov(0.016, false);
  }

  public snapToOverview(kind: 'isometric' | 'topdown') {
    this.overviewSnapshot = kind;
    this.manualPauseUntil = 0;
    this.oneShotTransitionActive = true;
  }

  /**
   * Primary explicit Cinematic Camera State API.
   */
  public setCinematicState(state: CinematicCameraState, config?: CinematicStateConfig) {
    const prevState = this.cinematicState;
    this.cinematicState = state;

    if (config?.followObject !== undefined) {
      if (this.followObject !== config.followObject) {
        this.followObject = config.followObject;
        this.hasPrevFollow = false;
        this.smoothedVelocity.set(0, 0, 0);
      }
    }
    if (config?.diceObject !== undefined) {
      this.diceObject = config.diceObject;
    }
    if (config?.secondaryObject !== undefined) {
      this.secondaryObject = config.secondaryObject;
    } else if (state !== 'SKILL_ACTION') {
      this.secondaryObject = null;
    }
    if (config?.focusPoint) {
      this.customFocusPoint.copy(config.focusPoint);
      this.hasCustomFocus = true;
    } else if (state === 'OVERVIEW' || state === 'RETURN_TO_GAMEPLAY' || state === 'PLAYER_FOLLOW') {
      this.hasCustomFocus = false;
    }
    if (config?.forwardHint) {
      this.forwardHint.copy(config.forwardHint).normalize();
      this.hasForwardHint = true;
    } else if (state === 'OVERVIEW' || state === 'RETURN_TO_GAMEPLAY') {
      this.hasForwardHint = false;
    }
    if (config?.subPhase) {
      this.subPhase = config.subPhase;
    } else {
      this.subPhase = 'approach';
    }

    // Keep legacy phase property synchronized
    switch (state) {
      case 'DICE_ACTION':
        this.phase = 'dice';
        break;
      case 'PLAYER_FOLLOW':
        this.phase = 'pawn_follow';
        break;
      case 'SNAKE_EAT':
        this.phase = 'climb_slide';
        this.climbKind = 'snake';
        break;
      case 'LADDER_CLIMB':
        this.phase = 'climb_slide';
        this.climbKind = 'ladder';
        break;
      case 'SKILL_ACTION':
        this.phase = 'pawn_follow';
        break;
      case 'VICTORY':
        this.phase = 'victory';
        if (prevState !== 'VICTORY') {
          this.victoryOrbitAngle = Math.atan2(
            this.camera.position.x - (this.followObject?.position.x ?? 0),
            this.camera.position.z - (this.followObject?.position.z ?? 0),
          );
        }
        break;
      case 'OVERVIEW':
      case 'RETURN_TO_GAMEPLAY':
        this.phase = 'overview';
        this.overviewSnapshot = 'isometric';
        this.oneShotTransitionActive = true;
        break;
    }

    if (state !== 'OVERVIEW' && this.settings.mode !== 'manual') {
      this.manualPauseUntil = 0;
    }
  }

  /**
   * Dynamic point tracking helper during snake swallowing bulge progression.
   */
  public setFocusPoint(point: THREE.Vector3 | null) {
    if (point) {
      this.customFocusPoint.copy(point);
      this.hasCustomFocus = true;
    } else {
      this.hasCustomFocus = false;
    }
  }

  public getCinematicState(): CinematicCameraState {
    return this.cinematicState;
  }

  /**
   * Backwards-compatible phase setter delegating to setCinematicState.
   */
  public setPhase(
    phase: CameraPhase,
    options?: {
      followObject?: THREE.Object3D | null;
      diceObject?: THREE.Object3D | null;
      climbKind?: 'ladder' | 'snake';
    },
  ) {
    if (phase === 'dice') {
      this.setCinematicState('DICE_ACTION', options);
    } else if (phase === 'victory') {
      this.setCinematicState('VICTORY', options);
    } else if (phase === 'climb_slide') {
      this.setCinematicState(
        options?.climbKind === 'snake' ? 'SNAKE_EAT' : 'LADDER_CLIMB',
        options,
      );
    } else if (phase === 'pawn_follow') {
      this.setCinematicState('PLAYER_FOLLOW', options);
    } else {
      this.setCinematicState('OVERVIEW', options);
    }
  }

  public setActiveTurnPawn(pawn: THREE.Object3D | null) {
    if (this.followObject !== pawn) {
      this.followObject = pawn;
      this.hasPrevFollow = false;
      this.smoothedVelocity.set(0, 0, 0);
      if (this.settings.mode === 'cinematic') {
        this.manualPauseUntil = 0;
      }
    }
  }

  public getPhase(): CameraPhase {
    return this.phase;
  }

  public getDofTarget(out: CameraDofTarget): CameraDofTarget {
    const mode = this.settings.mode;
    const manualHold = this.isUserDragging || performance.now() < this.manualPauseUntil;

    if (this.settings.reducedEffects || manualHold || mode === 'manual' || mode === 'isometric') {
      out.active = false;
      out.aperture = 0;
      out.maxblur = 0;
      return out;
    }

    if (this.cinematicState === 'DICE_ACTION' && this.diceObject) {
      this.diceObject.getWorldPosition(_dofTargetPos);
      _dofTargetPos.y += 0.15;
      this.camera.getWorldDirection(_dofCamForward);
      _dofToTarget.subVectors(_dofTargetPos, this.camera.position);
      out.active = true;
      out.focus = Math.max(2.0, _dofToTarget.dot(_dofCamForward));
      out.aperture = 0.00072;
      out.maxblur = 0.0072;
      return out;
    }

    if (
      this.cinematicState === 'SNAKE_EAT' ||
      this.cinematicState === 'LADDER_CLIMB' ||
      this.cinematicState === 'SKILL_ACTION'
    ) {
      if (this.hasCustomFocus) {
        _dofTargetPos.copy(this.customFocusPoint);
      } else if (this.followObject) {
        this.followObject.getWorldPosition(_dofTargetPos);
      } else {
        out.active = false;
        out.aperture = 0;
        out.maxblur = 0;
        return out;
      }
      _dofTargetPos.y += 0.52;
      this.camera.getWorldDirection(_dofCamForward);
      _dofToTarget.subVectors(_dofTargetPos, this.camera.position);
      out.active = true;
      out.focus = Math.max(2.2, _dofToTarget.dot(_dofCamForward));
      out.aperture = this.cinematicState === 'SNAKE_EAT' ? 0.00062 : 0.00048;
      out.maxblur = this.cinematicState === 'SNAKE_EAT' ? 0.0064 : 0.0052;
      return out;
    }

    const isPawnFollowActive =
      this.cinematicState === 'PLAYER_FOLLOW' ||
      (this.cinematicState === 'OVERVIEW' && mode === 'cinematic');

    if (isPawnFollowActive && this.followObject) {
      this.followObject.getWorldPosition(_dofTargetPos);
      _dofTargetPos.y += 0.55;
      this.camera.getWorldDirection(_dofCamForward);
      _dofToTarget.subVectors(_dofTargetPos, this.camera.position);
      out.active = true;
      out.focus = Math.max(2.5, _dofToTarget.dot(_dofCamForward));
      out.aperture = this.cinematicState === 'PLAYER_FOLLOW' ? 0.0005 : 0.0004;
      out.maxblur = this.cinematicState === 'PLAYER_FOLLOW' ? 0.0056 : 0.0044;
      return out;
    }

    out.active = false;
    out.aperture = 0;
    out.maxblur = 0;
    return out;
  }

  private getPortraitPullback(): number {
    const aspect = THREE.MathUtils.clamp(this.camera.aspect || 1, 0.42, 2.5);
    return aspect < 1.0 ? THREE.MathUtils.clamp(1 / Math.pow(aspect, 0.54), 1.0, 1.56) : 1.0;
  }

  private getTargetFov(): number {
    const aspect = THREE.MathUtils.clamp(this.camera.aspect || 1, 0.42, 2.5);
    // Widen vertical FOV automatically on portrait/mobile screens so horizontal vision is spacious
    const portraitFovBoost = aspect < 1.0 ? THREE.MathUtils.clamp((1.0 - aspect) * 20, 0, 11) : 0;
    const baseFov = THREE.MathUtils.clamp(this.settings.fov + portraitFovBoost, 34, 68);

    if (this.settings.reducedEffects || this.settings.mode === 'manual' || this.settings.mode === 'isometric') {
      return baseFov;
    }
    switch (this.cinematicState) {
      case 'SNAKE_EAT':
        return THREE.MathUtils.clamp(baseFov - 4, 34, 68);
      case 'SKILL_ACTION':
        return THREE.MathUtils.clamp(baseFov - 3, 34, 68);
      case 'DICE_ACTION':
        return THREE.MathUtils.clamp(baseFov - 2, 34, 68);
      case 'LADDER_CLIMB':
        return THREE.MathUtils.clamp(baseFov - 1.5, 34, 68);
      case 'VICTORY':
        return THREE.MathUtils.clamp(baseFov - 3, 34, 68);
      default:
        return baseFov;
    }
  }

  private applyControlsAndFov(dt: number, immediate: boolean) {
    const sens = this.settings.sensitivity;
    this.controls.rotateSpeed = 0.9 * sens;
    this.controls.zoomSpeed = 1.0 * sens;
    this.controls.panSpeed = 0.95 * sens;

    const targetFov = this.getTargetFov();
    if (immediate) {
      this.camera.fov = targetFov;
      this.camera.updateProjectionMatrix();
      return;
    }

    if (Math.abs(this.camera.fov - targetFov) > 0.03) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 5.5, dt);
      this.camera.updateProjectionMatrix();
    }
  }

  public update(dt: number) {
    this.applyControlsAndFov(dt, false);

    if (this.isUserDragging) {
      this.clampCameraAndTarget();
      this.controls.update();
      return;
    }

    const now = performance.now();
    const mode = this.settings.mode;

    if (mode === 'manual') {
      if (this.oneShotTransitionActive) {
        this.computeOverviewTarget(_desiredPos, _desiredTarget);
        this.dampToward(_desiredPos, _desiredTarget, Math.max(4.5, this.settings.smoothness), dt);
        if (
          this.camera.position.distanceTo(_desiredPos) < 0.08 &&
          this.controls.target.distanceTo(_desiredTarget) < 0.08
        ) {
          this.oneShotTransitionActive = false;
        }
      }
      this.clampCameraAndTarget();
      this.controls.update();
      return;
    }

    if (mode === 'isometric') {
      if (now >= this.manualPauseUntil && this.oneShotTransitionActive) {
        this.computeOverviewTarget(_desiredPos, _desiredTarget);
        this.dampToward(_desiredPos, _desiredTarget, this.settings.smoothness, dt);
        if (
          this.camera.position.distanceTo(_desiredPos) < 0.08 &&
          this.controls.target.distanceTo(_desiredTarget) < 0.08
        ) {
          this.oneShotTransitionActive = false;
        }
      }
      this.clampCameraAndTarget();
      this.controls.update();
      return;
    }

    if (now < this.manualPauseUntil) {
      this.clampCameraAndTarget();
      this.controls.update();
      return;
    }

    let lambda = this.settings.smoothness;
    const pullback = this.getPortraitPullback();

    if (this.cinematicState === 'DICE_ACTION' && this.diceObject) {
      this.diceObject.getWorldPosition(_worldPos);
      _desiredTarget.set(_worldPos.x, _worldPos.y + 0.34, _worldPos.z);
      const diceDist = Math.min(10.5, Math.max(5.8, this.settings.distance * 0.62 * pullback));
      const diceHeight = Math.min(8.5, Math.max(4.0, this.settings.height * 0.56 * pullback));
      _desiredPos.set(_worldPos.x + 2.3, _worldPos.y + diceHeight, _worldPos.z + diceDist);
      lambda = this.settings.smoothness * 1.15;
    } else if (this.cinematicState === 'VICTORY' && this.followObject) {
      this.followObject.getWorldPosition(_worldPos);
      this.victoryOrbitAngle += dt * 0.44;
      const winDist = Math.min(10.2, Math.max(5.6, this.settings.distance * 0.64 * pullback));
      const winHeight = Math.min(7.6, Math.max(3.8, this.settings.height * 0.54 * pullback));
      _desiredTarget.set(_worldPos.x, _worldPos.y + 0.72, _worldPos.z);
      _desiredPos.set(
        _worldPos.x + Math.sin(this.victoryOrbitAngle) * winDist,
        _worldPos.y + winHeight,
        _worldPos.z + Math.cos(this.victoryOrbitAngle) * winDist,
      );
      lambda = Math.max(3.6, this.settings.smoothness * 0.85);
    } else if (this.cinematicState === 'SNAKE_EAT') {
      if (this.hasCustomFocus) {
        _worldPos.copy(this.customFocusPoint);
      } else if (this.followObject) {
        this.followObject.getWorldPosition(_worldPos);
      } else {
        _worldPos.set(0, 0.5, 0);
      }
      this.updateVelocityEstimate(_worldPos, dt);

      const isBiteClose = this.subPhase === 'bite' || this.subPhase === 'approach';
      const snakeDist = (isBiteClose
        ? Math.min(7.2, Math.max(4.8, this.settings.distance * 0.56))
        : Math.min(9.2, Math.max(5.8, this.settings.distance * 0.72))) * pullback;
      const snakeHeight = (isBiteClose
        ? Math.min(5.2, Math.max(3.2, this.settings.height * 0.46))
        : Math.min(6.8, Math.max(4.2, this.settings.height * 0.62))) * pullback;

      _desiredTarget.set(_worldPos.x, _worldPos.y + 0.42, _worldPos.z);

      let sideX = -_worldPos.x * 0.22;
      let sideZ = snakeDist;
      if (this.hasForwardHint) {
        _sideDir.set(-this.forwardHint.z, 0, this.forwardHint.x).normalize();
        if (_sideDir.z < 0) _sideDir.negate();
        sideX = _sideDir.x * snakeDist * 0.62 - this.forwardHint.x * snakeDist * 0.42;
        sideZ = Math.max(snakeDist * 0.58, _sideDir.z * snakeDist * 0.85);
      }
      _desiredPos.set(_worldPos.x + sideX, _worldPos.y + snakeHeight, _worldPos.z + sideZ);
      lambda = this.settings.smoothness * 1.1;
    } else if (this.cinematicState === 'LADDER_CLIMB' && this.followObject) {
      this.followObject.getWorldPosition(_worldPos);
      this.updateVelocityEstimate(_worldPos, dt);

      const ladDist = Math.min(10.4, Math.max(6.2, this.settings.distance * 0.8 * pullback));
      const ladHeight =
        (this.subPhase === 'top'
          ? Math.min(7.4, Math.max(4.4, this.settings.height * 0.68))
          : Math.min(6.4, Math.max(3.8, this.settings.height * 0.58))) * pullback;

      _desiredTarget.set(_worldPos.x, _worldPos.y + 0.72, _worldPos.z);

      let offsetX = -_worldPos.x * 0.24;
      let offsetZ = ladDist * 0.86;
      if (this.hasForwardHint) {
        _sideDir.set(-this.forwardHint.z, 0, this.forwardHint.x).normalize();
        if (_sideDir.z < 0) _sideDir.negate();
        offsetX = _sideDir.x * ladDist * 0.72 - this.forwardHint.x * ladDist * 0.28;
        offsetZ = Math.max(ladDist * 0.55, _sideDir.z * ladDist * 0.82);
      }
      _desiredPos.set(_worldPos.x + offsetX, _worldPos.y + ladHeight, _worldPos.z + offsetZ);
      lambda = this.settings.smoothness * 1.05;
    } else if (this.cinematicState === 'SKILL_ACTION' && this.followObject) {
      this.followObject.getWorldPosition(_worldPos);
      if (this.secondaryObject) {
        this.secondaryObject.getWorldPosition(_secPos);
        _desiredTarget
          .addVectors(_worldPos, _secPos)
          .multiplyScalar(0.5);
        _desiredTarget.y += 0.65;
        const span = _worldPos.distanceTo(_secPos);
        const skillDist = THREE.MathUtils.clamp((6.8 + span * 0.55) * pullback, 6.4, 16.5);
        const skillHeight = THREE.MathUtils.clamp((4.8 + span * 0.35) * pullback, 4.6, 12.0);
        _desiredPos.set(
          _desiredTarget.x - _desiredTarget.x * 0.16,
          _desiredTarget.y + skillHeight,
          _desiredTarget.z + skillDist,
        );
      } else {
        const skillDist = Math.min(9.5, Math.max(5.4, this.settings.distance * 0.68 * pullback));
        const skillHeight = Math.min(6.8, Math.max(4.0, this.settings.height * 0.6 * pullback));
        _desiredTarget.set(_worldPos.x, _worldPos.y + 0.68, _worldPos.z);
        _desiredPos.set(
          _worldPos.x - _worldPos.x * 0.22,
          _worldPos.y + skillHeight,
          _worldPos.z + skillDist,
        );
      }
      lambda = this.settings.smoothness * 1.15;
    } else if (this.cinematicState === 'PLAYER_FOLLOW' && this.followObject) {
      this.followObject.getWorldPosition(_worldPos);
      this.updateVelocityEstimate(_worldPos, dt);
      this.computeFollowCameraForWorldPos(_worldPos, _desiredPos, _desiredTarget);
      lambda = this.settings.smoothness;
    } else if (mode === 'cinematic' && this.followObject) {
      this.followObject.getWorldPosition(_worldPos);
      this.updateVelocityEstimate(_worldPos, dt);
      this.computeFollowCameraForWorldPos(_worldPos, _desiredPos, _desiredTarget);
      lambda = this.settings.smoothness * 0.8;
    } else {
      // OVERVIEW or RETURN_TO_GAMEPLAY
      this.computeOverviewTarget(_desiredPos, _desiredTarget);
      lambda =
        this.cinematicState === 'RETURN_TO_GAMEPLAY'
          ? this.settings.smoothness * 0.72
          : this.settings.smoothness * 0.85;
    }

    this.applyCollisionAvoidance(_desiredPos, _desiredTarget);
    this.dampToward(_desiredPos, _desiredTarget, lambda, dt);
    this.clampCameraAndTarget();
    this.controls.update();
  }

  private updateVelocityEstimate(currentPos: THREE.Vector3, dt: number) {
    if (!this.hasPrevFollow) {
      _prevFollowPos.copy(currentPos);
      this.hasPrevFollow = true;
      return;
    }
    if (dt > 0.0001) {
      const vx = (currentPos.x - _prevFollowPos.x) / dt;
      const vy = (currentPos.y - _prevFollowPos.y) / dt;
      const vz = (currentPos.z - _prevFollowPos.z) / dt;
      this.smoothedVelocity.x = THREE.MathUtils.damp(this.smoothedVelocity.x, vx, 7, dt);
      this.smoothedVelocity.y = THREE.MathUtils.damp(this.smoothedVelocity.y, vy, 7, dt);
      this.smoothedVelocity.z = THREE.MathUtils.damp(this.smoothedVelocity.z, vz, 7, dt);
    }
    _prevFollowPos.copy(currentPos);
  }

  private computeOverviewTarget(outPos: THREE.Vector3, outTarget: THREE.Vector3) {
    const aspect = THREE.MathUtils.clamp(this.camera.aspect || 1, 0.42, 2.5);
    const portraitPullback = this.getPortraitPullback();

    if (this.overviewSnapshot === 'topdown') {
      outPos.set(0, THREE.MathUtils.clamp(28.0 * portraitPullback, 25.5, 42.0), 2.5);
      outTarget.set(0, 0, aspect < 0.85 ? 0.45 : 0.2);
      return;
    }
    const distScale = (this.settings.distance / DEFAULT_CAMERA_SETTINGS.distance) * portraitPullback;
    const heightScale = (this.settings.height / DEFAULT_CAMERA_SETTINGS.height) * portraitPullback;
    outPos.set(
      0,
      THREE.MathUtils.clamp(19.5 * heightScale, 13.0, 41.0),
      THREE.MathUtils.clamp(21.5 * distScale, 15.0, 40.0),
    );
    outTarget.set(0, 0, aspect < 0.85 ? 0.85 : 0.75);
  }

  private computeFollowCameraForWorldPos(
    worldPos: THREE.Vector3,
    outPos: THREE.Vector3,
    outTarget: THREE.Vector3,
  ) {
    const aspect = THREE.MathUtils.clamp(this.camera.aspect || 1, 0.42, 2.5);
    const followPullback =
      aspect < 0.95 ? THREE.MathUtils.clamp(1 / Math.pow(aspect, 0.45), 1.0, 1.42) : 1.0;

    outTarget.set(
      worldPos.x + THREE.MathUtils.clamp(this.smoothedVelocity.x * 0.1, -1.1, 1.1),
      worldPos.y + 0.55,
      worldPos.z + THREE.MathUtils.clamp(this.smoothedVelocity.z * 0.1, -1.1, 1.1),
    );

    const dist = this.settings.distance * followPullback;
    const baseHeight = this.settings.height * followPullback;
    const centerBiasX = -worldPos.x * (aspect < 0.9 ? 0.38 : 0.26);

    outPos.set(worldPos.x + centerBiasX, worldPos.y + baseHeight, worldPos.z + dist * 0.9);
  }

  private applyCollisionAvoidance(camPos: THREE.Vector3, targetPos: THREE.Vector3) {
    const radialDist = Math.hypot(camPos.x, camPos.z);
    let minFloorY = 2.25;
    if (radialDist > 16.2) {
      minFloorY = 6.2;
    } else if (Math.abs(camPos.x) < 10.2 && Math.abs(camPos.z) < 10.2) {
      minFloorY = Math.max(2.45, targetPos.y + 1.5);
    }
    if (camPos.y < minFloorY) {
      camPos.y = minFloorY;
    }

    for (let i = 0; i < STATIC_OBSTACLES.length; i++) {
      const obs = STATIC_OBSTACLES[i];
      if (camPos.y > obs.height + 0.8) continue;
      const dx = camPos.x - obs.x;
      const dz = camPos.z - obs.z;
      const dist = Math.hypot(dx, dz);
      if (dist < obs.radius) {
        if (dist > 0.001) {
          const push = (obs.radius - dist) / dist;
          camPos.x += dx * push;
          camPos.z += dz * push;
        } else {
          camPos.z += obs.radius;
        }
        camPos.y = Math.max(camPos.y, obs.height + 0.6);
      }
    }
  }

  private dampToward(
    desiredPos: THREE.Vector3,
    desiredTarget: THREE.Vector3,
    lambda: number,
    dt: number,
  ) {
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, desiredPos.x, lambda, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, desiredPos.y, lambda, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, desiredPos.z, lambda, dt);

    this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, desiredTarget.x, lambda, dt);
    this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, desiredTarget.y, lambda, dt);
    this.controls.target.z = THREE.MathUtils.damp(this.controls.target.z, desiredTarget.z, lambda, dt);
  }

  private clampCameraAndTarget() {
    this.camera.position.x = THREE.MathUtils.clamp(this.camera.position.x, -34, 34);
    this.camera.position.y = THREE.MathUtils.clamp(this.camera.position.y, 2.0, 46.0);
    this.camera.position.z = THREE.MathUtils.clamp(this.camera.position.z, -30, 44.0);

    this.controls.target.x = THREE.MathUtils.clamp(this.controls.target.x, -14.0, 14.0);
    this.controls.target.y = THREE.MathUtils.clamp(this.controls.target.y, -0.4, 7.5);
    this.controls.target.z = THREE.MathUtils.clamp(this.controls.target.z, -14.0, 15.0);
  }

  public dispose() {
    this.controls.removeEventListener('start', this.handleControlsStart);
    this.controls.removeEventListener('end', this.handleControlsEnd);
  }
}
