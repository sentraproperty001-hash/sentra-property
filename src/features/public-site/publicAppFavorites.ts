const FAVORITES_STORAGE_KEY = 'sentra_public_app_favorites_v1';

export const readPublicAppFavorites = (): string[] => {
  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.every((id) => typeof id === 'string') ? parsed : [];
  } catch (error) {
    console.warn('Unable to read saved property favorites:', error);
    return [];
  }
};

export const writePublicAppFavorites = (favorites: string[]): void => {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.warn('Unable to save property favorites:', error);
  }
};
