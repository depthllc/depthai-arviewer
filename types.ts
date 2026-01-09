export interface SceneSettings {
  ambientIntensity: number;
  directionalIntensity: number;
  scale: number;
  rotationSpeed: number;
  autoRotate: boolean;
}

export type DebugLogFn = (message: string) => void;
