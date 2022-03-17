import * as MonoUtils from '@fermuch/monoutils';
const read = require('fs').readFileSync;
const join = require('path').join;

function loadScript() {
  // import global script
  const script = read(join(__dirname, '..', 'dist', 'bundle.js')).toString('utf-8');
  eval(script);
}

class MockShakeEvent extends MonoUtils.wk.event.BaseEvent {
  kind = 'shake-event' as const;
  getData() {
    return {percentOverThreshold: 0.5};
  };
}

describe("onInit", () => {
  // clean listeners
  afterEach(() => {
    messages.removeAllListeners();
  });

  it('runs without errors', () => {
    loadScript();
    messages.emit('onInit');
  });

  it('sets accelerometer config', () => {
    loadScript();
    messages.emit('onInit');

    expect(env.data.ACCELEROMETER_MAX_SAMPLES).toBe(25);
    expect(env.data.ACCELEROMETER_MIN_TIME_BETWEEN_SAMPLES_MS).toBe(20);
    expect(env.data.ACCELEROMETER_VISIBLE_TIME_RANGE_MS).toBe(500);
    expect(env.data.ACCELEROMETER_MAGNITUDE_THRESHOLD).toBe(25);
    expect(env.data.ACCELEROMETER_PERCENT_OVER_THRESHOLD_FOR_SHAKE).toBe(66);

    getSettings = () => ({
      maxSamples: 1,
      minTimeBetweenSamplesMs: 2,
      visibleTimeRangeMs: 3,
      magnitudeThreshold: 4,
      percentOverThresholdForShake: 5,
    });

    messages.removeAllListeners();
    loadScript();
    messages.emit('onInit');

    expect(env.data.ACCELEROMETER_MAX_SAMPLES).toBe(1);
    expect(env.data.ACCELEROMETER_MIN_TIME_BETWEEN_SAMPLES_MS).toBe(2);
    expect(env.data.ACCELEROMETER_VISIBLE_TIME_RANGE_MS).toBe(3);
    expect(env.data.ACCELEROMETER_MAGNITUDE_THRESHOLD).toBe(4);
    expect(env.data.ACCELEROMETER_PERCENT_OVER_THRESHOLD_FOR_SHAKE).toBe(5);
  });

  it('stores event on shake-event', () => {
    (env.project as any) = {
      saveEvent: jest.fn()
    };

    loadScript();
    messages.emit('onInit');
    messages.emit('onEvent', new MockShakeEvent());

    expect(env.project.saveEvent).toHaveBeenCalledTimes(1);
  });

  it('locks device if lockOnCollision is true', () => {
    (env.project as any) = {
      saveEvent: jest.fn(),
      logout: jest.fn()
    };
    getSettings = () => ({
      lockOnCollision: true,
    });

    loadScript();
    messages.emit('onInit');

    expect(env.project.saveEvent).toHaveBeenCalledTimes(0);
    expect(env.project.logout).toHaveBeenCalledTimes(0);
    expect(MonoUtils.storage.getBoolean('IS_DEVICE_LOCKED')).toBe(false);
    expect(MonoUtils.wk.lock.getLockState()).toBe(false);

    messages.emit('onEvent', new MockShakeEvent());
    
    expect(MonoUtils.storage.getBoolean('IS_DEVICE_LOCKED')).toBe(true);
    expect(MonoUtils.wk.lock.getLockState()).toBe(true);
    expect(env.project.saveEvent).toHaveBeenCalledTimes(1);
    expect(env.project.logout).toHaveBeenCalledTimes(1);
  });
});