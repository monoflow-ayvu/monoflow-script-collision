import { currentLogin, myID } from "@fermuch/monoutils";
import { conf } from "./config";
import { ShakeEvent, ShakeEventClassification } from "./events";
import { getUrgentNotification, setUrgentNotification, wakeup } from "./utils";

// store of pending to send events
const pendingEvents: ShakeEventClassification[] = [];

function showPendingClassificationToUser(ev: ShakeEventClassification) {
  const date = new Date(ev.createdAt * 1000);
  const timeStr = date.toLocaleTimeString();
  wakeup();
  setUrgentNotification({
    title: 'O evento foi uma colisão?',
    message: `O dispositivo possívelmente teve uma colisão, ás: ${timeStr}`,
    color: '#23FAF3',
    actions: [{
      name: 'NÃO',
      action: 'isNotCritical',
      payload: {},
    }, {
      name: 'SIM',
      action: 'isCritical',
      payload: {},
    }],
    urgent: true,
  });
  wakeup();
}

export function shouldBeDataCollection() {
  const enableDataCollection = conf.get('enableDataCollection', false);
  if (!enableDataCollection) {
    return false;
  }

  const dataCollectionIds = conf.get('dataCollectionIds', []);
  if (dataCollectionIds.length === 0) {
    return true;
  }

  const loginId = currentLogin();
  const deviceId = myID();
  const deviceTags = env?.project?.usersManager?.users?.find((d) => d.$modelId === deviceId)?.tags || [];
  const loginTags = env?.project?.logins?.find((l) => l.$modelId === loginId)?.tags || [];

  for (const id of dataCollectionIds) {
    if (id === deviceId || id === loginId) {
      return true;
    }

    if (deviceTags.includes(id)) {
      return true;
    }

    if (loginTags.includes(id)) {
      return true;
    }
  }

  return false;
}

export function handlePeriodic() {
  if (pendingEvents.length > 0) {
    wakeup();

    const currentNotif = getUrgentNotification()
    if (!currentNotif) {
      showPendingClassificationToUser(pendingEvents[0]);
    }
  }
}

export function handleDataCollection(ev: ShakeEvent) {
  const newEv = new ShakeEventClassification(ev);
  pendingEvents.push(newEv);
  showPendingClassificationToUser(pendingEvents[0]);
}

// returns true if interaction has been handled, false otherwise
export function handleUserInteraction(name: string, args: unknown): boolean {
  if (!shouldBeDataCollection()) {
    return false;
  }

  const ourMessages = ['isCritical', 'isNotCritical'] as const;
  if (!ourMessages.includes(name as typeof ourMessages[number])) {
    return false;
  }

  const classification = pendingEvents.shift();
  if (!classification) {
    setUrgentNotification(null);
    return true;
  }

  classification.setCollision(name === 'isCritical');
  env.project?.saveEvent(classification);

  if (pendingEvents.length > 0) {
    showPendingClassificationToUser(pendingEvents[0]);
  } else {
    setUrgentNotification(null);
  }

  return true;
}