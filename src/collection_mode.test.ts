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
    return {
      percentOverThreshold: 0.5,
      classifications: {
        classification1: 0.5,
        classification2: 0.5,
        classification3: 0.5,
      }
    };
  };
}

function collide() {
  if (typeof env.project === 'undefined') {
    env.project = {} as any;
  }
  if (typeof env.project.saveEvent === 'undefined') {
    (env.project as any).saveEvent = jest.fn();
  }
  messages.emit('onEvent', new MockShakeEvent());
}

describe('data collection', () => {
  // clean listeners
  afterEach(() => {
    messages.removeAllListeners();
  });

  it('only activates when data collection is enabled', () => {
    getSettings = () => ({
      enableDataCollection: true,
    });
    loadScript();
    collide();
    expect(env.project.saveEvent).not.toHaveBeenCalled();
  });

  it('filters by device id', () => {
    getSettings = () => ({
      alertOnCollision: false,
      enableDataCollection: true,
      dataCollectionIds: ['foobarIDoNotExist'],
    });
    platform.setUrgentNotification = jest.fn();
    platform.wakeup = jest.fn();
    loadScript();
    collide();
    expect(platform.setUrgentNotification).not.toHaveBeenCalled();

    getSettings = () => ({
      enableDataCollection: true,
      dataCollectionIds: ['TEST'], // TEST = test device id
    });
    platform.setUrgentNotification = jest.fn();
    platform.wakeup = jest.fn();
    loadScript();
    collide();
    expect(platform.setUrgentNotification).toHaveBeenCalled();
    const invokation = (platform.setUrgentNotification as jest.Mock).mock.calls[0][0];
    expect(invokation.title).toBe('O evento foi uma colisão?');
  })

  it('filters by login id', () => {
    getSettings = () => ({
      enableDataCollection: true,
      dataCollectionIds: ['foobar_login'],
    });
    (env.project as any) = {
      ...env.project,
      currentLogin: {
        maybeCurrent: {
          $modelId: 'foobar_login',
          tags: ['tag1', 'tag2']
        }
      },
      logins: [{
        $modelId: 'foobar_login',
        tags: ['tag1', 'tag2']
      }]
    }
    platform.setUrgentNotification = jest.fn();
    platform.wakeup = jest.fn();
    loadScript();
    collide();
    expect(platform.setUrgentNotification).toHaveBeenCalled();
    const invokation = (platform.setUrgentNotification as jest.Mock).mock.calls[0][0];
    expect(invokation.title).toBe('O evento foi uma colisão?');
  })

  it('filters by device tag', () => {
    getSettings = () => ({
      enableDataCollection: true,
      dataCollectionIds: ['device_tag'],
    });
    (env.project as any) = {
      ...env.project,
      usersManager: {
        users: [{
          $modelId: 'TEST',
          tags: ['device_tag']
        }]
      }
    }
    platform.setUrgentNotification = jest.fn();
    platform.wakeup = jest.fn();
    loadScript();
    collide();
    expect(platform.setUrgentNotification).toHaveBeenCalled();
    const invokation = (platform.setUrgentNotification as jest.Mock).mock.calls[0][0];
    expect(invokation.title).toBe('O evento foi uma colisão?');
  })

  it('filters by login tag', () => {
    getSettings = () => ({
      enableDataCollection: true,
      dataCollectionIds: ['login_tag'],
    });
    (env.project as any) = {
      ...env.project,
      currentLogin: {
        maybeCurrent: {
          $modelId: 'foobar_login',
          tags: ['tag1', 'tag2', 'login_tag']
        }
      },
      logins: [{
        $modelId: 'foobar_login',
        tags: ['tag1', 'tag2', 'login_tag']
      }]
    }
    platform.setUrgentNotification = jest.fn();
    platform.wakeup = jest.fn();
    loadScript();
    collide();
    expect(platform.setUrgentNotification).toHaveBeenCalled();
    const invokation = (platform.setUrgentNotification as jest.Mock).mock.calls[0][0];
    expect(invokation.title).toBe('O evento foi uma colisão?');
  })

  it('uses all devices when dataCollectionIds is empty', () => {
    getSettings = () => ({
      enableDataCollection: true,
      dataCollectionIds: [],
    });
    platform.setUrgentNotification = jest.fn();
    platform.wakeup = jest.fn();
    loadScript();
    collide();
    expect(platform.setUrgentNotification).toHaveBeenCalled();
    const invokation = (platform.setUrgentNotification as jest.Mock).mock.calls[0][0];
    expect(invokation.title).toBe('O evento foi uma colisão?');
  })
})