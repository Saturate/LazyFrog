# Mission Data Fetcher - Standalone Script

This standalone script fetches mission metadata from Reddit's SwordAndSupper game by querying Reddit's Devvit gateway.

## Overview

The script:
- Reads post IDs from a text file (one per line)
- Fetches mission data for each post ID from Reddit's Devvit API
- Parses the protobuf responses
- Saves mission metadata to a JSON file

## Prerequisites

1. **Node.js** version 18+ (for native `fetch` support)
2. **Reddit Session Cookies** - You need to be logged into Reddit and extract your session cookies

## Installation

```bash
# Install dependencies
npm install
```

This will install:
- `@devvit/protos` - For encoding/decoding protobuf messages
- `dotenv` - For environment variable support

## Getting Reddit Cookies

1. Open Reddit in your browser and log in
2. Open DevTools (F12)
3. Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)
4. Click on **Cookies** → `https://www.reddit.com`
5. Copy the entire cookie string or individual cookies:
   - `reddit_session` (most important)
   - `loid`
   - `session_tracker`
   - `token_v2`

**Cookie String Format:**
```
reddit_session=xxx; loid=yyy; session_tracker=zzz; token_v2=www
```

## Usage

### Method 1: Environment Variables (Recommended)

1. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

2. Edit `.env` and add your Reddit cookies:
```env
REDDIT_COOKIES="reddit_session=xxx; loid=yyy; session_tracker=zzz"
```

3. Create `postIds.txt` with post IDs (one per line):
```
t3_1lvdwlq
t3_1od3es7
t3_1oh01dp
```

4. Run the script:
```bash
node scripts/fetch-missions.js --input postIds.txt --output missions.json
```

### Method 2: Command-Line Arguments

```bash
node scripts/fetch-missions.js \
  --input postIds.txt \
  --output missions.json \
  --cookies "reddit_session=xxx; loid=yyy"
```

### Method 3: Interactive Mode

If you don't provide cookies, the script will prompt you to enter them:

```bash
node scripts/fetch-missions.js --input postIds.txt --output missions.json
# Prompt: Enter Reddit cookies:
```

## Command-Line Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--input` | `-i` | Input file with post IDs | `postIds.txt` |
| `--output` | `-o` | Output JSON file | `missions.json` |
| `--cookies` | `-c` | Reddit session cookies | From `.env` or prompt |
| `--delay` | `-d` | Delay between requests (ms) | `1500` |
| `--help` | `-h` | Show help | - |

## Input File Format

Create a text file with one post ID per line:

```
t3_1lvdwlq
t3_1od3es7
1oh01dp
```

**Note:** The `t3_` prefix is optional - the script will add it automatically if missing.

## Output Format

The script produces a JSON file with an array of mission objects:

```json
[
  {
    "postId": "t3_1lvdwlq",
    "difficulty": 3,
    "minLevel": 50,
    "maxLevel": 100,
    "environment": "haunted_forest",
    "foodName": "Spooky Pasta",
    "foodImage": "...",
    "authorName": "username",
    "title": "Mission Title",
    "encounters": [...],
    "rarity": "epic",
    "type": "standard"
  }
]
```

## Examples

### Fetch missions for a list of posts

```bash
# Create input file
cat > postIds.txt << EOF
t3_1lvdwlq
t3_1od3es7
t3_1oh01dp
EOF

# Set cookies in .env
echo 'REDDIT_COOKIES="reddit_session=xxx; loid=yyy"' > .env

# Run script
node scripts/fetch-missions.js
```

### Fetch with custom delay (slower, more polite to Reddit's servers)

```bash
node scripts/fetch-missions.js --delay 3000
```

### Fetch to a specific output file

```bash
node scripts/fetch-missions.js --input my-posts.txt --output results/missions-$(date +%Y%m%d).json
```

## Troubleshooting

### Error: "HTTP 401: Unauthorized"
- Your Reddit cookies are invalid or expired
- Log into Reddit again and get fresh cookies

### Error: "HTTP 403: Forbidden"
- Reddit might be rate-limiting you
- Increase the `--delay` parameter (try 3000-5000ms)
- Check if your Reddit account has access to the SwordAndSupper game

### Error: "Failed to parse mission data"
- The post might not be a SwordAndSupper mission post
- The post might be an Inn post (not a mission)
- Check the raw response in the error output

### No data extracted from valid posts
- Verify the post IDs are correct
- Check that the posts are SwordAndSupper mission posts (not regular Reddit posts)
- The mission might have a different structure than expected

## Rate Limiting

**Important:** Be respectful of Reddit's servers!

- Default delay: 1.5 seconds between requests
- Recommended for large batches: 2-3 seconds
- Do not set delay below 1000ms

## Security Notes

⚠️ **Never commit your `.env` file or share your Reddit cookies!**

- Add `.env` to `.gitignore`
- Cookies are session credentials - treat them like passwords
- Rotate your cookies regularly (log out and back in)

## Post ID Format

Post IDs should be in Reddit's "Thing" ID format:

- **With prefix:** `t3_1lvdwlq` (recommended)
- **Without prefix:** `1lvdwlq` (script will add `t3_` automatically)

Where `t3_` indicates a Reddit "Link" (post) object.

## Advanced Usage

### Filter failed requests

```bash
node scripts/fetch-missions.js --input postIds.txt --output missions.json 2> errors.log
```

### Process only new posts

```bash
# Compare with existing missions
comm -23 <(sort all-posts.txt) <(jq -r '.[].postId' missions.json | sed 's/t3_//') > new-posts.txt
node scripts/fetch-missions.js --input new-posts.txt --output new-missions.json
```

### Merge multiple outputs

```bash
jq -s 'add' missions1.json missions2.json > combined.json
```

## License

Same as the parent project.
