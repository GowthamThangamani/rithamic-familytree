const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const CONFIG = {
  PROJECT_KEY: 'rithamic_familytree',
  API_BASE_URL: isLocalhost ? 'http://localhost:3000' : 'https://api.rithamic.co.in',
  AUTH_HUB_URL: isLocalhost ? 'http://localhost:5174' : 'https://auth.rithamic.co.in',
  STORAGE_KEYS: {
    AUTH_TOKEN: 'rithamic_familytree_token',
    AUTH_USER: 'rithamic_familytree_user',
    TREE_STATE: 'rithamic_familytree_state'
  }
} as const;
