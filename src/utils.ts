import { currentLogin, myID } from "@fermuch/monoutils";

export function wakeup() {
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

export function setUrgentNotification(notification: UrgentNotification) {
  if (!('setUrgentNotification' in platform)) {
    return;
  }

  if (notification !== null) {
    wakeup();
  }
  (platform as unknown as { setUrgentNotification: (notification: UrgentNotification) => void }).setUrgentNotification(notification);
}

export function getUrgentNotification(): UrgentNotification | null {
  if (!('getUrgentNotification' in platform)) {
    return null;
  }

  return (platform as unknown as { getUrgentNotification: () => UrgentNotification | null }).getUrgentNotification();
}


function getMyTags(loginId) {
  const loginName = loginId || currentLogin() || '';
  const userTags = env.project?.logins?.find((login) => login.key === loginName || login.$modelId === loginName)?.tags || [];
  const deviceTags = env.project?.usersManager?.users?.find?.((u) => u.$modelId === myID())?.tags || [];
  const allTags = [...userTags, ...deviceTags];

  return allTags;
}

export function anyTagMatches(tags: string[], loginId?: string): boolean {
  // we never match if there are no tags
  if (!tags || tags.length === 0) return false;

  const loginName = loginId || currentLogin() || '';
  const allTags = getMyTags(loginName);

  return tags.some((t) => allTags.includes(t));
}