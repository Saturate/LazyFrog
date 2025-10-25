/**
 * Level Parser
 * Converts Reddit posts (from API or DOM) into Level objects
 */

import { Level } from '../types';
import { RedditPost } from './reddit';

/**
 * Parse a Reddit API post into a Level object
 */
export function parseLevelFromAPI(post: RedditPost): Level | null {
  try {
    const title = post.title || '';
    const href = `https://www.reddit.com${post.permalink}`;

    // Extract level number from title (e.g., "Level 5:", "Mission 42")
    const levelMatch = title.match(/(?:level|mission)\s*(\d+)/i);
    const levelNumber = levelMatch ? parseInt(levelMatch[1]) : null;

    // Get flair for level range (e.g., "Level 1-5", "Level 6-20")
    const levelRange = post.link_flair_text || null;

    // Parse level range (e.g., "Level 1-5" -> min: 1, max: 5)
    let levelRangeMin: number | null = null;
    let levelRangeMax: number | null = null;
    if (levelRange) {
      const rangeMatch = levelRange.match(/Level\s+(\d+)-(\d+)/i);
      if (rangeMatch) {
        levelRangeMin = parseInt(rangeMatch[1]);
        levelRangeMax = parseInt(rangeMatch[2]);
      }
    }

    // Count stars (★ characters) in the post for difficulty
    const postText = `${title} ${post.selftext}`;
    const starMatch = postText.match(/[★⭐✦✧]/g);
    const stars = starMatch ? Math.min(starMatch.length, 5) : 0;

    // Alternative: Look for "X stars" or "X star" text
    const starsTextMatch = title.match(/(\d+)\s*stars?/i);
    const starsFromText = starsTextMatch ? parseInt(starsTextMatch[1]) : 0;

    const finalStars = Math.max(stars, starsFromText);

    // Check for cleared indicators
    const cleared =
      postText.toLowerCase().includes('cleared') ||
      postText.toLowerCase().includes('completed') ||
      postText.includes('✓') ||
      postText.includes('✔') ||
      postText.includes('[done]') ||
      title.toLowerCase().includes('solved');

    return {
      title,
      href,
      levelNumber,
      levelRange,
      levelRangeMin,
      levelRangeMax,
      stars: finalStars,
      cleared,
    };
  } catch (error) {
    console.error('Error parsing level from API:', error);
    return null;
  }
}

/**
 * Parse level information from a DOM element (Reddit post container)
 * This is the existing function from content/index.tsx
 */
export function parseLevelFromDOM(post: Element): Level | null {
  try {
    const titleElement = post.querySelector('h3');
    if (!titleElement) return null;

    const title = titleElement.textContent?.trim() || '';
    const linkElement = post.querySelector('a[data-click-id="body"]');
    const href = linkElement?.getAttribute('href');

    // Extract level number from title
    const levelMatch = title.match(/(?:level|mission)\s*(\d+)/i);
    const levelNumber = levelMatch ? parseInt(levelMatch[1]) : null;

    // Get flair for level range
    const flairElement = post.querySelector('[data-test-id="post-flair"]');
    const levelRange = flairElement?.textContent?.trim() || null;

    // Parse level range
    let levelRangeMin: number | null = null;
    let levelRangeMax: number | null = null;
    if (levelRange) {
      const rangeMatch = levelRange.match(/Level\s+(\d+)-(\d+)/i);
      if (rangeMatch) {
        levelRangeMin = parseInt(rangeMatch[1]);
        levelRangeMax = parseInt(rangeMatch[2]);
      }
    }

    // Count stars
    const postText = post.textContent || '';
    const starMatch = postText.match(/[★⭐✦✧]/g);
    const stars = starMatch ? Math.min(starMatch.length, 5) : 0;

    const starsTextMatch = title.match(/(\d+)\s*stars?/i);
    const starsFromText = starsTextMatch ? parseInt(starsTextMatch[1]) : 0;

    const finalStars = Math.max(stars, starsFromText);

    // Check for cleared
    const cleared =
      postText.toLowerCase().includes('cleared') ||
      postText.toLowerCase().includes('completed') ||
      postText.includes('✓') ||
      postText.includes('✔') ||
      postText.includes('[done]') ||
      title.toLowerCase().includes('solved');

    return {
      title,
      href: href ? `https://www.reddit.com${href}` : null,
      levelNumber,
      levelRange,
      levelRangeMin,
      levelRangeMax,
      stars: finalStars,
      cleared,
      element: post,
    };
  } catch (error) {
    console.error('Error parsing level from DOM:', error);
    return null;
  }
}

/**
 * Check if a Reddit post looks like a level post
 */
export function isLevelPost(post: RedditPost | Element): boolean {
  let title: string;

  if (post instanceof Element) {
    const titleElement = post.querySelector('h3');
    title = titleElement?.textContent?.trim().toLowerCase() || '';
  } else {
    title = post.title.toLowerCase();
  }

  // Check if title contains level/mission keywords
  return (
    title.includes('level') ||
    title.includes('mission') ||
    /level\s*\d+/i.test(title) ||
    /mission\s*\d+/i.test(title)
  );
}

/**
 * Extract level number from title or flair
 */
export function extractLevelNumber(title: string, flair?: string | null): number | null {
  // Try title first
  const titleMatch = title.match(/(?:level|mission)\s*(\d+)/i);
  if (titleMatch) {
    return parseInt(titleMatch[1]);
  }

  // Try flair
  if (flair) {
    const flairMatch = flair.match(/Level\s+(\d+)/i);
    if (flairMatch) {
      return parseInt(flairMatch[1]);
    }
  }

  return null;
}

/**
 * Extract difficulty (stars) from text
 */
export function extractStars(text: string): number {
  // Count star unicode characters
  const starMatch = text.match(/[★⭐✦✧]/g);
  const starCount = starMatch ? Math.min(starMatch.length, 5) : 0;

  // Look for "X stars" text
  const starsTextMatch = text.match(/(\d+)\s*stars?/i);
  const starsFromText = starsTextMatch ? parseInt(starsTextMatch[1]) : 0;

  return Math.max(starCount, starsFromText);
}
