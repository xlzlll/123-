export enum TreeMorphState {
  SCATTERED = 'SCATTERED',
  TREE_SHAPE = 'TREE_SHAPE',
}

export enum GestureType {
  NONE = 'NONE',
  OPEN_PALM = 'OPEN_PALM',
  FIST = 'FIST',
  GRAB = 'GRAB',
}

export interface DualPosition {
  tree: [number, number, number];
  scatter: [number, number, number];
}

export interface OrnamentData {
  id: number;
  position: DualPosition;
  scale: number;
  rotation: [number, number, number];
  color: string;
  type: 'gift' | 'bauble' | 'star';
  weight: number; // For physics simulation/lag
}

export interface PhotoData {
  id: number;
  url: string;
  position: DualPosition;
  rotation: [number, number, number];
}

export interface HandPosition {
  x: number;
  y: number;
}