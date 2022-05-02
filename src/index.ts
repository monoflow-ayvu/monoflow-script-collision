import * as MonoUtils from "@fermuch/monoutils";
import { currentLogin } from "@fermuch/monoutils";
import { handleDataCollection, handleUserInteraction, shouldBeDataCollection } from "./collection_mode";
import { conf } from "./config";
import { LockEvent, ShakeEvent } from "./events";
import { setUrgentNotification, wakeup } from "./utils";


const IS_DEVICE_LOCKED_KEY = 'IS_DEVICE_LOCKED' as const;

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

  if (shouldBeDataCollection()) {
    handleDataCollection(ev);
    // event handled by data collection
    return;
  }

  let validations: {category: string; level: number}[] = [];
  if (conf.get('enableAudio', false)) {
    for (const confClass of conf.get('filters', [])) {
      if (((eventClasses[confClass.category] || 0) * 100) >= confClass.minimum) {
        validations.push({
          category: confClass.category,
          level: eventClasses[confClass.category] || 0,
        });
      }
    }

    const minimumNeeded = conf.get('totalSoundKeywords', 1);
    if (validations.length < minimumNeeded) {
      platform.log(`audio detector: no valid classifications detected (need ${minimumNeeded}, got ${validations.length})`);
      platform.log('[debug] classifications: ' + JSON.stringify(eventClasses));
      return;
    }
  }

  // print log of magnitude and the classifications validated
  platform.log(`detected shake event of magnitude: ${ev.getData().percentOverThreshold}%`, validations);
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
  if (handleUserInteraction(name, args)) {
    return;
  }

  if (name !== 'ok') return;

  if (conf.get('onlyTagsCanDisable', false)) {
    if (!currentLogin()) {
      // no login, notification keeps showing
      return;
    }

    const validTags = conf.get('tags', []);
    const user = env.project?.logins?.find((l) => l.$modelId === currentLogin());
    if (!user) {
      // no user, notification keeps showing
      return;
    }

    if (!user.tags.some((t) => validTags.includes(t))) {
      // user has no valid tag, notification keeps showing
      return;
    }

    // user has a valid tag, notification is dismissed
    return setUrgentNotification(null);
  }

  // by default remove notification
  setUrgentNotification(null);
})