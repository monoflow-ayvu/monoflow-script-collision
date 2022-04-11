import * as MonoUtils from "@fermuch/monoutils";

// based on settingsSchema @ package.json
export type Config = {
  maxSamples: number;
  minTimeBetweenSamplesMs: number;
  visibleTimeRangeMs: number;
  magnitudeThreshold: number;
  percentOverThresholdForShake: number;
  lockOnCollision: boolean;
  alertOnCollision: boolean;

  enableAudio: boolean;
  filters: {
    category: string;
    minimum: number;
  }[]
}

const conf = new MonoUtils.config.Config<Config>();
const IS_DEVICE_LOCKED_KEY = 'IS_DEVICE_LOCKED' as const;

class LockEvent extends MonoUtils.wk.event.BaseEvent {
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

declare class ShakeEvent extends MonoUtils.wk.event.BaseEvent {
  kind: 'shake-event';
  getData(): { percentOverThreshold: number, classifications: Record<string, number> };
}

function wakeup() {
  if ('wakeup' in platform) {
    (platform as unknown as { wakeup: () => void }).wakeup();
  }
}

interface Action {
  name: string;
  action: string;
  payload: unknown;
}

type UrgentNotification = {
  title: string;
  message?: string;
  color?: string;
  actions?: Action[];
  urgent?: boolean;
} | null;

function setUrgentNotification(notification: UrgentNotification) {
  if (!('setUrgentNotification' in platform)) {
    return;
  }

  if (notification !== null) {
    wakeup();
  }
  (platform as unknown as { setUrgentNotification: (notification: UrgentNotification) => void }).setUrgentNotification(notification);
}

function getUrgentNotification(): UrgentNotification | null {
  if (!('getUrgentNotification' in platform)) {
    return null;
  }

  return (platform as unknown as { getUrgentNotification: () => UrgentNotification | null }).getUrgentNotification();
}

messages.on('onInit', function () {
  platform.log('collision script started');
  platform.log('settings:');
  platform.log(conf.store);

  env.setData('ACCELEROMETER_MAX_SAMPLES', conf.get('maxSamples', 25));
  env.setData('ACCELEROMETER_MIN_TIME_BETWEEN_SAMPLES_MS', conf.get('minTimeBetweenSamplesMs', 20));
  env.setData('ACCELEROMETER_VISIBLE_TIME_RANGE_MS', conf.get('visibleTimeRangeMs', 500));
  env.setData('ACCELEROMETER_MAGNITUDE_THRESHOLD', conf.get('magnitudeThreshold', 25));
  env.setData('ACCELEROMETER_PERCENT_OVER_THRESHOLD_FOR_SHAKE', conf.get('percentOverThresholdForShake', 66));
  env.setData('ACCELEROMETER_USE_AUDIO_DETECTOR', Boolean(conf.get('enableAudio', false)));
});

MonoUtils.wk.event.subscribe<ShakeEvent>('shake-event', (ev) => {
  const eventClasses = ev.getData().classifications || {};
  
  let anyValid: false | string = false;
  if (conf.get('enableAudio', false)) {
    for (const confClass of conf.get('filters', [])) {
      if (((eventClasses[confClass.category] || 0) * 100) >= confClass.minimum) {
        anyValid = confClass.category || 'unknown';
      }
    }

    if (anyValid === false) {
      platform.log('audio detector: no valid classifications detected');
      platform.log('[debug] classifications: ' + JSON.stringify(eventClasses));
      return;
    }
  }

  const classificationLog = anyValid ? `with classification ${anyValid}=${eventClasses[anyValid] * 100}%` : '';
  platform.log(`detected shake event of magnitude ${ev.getData()?.percentOverThreshold * 100}% ${classificationLog}`);
  env.project?.saveEvent(ev);

  if (conf.get('lockOnCollision', false)) {
    platform.log('locking device');
    MonoUtils.storage.set(IS_DEVICE_LOCKED_KEY, true);
    MonoUtils.wk.lock.lock();
    env.project.saveEvent(new LockEvent(true));
    env.project.logout();
  }

  if (conf.get('alertOnCollision', false)) {
    wakeup();
    setUrgentNotification({
      title: 'COLISÃO',
      message: 'O dispositivo teve uma colisão',
      color: '#fa4023',
      actions: [{
        name: 'OK',
        action: 'ok',
        payload: {},
      }],
      urgent: true,
    });
    wakeup();
  }
});

messages.on('onCall', (name: string, args: unknown) => {
  if (name === 'ok') {
    setUrgentNotification(null);
  }
})