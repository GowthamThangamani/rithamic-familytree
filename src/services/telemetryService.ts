import { CONFIG } from '../config/index.ts';

let sessionId = localStorage.getItem('familytree_session_id');
if (!sessionId) {
  sessionId = 'sess_' + Math.random().toString(36).substring(2, 11);
  localStorage.setItem('familytree_session_id', sessionId);
}

export const trackEvent = (eventType: string, eventName: string, metadata: Record<string, any> = {}): void => {
  const userJson = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_USER);
  const user = userJson ? JSON.parse(userJson) : null;
  
  const payload = {
    events: [
      {
        eventType,
        eventName,
        metadata,
        sessionId,
        userIdentifier: user ? user.email : 'anonymous_family_viewer'
      }
    ]
  };

  fetch(`${CONFIG.API_BASE_URL}/api/metrics/${CONFIG.PROJECT_KEY}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Id': sessionId || 'anonymous'
    },
    body: JSON.stringify(payload)
  }).catch(() => {});
};
