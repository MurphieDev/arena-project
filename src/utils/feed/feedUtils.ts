// ── Feed Utilities ────────────────────────────────────────────

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = (now.getTime() - date.getTime()) / 1000;

  if (diffInSeconds < 60) return 'now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString();
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function calculateROI(odds: number, stake: number = 100): number {
  return (odds - 1) * stake;
}

export function truncateText(text: string, maxLength: number = 150): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function generateCardKey(cardId: string, type: string): string {
  return `${type}-${cardId}`;
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

export function isTabletDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const width = window.innerWidth;
  const height = window.innerHeight;
  return (
    (width >= 768 && width < 1024) ||
    (Math.min(width, height) >= 600 && Math.min(width, height) < 900)
  );
}

export const breakpoints = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export function getResponsiveColumns(width: number): number {
  if (width < breakpoints.md) return 1;
  if (width < breakpoints.lg) return 2;
  if (width < breakpoints.xl) return 3;
  return 4;
}

export function getResponsivePadding(width: number): string {
  if (width < breakpoints.md) return 'px-3 py-2';
  if (width < breakpoints.lg) return 'px-4 py-3';
  return 'px-6 py-4';
}
