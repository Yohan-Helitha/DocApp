const EVENT_NAME = 'admin:data-changed';
const CHANNEL_NAME = 'docapp-admin-refresh';

const getChannel = () => {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return null;
  }

  try {
    return new BroadcastChannel(CHANNEL_NAME);
  } catch {
    return null;
  }
};

export const publishAdminRefresh = () => {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new Event(EVENT_NAME));

  try {
    window.localStorage.setItem('admin:last-change-at', String(Date.now()));
  } catch {
    // ignore storage access issues
  }

  const channel = getChannel();
  if (channel) {
    try {
      channel.postMessage({ type: EVENT_NAME, at: Date.now() });
      channel.close();
    } catch {
      // ignore broadcast issues
    }
  }
};

export const subscribeAdminRefresh = (handler) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const onEvent = () => handler();
  window.addEventListener(EVENT_NAME, onEvent);

  const channel = getChannel();
  const onMessage = () => handler();
  if (channel) {
    channel.addEventListener('message', onMessage);
  }

  return () => {
    window.removeEventListener(EVENT_NAME, onEvent);
    if (channel) {
      channel.removeEventListener('message', onMessage);
      channel.close();
    }
  };
};