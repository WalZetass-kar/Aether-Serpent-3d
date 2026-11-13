import type { SpecialTileType } from '../../../shared/gameConfig';

export type AnimationStateName =
  | 'idle'
  | 'dice'
  | 'moving'
  | 'skill_action'
  | 'ladder_climb'
  | 'snake_eat'
  | 'victory'
  | 'returning';

export type CinematicCameraState =
  | 'OVERVIEW'
  | 'PLAYER_FOLLOW'
  | 'SNAKE_EAT'
  | 'LADDER_CLIMB'
  | 'SKILL_ACTION'
  | 'DICE_ACTION'
  | 'VICTORY'
  | 'RETURN_TO_GAMEPLAY';

export type CinematicEventName =
  | 'SNAKE_TRIGGERED'
  | 'SNAKE_EAT_START'
  | 'SNAKE_EAT_COMPLETE'
  | 'LADDER_TRIGGERED'
  | 'LADDER_CLIMB_START'
  | 'LADDER_CLIMB_COMPLETE'
  | 'SKILL_ACTIVATED'
  | 'SKILL_EFFECT_START'
  | 'SKILL_EFFECT_COMPLETE'
  | 'PLAYER_TURN_CHANGED'
  | 'PLAYER_VICTORY';

export type CinematicSkillType =
  | SpecialTileType
  | 'shield_block'
  | 'battle_attack'
  | 'team_synergy';

export interface CinematicEvent {
  type: CinematicEventName;
  playerId: string;
  eventId?: number;
  snakeId?: string;
  ladderId?: string;
  skillType?: CinematicSkillType;
  fromTile?: number;
  toTile?: number;
}
