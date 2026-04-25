export const API_BASE: string = (import.meta as any).env.VITE_API_BASE || '';
export const WS_URL: string = (import.meta as any).env.VITE_WS_URL || ((window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws/live');
