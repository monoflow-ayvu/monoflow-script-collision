import * as MonoUtils from "@fermuch/monoutils";

export class LockEvent extends MonoUtils.wk.event.BaseEvent {
  kind = 'critical-lock' as const;

  constructor(public readonly isLocked: boolean) {
    super();
  }

  getData() {
    return {
      locked: this.isLocked,
      unlocked: !this.isLocked,
      isLocked: this.isLocked,
    };
  }
}

export declare class ShakeEvent extends MonoUtils.wk.event.BaseEvent {
  kind: 'shake-event';
  getData(): {
    percentOverThreshold: number,
    classifications: Record<string, number>,
    raw?: {
      timestamp: number;
      x: number;
      y: number;
      z: number;
      accuracy: number;
    }[]
  };
}

export class ShakeEventClassification extends MonoUtils.wk.event.BaseEvent {
  kind = 'shake-event-classification';
  private percentOverThreshold: number;
  private classifications: Record<string, number>;
  private raw: {
    timestamp: number;
    x: number;
    y: number;
    z: number;
    accuracy: number;
  }[];
  isCollision = null as null | boolean;

  constructor(
    ev: ShakeEvent,
  ) {
    super();
    this.createdAt = ev.createdAt || Date.now() / 1000;
    this.percentOverThreshold = ev.getData().percentOverThreshold;
    this.classifications = ev.getData().classifications;
    this.raw = ev.getData().raw || [];
  }

  getData() {
    return {
      percentOverThreshold: this.percentOverThreshold,
      classifications: this.classifications,
      raw: this.raw,
      isCollision: this.isCollision,
    };
  }

  setCollision(collision: boolean) {
    this.isCollision = collision;
  }
}