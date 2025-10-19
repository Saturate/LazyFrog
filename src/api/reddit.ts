/**
 * Reddit API Module
 * Fetches posts from the Sword & Supper subreddit using Reddit's JSON API
 * No scrolling required - directly fetch posts via API
 */

const SUBREDDIT = 'SwordAndSupperGame';
const BASE_URL = `https://www.reddit.com/r/${SUBREDDIT}`;

export interface RedditPost {
  // Basic info
  id: string;
  title: string;
  permalink: string;
  url: string;

  // Author
  author: string;
  author_flair_text: string | null;

  // Engagement
  score: number;
  num_comments: number;
  upvote_ratio: number;

  // Post metadata
  created_utc: number;
  link_flair_text: string | null;
  link_flair_css_class: string | null;

  // Content
  selftext: string;
  thumbnail: string;

  // Status
  is_self: boolean;
  pinned: boolean;
  locked: boolean;
  archived: boolean;
  stickied: boolean;

  // Reddit API specific
  name: string; // Full ID (e.g., "t3_abc123")
  subreddit: string;
}

export interface RedditAPIResponse {
  kind: string;
  data: {
    after: string | null;
    dist: number;
    modhash: string;
    geo_filter: string;
    children: Array<{
      kind: string;
      data: RedditPost;
    }>;
    before: string | null;
  };
}

export interface FetchPostsOptions {
  sort?: 'hot' | 'new' | 'top' | 'rising' | 'controversial';
  limit?: number; // Max 100
  after?: string; // Pagination token
  before?: string; // Pagination token
  t?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all'; // Time filter for 'top'
}

/**
 * Fetch posts from the subreddit using Reddit's JSON API
 * Works directly from the browser extension without needing to scrape the DOM
 */
export async function fetchPosts(options: FetchPostsOptions = {}): Promise<RedditPost[]> {
  const {
    sort = 'new',
    limit = 100,
    after,
    before,
    t
  } = options;

  // Build URL
  const params = new URLSearchParams({
    limit: limit.toString(),
    raw_json: '1' // Get unescaped JSON
  });

  if (after) params.append('after', after);
  if (before) params.append('before', before);
  if (t && sort === 'top') params.append('t', t);

  const url = `${BASE_URL}/${sort}.json?${params.toString()}`;

  try {
    console.log('🌐 Fetching from Reddit API:', url);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Reddit API returned ${response.status}: ${response.statusText}`);
    }

    const data: RedditAPIResponse = await response.json();
    const posts = data.data.children.map(child => child.data);

    console.log(`✅ Fetched ${posts.length} posts from Reddit API`);

    return posts;
  } catch (error) {
    console.error('❌ Error fetching from Reddit API:', error);
    throw error;
  }
}

/**
 * Fetch all posts (paginated)
 * Continues fetching until no more posts or maxPosts reached
 */
export async function fetchAllPosts(options: FetchPostsOptions = {}, maxPosts = 1000): Promise<RedditPost[]> {
  const allPosts: RedditPost[] = [];
  let after: string | undefined = options.after;
  let hasMore = true;

  while (hasMore && allPosts.length < maxPosts) {
    const remaining = maxPosts - allPosts.length;
    const limit = Math.min(100, remaining);

    const response = await fetch(
      `${BASE_URL}/${options.sort || 'new'}.json?limit=${limit}&after=${after || ''}&raw_json=1`
    );

    if (!response.ok) {
      console.error('Reddit API error:', response.status);
      break;
    }

    const data: RedditAPIResponse = await response.json();
    const posts = data.data.children.map(child => child.data);

    allPosts.push(...posts);

    // Check if there are more posts
    if (data.data.after) {
      after = data.data.after;
    } else {
      hasMore = false;
    }

    console.log(`📥 Fetched ${posts.length} posts (total: ${allPosts.length})`);

    // Reddit rate limiting: wait a bit between requests
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return allPosts;
}

/**
 * Search for specific posts in the subreddit
 */
export async function searchPosts(query: string, options: FetchPostsOptions = {}): Promise<RedditPost[]> {
  const params = new URLSearchParams({
    q: `${query} subreddit:${SUBREDDIT}`,
    restrict_sr: 'on',
    limit: (options.limit || 100).toString(),
    sort: options.sort || 'new',
    raw_json: '1'
  });

  if (options.t) params.append('t', options.t);

  const url = `https://www.reddit.com/r/${SUBREDDIT}/search.json?${params.toString()}`;

  try {
    console.log('🔍 Searching Reddit:', url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Reddit search API returned ${response.status}`);
    }

    const data: RedditAPIResponse = await response.json();
    const posts = data.data.children.map(child => child.data);

    console.log(`✅ Found ${posts.length} posts matching "${query}"`);

    return posts;
  } catch (error) {
    console.error('❌ Error searching Reddit:', error);
    throw error;
  }
}

/**
 * Get a specific post by ID
 */
export async function getPost(postId: string): Promise<RedditPost | null> {
  try {
    const url = `https://www.reddit.com/r/${SUBREDDIT}/comments/${postId}.json`;
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Reddit returns an array: [post, comments]
    if (data && data[0]?.data?.children?.[0]?.data) {
      return data[0].data.children[0].data;
    }

    return null;
  } catch (error) {
    console.error('❌ Error fetching post:', error);
    return null;
  }
}

/**
 * Example: Get all level posts (filter by flair or title)
 */
export async function getLevelPosts(options: FetchPostsOptions = {}): Promise<RedditPost[]> {
  const posts = await fetchPosts(options);

  // Filter for posts that look like level posts
  return posts.filter(post => {
    const title = post.title.toLowerCase();
    const hasFlair = post.link_flair_text !== null;

    // Match common level patterns
    return (
      title.includes('level') ||
      title.includes('mission') ||
      hasFlair // Many level posts have flairs
    );
  });
}
