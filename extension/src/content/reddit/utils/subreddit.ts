/**
 * Subreddit detection utilities
 */

/**
 * Check if we're on a Sword & Supper subreddit
 * Only show the control panel on r/SwordAndSupperGame and r/SwordAndSupper
 */
export function isOnSwordAndSupperSubreddit(url: string = window.location.href): boolean {
  // Match reddit.com/r/SwordAndSupperGame or reddit.com/r/SwordAndSupper (but not SwordAndSupperGame2, etc.)
  // Also match old.reddit.com, new.reddit.com, www.reddit.com, etc.
  return /reddit\.com\/r\/(SwordAndSupperGame|SwordAndSupper)(?:\/|$|\?|#)/i.test(url);
}
