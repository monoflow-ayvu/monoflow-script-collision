import * as MonoUtils from "@fermuch/monoutils";

// based on settingsSchema @ package.json
type Config = {
  maxSamples: number;
  minTimeBetweenSamplesMs: number;
  visibleTimeRangeMs: number;
  magnitudeThreshold: number;
  percentOverThresholdForShake: number;
  lockOnCollision: boolean;
}

const conf = new MonoUtils.config.Config<Config>();
const IS_DEVICE_LOCKED_KEY = 'IS_DEVICE_LOCKED' as const;

declare class ShakeEvent extends MonoUtils.wk.event.BaseEvent {
  kind: 'shake-event';
  getData(): {percentOverThreshold: number};
}

messages.on('onInit', function() {
  platform.log('collision script started');
  platform.log('settings:');
  platform.log(conf.store);

  env.setData('ACCELEROMETER_MAX_SAMPLES', conf.get('maxSamples', 25));
  env.setData('ACCELEROMETER_MIN_TIME_BETWEEN_SAMPLES_MS', conf.get('minTimeBetweenSamplesMs', 20));
  env.setData('ACCELEROMETER_VISIBLE_TIME_RANGE_MS', conf.get('visibleTimeRangeMs', 500));
  env.setData('ACCELEROMETER_MAGNITUDE_THRESHOLD', conf.get('magnitudeThreshold', 25));
  env.setData('ACCELEROMETER_PERCENT_OVER_THRESHOLD_FOR_SHAKE', conf.get('percentOverThresholdForShake', 66));
});


MonoUtils.wk.event.subscribe<ShakeEvent>('shake-event', (ev) => {
  platform.log(`detected shake event of magnitude ${ev.getData()?.percentOverThreshold}%`);
  env.project?.saveEvent(ev);

  if (conf.get('lockOnCollision', false)) {
    platform.log('locking device');
    MonoUtils.storage.set(IS_DEVICE_LOCKED_KEY, true);
    MonoUtils.wk.lock.lock();
    env.project.logout();
  }
});
