/**
 * Tests for subreddit detection utilities
 */

import { describe, it, expect } from 'vitest';
import { isOnSwordAndSupperSubreddit } from './subreddit';

describe('isOnSwordAndSupperSubreddit', () => {
  it('should return true for r/SwordAndSupperGame', () => {
    expect(isOnSwordAndSupperSubreddit('https://www.reddit.com/r/SwordAndSupperGame')).toBe(true);
    expect(isOnSwordAndSupperSubreddit('https://www.reddit.com/r/SwordAndSupperGame/')).toBe(true);
  });

  it('should return true for r/SwordAndSupper', () => {
    expect(isOnSwordAndSupperSubreddit('https://www.reddit.com/r/SwordAndSupper')).toBe(true);
    expect(isOnSwordAndSupperSubreddit('https://www.reddit.com/r/SwordAndSupper/')).toBe(true);
  });

  it('should return true for posts on r/SwordAndSupperGame', () => {
    expect(
      isOnSwordAndSupperSubreddit('https://www.reddit.com/r/SwordAndSupperGame/comments/abc123/post_title/')
    ).toBe(true);
  });

  it('should return true for posts on r/SwordAndSupper', () => {
    expect(
      isOnSwordAndSupperSubreddit('https://www.reddit.com/r/SwordAndSupper/comments/abc123/post_title/')
    ).toBe(true);
  });

  it('should return true with query parameters', () => {
    expect(isOnSwordAndSupperSubreddit('https://www.reddit.com/r/SwordAndSupperGame?sort=hot')).toBe(true);
    expect(isOnSwordAndSupperSubreddit('https://www.reddit.com/r/SwordAndSupper?utm_source=share')).toBe(true);
  });

  it('should return true with hash fragments', () => {
    expect(isOnSwordAndSupperSubreddit('https://www.reddit.com/r/SwordAndSupperGame#top')).toBe(true);
    expect(isOnSwordAndSupperSubreddit('https://www.reddit.com/r/SwordAndSupper#comments')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isOnSwordAndSupperSubreddit('https://www.reddit.com/r/swordandsuppergame')).toBe(true);
    expect(isOnSwordAndSupperSubreddit('https://www.reddit.com/r/SWORDANDSUPPER')).toBe(true);
    expect(isOnSwordAndSupperSubreddit('https://www.reddit.com/r/SwordAndSupperGAME')).toBe(true);
  });

  it('should return false for other subreddits', () => {
    expect(isOnSwordAndSupperSubreddit('https://www.reddit.com/r/gaming')).toBe(false);
    expect(isOnSwordAndSupperSubreddit('https://www.reddit.com/r/programming')).toBe(false);
    expect(isOnSwordAndSupperSubreddit('https://www.reddit.com/r/AskReddit')).toBe(false);
  });

  it('should return false for similar but different subreddits', () => {
    expect(isOnSwordAndSupperSubreddit('https://www.reddit.com/r/SwordAndSupperGame2')).toBe(false);
    expect(isOnSwordAndSupperSubreddit('https://www.reddit.com/r/SwordAndSupperGameFan')).toBe(false);
    expect(isOnSwordAndSupperSubreddit('https://www.reddit.com/r/SwordAndSupperMod')).toBe(false);
    expect(isOnSwordAndSupperSubreddit('https://www.reddit.com/r/NewSwordAndSupper')).toBe(false);
  });

  it('should return false for reddit homepage', () => {
    expect(isOnSwordAndSupperSubreddit('https://www.reddit.com/')).toBe(false);
    expect(isOnSwordAndSupperSubreddit('https://www.reddit.com')).toBe(false);
  });

  it('should return false for user profiles', () => {
    expect(isOnSwordAndSupperSubreddit('https://www.reddit.com/user/somename')).toBe(false);
  });

  it('should return false for non-reddit URLs', () => {
    expect(isOnSwordAndSupperSubreddit('https://google.com')).toBe(false);
    expect(isOnSwordAndSupperSubreddit('https://github.com/r/SwordAndSupperGame')).toBe(false);
  });
});
