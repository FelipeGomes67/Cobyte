const PREFERENCES_KEY = 'labware-notification-preferences';

const DEFAULT_PREFERENCES = {
  assigned: true,
  critical: true,
  sla: true,
  reply: true,
  status: true,
  browserEnabled: false,
};

export function getNotificationPreferences() {
  try {
    const stored = JSON.parse(localStorage.getItem(PREFERENCES_KEY));
    return stored && typeof stored === 'object' ? { ...DEFAULT_PREFERENCES, ...stored } : { ...DEFAULT_PREFERENCES };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function saveNotificationPreferences(preferences) {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    return { ok: true };
  } catch {
    return { ok: false, message: 'Não foi possível salvar neste navegador.' };
  }
}
