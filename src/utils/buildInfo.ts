/**
 * Build information utilities
 */

// These are injected by webpack at build time
declare const __VERSION__: string;
declare const __BUILD_TIME__: string;

export const VERSION = __VERSION__;
export const BUILD_TIME = __BUILD_TIME__;

/**
 * Calculate human-readable time since build
 * Returns format like "1h 4m" or "3d 5h" or "Just now"
 */
export function getTimeSinceBuild(): string {
  const buildDate = new Date(BUILD_TIME);
  const now = new Date();
  const diffMs = now.getTime() - buildDate.getTime();

  // Less than a minute
  if (diffMs < 60 * 1000) {
    return 'Just now';
  }

  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  // Less than an hour
  if (diffHours === 0) {
    return `${diffMinutes}m ago`;
  }

  // Less than a day
  if (diffDays === 0) {
    const remainingMinutes = diffMinutes % 60;
    return remainingMinutes > 0 ? `${diffHours}h ${remainingMinutes}m ago` : `${diffHours}h ago`;
  }

  // Days
  const remainingHours = diffHours % 24;
  return remainingHours > 0 ? `${diffDays}d ${remainingHours}h ago` : `${diffDays}d ago`;
}

/**
 * Get formatted build timestamp
 */
export function getBuildTimestamp(): string {
  return new Date(BUILD_TIME).toLocaleString();
}
