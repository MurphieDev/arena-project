// src/services/storage/TempPasswordStorage.ts
// Temporarily stores credentials during OTP verification flow

interface TempData {
  email: string;
  password: string;
  timestamp: number;
}

const KEY = 'arena_temp_auth';
const EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export const TempPasswordStorage = {
  setTempPassword(email: string, password: string) {
    const data: TempData = { email, password, timestamp: Date.now() };
    sessionStorage.setItem(KEY, JSON.stringify(data));
  },

  getTempPassword(): { email: string; password: string } | null {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return null;
      const data: TempData = JSON.parse(raw);
      // Expire after 5 minutes
      if (Date.now() - data.timestamp > EXPIRY_MS) {
        sessionStorage.removeItem(KEY);
        return null;
      }
      return { email: data.email, password: data.password };
    } catch {
      return null;
    }
  },

  clearTempPassword() {
    sessionStorage.removeItem(KEY);
  },
};
