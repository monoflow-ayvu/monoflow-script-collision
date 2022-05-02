import * as MonoUtils from "@fermuch/monoutils";
import { currentLogin, myID } from "@fermuch/monoutils";

// based on settingsSchema @ package.json
export type Config = {
  maxSamples: number;
  minTimeBetweenSamplesMs: number;
  visibleTimeRangeMs: number;
  magnitudeThreshold: number;
  percentOverThresholdForShake: number;
  lockOnCollision: boolean;
  alertOnCollision: boolean;

  onlyTagsCanDisable: boolean;
  tags: string[];

  enableDataCollection: boolean;
  // IDs can be:
  // - device id
  // - login id
  // - device tag
  // - login tag
  // Empty string means all devices
  dataCollectionIds: string[];

  enableAudio: boolean;
  totalSoundKeywords: number;
  filters: {
    category: string;
    minimum: number;
  }[];
}

export const conf = new MonoUtils.config.Config<Config>();