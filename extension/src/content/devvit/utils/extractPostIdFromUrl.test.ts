import { describe, it, expect } from 'vitest';
import { extractPostIdFromUrl } from './extractPostIdFromUrl';

const urls = {
	t3_1od6q1h:
		'https://cabbageidle-eimoap-0-0-50-webview.devvit.net/index.html?webbit_token=eyJhbGciOiJIUzI1NiIsImtpZCI6ImVlYzJjOWUzLWM0NTctNTM3Zi05NThmLTI5MDg3N2U4NjNlYyIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkZXZ2aXQtZ2F0ZXdheS5yZWRkaXQuY29tIiwiYXVkIjpbIjdmMmU4MGQ3LTY4MjEtNGEyMC05NDA1LTA1YzNiNDMwMTJlYS0wLTAtNTAtd2Vidmlldy5kZXZ2aXQubmV0Il0sImV4cCI6MTc2MTIyNzMzNCwibmJmIjoxNzYxMTQwOTM0LCJpYXQiOjE3NjExNDA5MzQsImp0aSI6ImUwNjIzYmUyLWEzODYtNDQ0ZS04YTVmLWY2N2ZjMDg5NzAxZSIsImRldnZpdC1wb3N0LWlkIjoidDNfMW9kNnExaCIsImRldnZpdC1wb3N0LWRhdGEiOm51bGwsImRldnZpdC11c2VyLWlkIjoidDJfNmd4b2QiLCJkZXZ2aXQtaW5zdGFsbGF0aW9uIjoiN2YyZTgwZDctNjgyMS00YTIwLTk0MDUtMDVjM2I0MzAxMmVhIn0.HJn8C_OGZeIwKiH6qvXPagpAQDPTF2BsovPsqFauRPM&context=%7B%22subredditId%22%3A%22t5_eimoap%22%2C%22subredditName%22%3A%22SwordAndSupperGame%22%2C%22userId%22%3A%22t2_6gxod%22%2C%22appName%22%3A%22cabbageidle%22%2C%22appVersion%22%3A%220.0.50%22%2C%22postId%22%3A%22t3_1od6q1h%22%7D#%7B%22client%22%3A3%2C%22devvitDebug%22%3A%22%22%2C%22postData%22%3A%7B%7D%2C%22webbitToken%22%3A%22eyJhbGciOiJIUzI1NiIsImtpZCI6ImVlYzJjOWUzLWM0NTctNTM3Zi05NThmLTI5MDg3N2U4NjNlYyIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkZXZ2aXQtZ2F0ZXdheS5yZWRkaXQuY29tIiwiYXVkIjpbIjdmMmU4MGQ3LTY4MjEtNGEyMC05NDA1LTA1YzNiNDMwMTJlYS0wLTAtNTAtd2Vidmlldy5kZXZ2aXQubmV0Il0sImV4cCI6MTc2MTIyNzMzNCwibmJmIjoxNzYxMTQwOTM0LCJpYXQiOjE3NjExNDA5MzQsImp0aSI6ImUwNjIzYmUyLWEzODYtNDQ0ZS04YTVmLWY2N2ZjMDg5NzAxZSIsImRldnZpdC1wb3N0LWlkIjoidDNfMW9kNnExaCIsImRldnZpdC1wb3N0LWRhdGEiOm51bGwsImRldnZpdC11c2VyLWlkIjoidDJfNmd4b2QiLCJkZXZ2aXQtaW5zdGFsbGF0aW9uIjoiN2YyZTgwZDctNjgyMS00YTIwLTk0MDUtMDVjM2I0MzAxMmVhIn0.HJn8C_OGZeIwKiH6qvXPagpAQDPTF2BsovPsqFauRPM%22%2C%22webViewContext%22%3A%7B%22appName%22%3A%22cabbageidle%22%2C%22appVersion%22%3A%220.0.50%22%2C%22postId%22%3A%22t3_1od6q1h%22%2C%22subredditId%22%3A%22t5_eimoap%22%2C%22subredditName%22%3A%22SwordAndSupperGame%22%2C%22userId%22%3A%22t2_6gxod%22%7D%2C%22appPermissionState%22%3A%7B%22consentStatus%22%3A0%2C%22requestedScopes%22%3A%5B%5D%2C%22grantedScopes%22%3A%5B%5D%7D%2C%22viewMode%22%3A2%2C%22signedRequestContext%22%3A%22eyJhbGciOiJSUzI1NiIsImtpZCI6IjZiYWQ1NGQ0LTEwNTgtNTVhZC1iNzg5LTMxYjY3YzY2YTdlMCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkZXZ2aXQtZ2F0ZXdheS5yZWRkaXQuY29tIiwiYXVkIjpbInBsdWdpbnMuZGV2dml0Lm5ldCJdLCJleHAiOjE3NjExNDQ1MzQsIm5iZiI6MTc2MTE0MDkzNCwiaWF0IjoxNzYxMTQwOTM0LCJqdGkiOiIwYzk3NzFmMi1lYzUwLTQ2MzAtODMwYS03NTA4NDEyZGJlOTYiLCJkZXZ2aXQiOnsiaW5zdGFsbGF0aW9uIjp7ImlkIjoiN2YyZTgwZDctNjgyMS00YTIwLTk0MDUtMDVjM2I0MzAxMmVhIn0sImFwcCI6eyJpZCI6ImNhYmJhZ2VpZGxlIiwibmFtZSI6IlN3b3JkIFx1MDAyNiBTdXBwZXIiLCJ2ZXJzaW9uIjoiMC4wLjUwIiwic3RhdHVzIjoyfSwicG9zdCI6eyJpZCI6InQzXzFvZDZxMWgiLCJhdXRob3IiOiJ0Ml9qaDk5bG1oNCJ9LCJzdWJyZWRkaXQiOnsibmFtZSI6IlN3b3JkQW5kU3VwcGVyR2FtZSIsImlkIjoidDVfZWltb2FwIn0sInVzZXIiOnsibmFtZSI6IkFLSjkwIiwiaWQiOiJ0Ml82Z3hvZCIsInNub292YXRhciI6Imh0dHBzOi8vaS5yZWRkLml0L3Nub292YXRhci9hdmF0YXJzL25mdHYyX2JtWjBYMlZwY0RFMU5Ub3hNemRmWXpoa00yRXpZVGd6WW1SbE5XUmhaREEyWkRRek5qWTVOR1V6WlRJeVlXTXpaVFkwWkRVM04xOHhPVEUyTkRBNV9yYXJlX2MxNTk1YmMwLWEyYTYtNDQ2Yi1hZWM0LTUxNzhjZDFkMmI3My5wbmcifX19.XWM89GeX0-t1XvDsJQCrlIk33mytWuEvCtlZG9hHsFiZU10Gqjp8y8MmGYuhJ9RE-w3XBJ_xWG6wj8Q42d0fEYG6Tltz5Bgh5SbmQsHSwBzvAT-bgMghPdAICX4DlshTKo-KUBBnlCEZqA1rT4Z3x4HByPWa_vPRLI7zLurtjP5Q8e2buNJF7etP-DqXYDi6fM4DrY7RaC80_CSkuQuwMZqNk0aZ6QKmE2KLXhrO7gPaSAlIPgU2wDEDn56Y4z1Yd2q7UFhU85Fe-tv4hVmuqaF7dqVhSHrdGZWfrAWbQQ4q730YnN-eARrhaYMJMT8RdxYIlLVopZJfNmdkOBhEsg%22%2C%22webViewClientData%22%3A%7B%22appConfig%22%3A%7B%7D%7D%7D',
	t3_1od6q53:
		'https://cabbageidle-eimoap-0-0-50-webview.devvit.net/index.html?webbit_token=eyJhbGciOiJIUzI1NiIsImtpZCI6ImVlYzJjOWUzLWM0NTctNTM3Zi05NThmLTI5MDg3N2U4NjNlYyIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkZXZ2aXQtZ2F0ZXdheS5yZWRkaXQuY29tIiwiYXVkIjpbIjdmMmU4MGQ3LTY4MjEtNGEyMC05NDA1LTA1YzNiNDMwMTJlYS0wLTAtNTAtd2Vidmlldy5kZXZ2aXQubmV0Il0sImV4cCI6MTc2MTIyODE3NCwibmJmIjoxNzYxMTQxNzc0LCJpYXQiOjE3NjExNDE3NzQsImp0aSI6ImIyZjhmNGIyLWU5ZTAtNGFiMi1hMTA0LWVmYmExNjA1Zjk1ZSIsImRldnZpdC1wb3N0LWlkIjoidDNfMW9kNnE1MyIsImRldnZpdC1wb3N0LWRhdGEiOm51bGwsImRldnZpdC11c2VyLWlkIjoidDJfNmd4b2QiLCJkZXZ2aXQtaW5zdGFsbGF0aW9uIjoiN2YyZTgwZDctNjgyMS00YTIwLTk0MDUtMDVjM2I0MzAxMmVhIn0.izdxy9fC5O8vED40xzDMt7ZRqdDxr3gwLLsERvMw6Xg&context=%7B%22subredditId%22%3A%22t5_eimoap%22%2C%22subredditName%22%3A%22SwordAndSupperGame%22%2C%22userId%22%3A%22t2_6gxod%22%2C%22appName%22%3A%22cabbageidle%22%2C%22appVersion%22%3A%220.0.50%22%2C%22postId%22%3A%22t3_1od6q53%22%7D#%7B%22client%22%3A3%2C%22devvitDebug%22%3A%22%22%2C%22postData%22%3A%7B%7D%2C%22webbitToken%22%3A%22eyJhbGciOiJIUzI1NiIsImtpZCI6ImVlYzJjOWUzLWM0NTctNTM3Zi05NThmLTI5MDg3N2U4NjNlYyIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkZXZ2aXQtZ2F0ZXdheS5yZWRkaXQuY29tIiwiYXVkIjpbIjdmMmU4MGQ3LTY4MjEtNGEyMC05NDA1LTA1YzNiNDMwMTJlYS0wLTAtNTAtd2Vidmlldy5kZXZ2aXQubmV0Il0sImV4cCI6MTc2MTIyODE3NCwibmJmIjoxNzYxMTQxNzc0LCJpYXQiOjE3NjExNDE3NzQsImp0aSI6ImIyZjhmNGIyLWU5ZTAtNGFiMi1hMTA0LWVmYmExNjA1Zjk1ZSIsImRldnZpdC1wb3N0LWlkIjoidDNfMW9kNnE1MyIsImRldnZpdC1wb3N0LWRhdGEiOm51bGwsImRldnZpdC11c2VyLWlkIjoidDJfNmd4b2QiLCJkZXZ2aXQtaW5zdGFsbGF0aW9uIjoiN2YyZTgwZDctNjgyMS00YTIwLTk0MDUtMDVjM2I0MzAxMmVhIn0.izdxy9fC5O8vED40xzDMt7ZRqdDxr3gwLLsERvMw6Xg%22%2C%22webViewContext%22%3A%7B%22appName%22%3A%22cabbageidle%22%2C%22appVersion%22%3A%220.0.50%22%2C%22postId%22%3A%22t3_1od6q53%22%2C%22subredditId%22%3A%22t5_eimoap%22%2C%22subredditName%22%3A%22SwordAndSupperGame%22%2C%22userId%22%3A%22t2_6gxod%22%7D%2C%22appPermissionState%22%3A%7B%22consentStatus%22%3A0%2C%22requestedScopes%22%3A%5B%5D%2C%22grantedScopes%22%3A%5B%5D%7D%2C%22viewMode%22%3A2%2C%22signedRequestContext%22%3A%22eyJhbGciOiJSUzI1NiIsImtpZCI6IjZiYWQ1NGQ0LTEwNTgtNTVhZC1iNzg5LTMxYjY3YzY2YTdlMCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkZXZ2aXQtZ2F0ZXdheS5yZWRkaXQuY29tIiwiYXVkIjpbInBsdWdpbnMuZGV2dml0Lm5ldCJdLCJleHAiOjE3NjExNDUzNzQsIm5iZiI6MTc2MTE0MTc3NCwiaWF0IjoxNzYxMTQxNzc0LCJqdGkiOiJlOTFlN2JmOC04NzQ3LTQ0YTktYjFhOC0yN2EyZDRlY2Q4NjIiLCJkZXZ2aXQiOnsiaW5zdGFsbGF0aW9uIjp7ImlkIjoiN2YyZTgwZDctNjgyMS00YTIwLTk0MDUtMDVjM2I0MzAxMmVhIn0sImFwcCI6eyJpZCI6ImNhYmJhZ2VpZGxlIiwibmFtZSI6IlN3b3JkIFx1MDAyNiBTdXBwZXIiLCJ2ZXJzaW9uIjoiMC4wLjUwIiwic3RhdHVzIjoyfSwicG9zdCI6eyJpZCI6InQzXzFvZDZxNTMiLCJhdXRob3IiOiJ0Ml8xaDZzYjh2YiJ9LCJzdWJyZWRkaXQiOnsibmFtZSI6IlN3b3JkQW5kU3VwcGVyR2FtZSIsImlkIjoidDVfZWltb2FwIn0sInVzZXIiOnsibmFtZSI6IkFLSjkwIiwiaWQiOiJ0Ml82Z3hvZCIsInNub292YXRhciI6Imh0dHBzOi8vaS5yZWRkLml0L3Nub292YXRhci9hdmF0YXJzL25mdHYyX2JtWjBYMlZwY0RFMU5Ub3hNemRmWXpoa00yRXpZVGd6WW1SbE5XUmhaREEyWkRRek5qWTVOR1V6WlRJeVlXTXpaVFkwWkRVM04xOHhPVEUyTkRBNV9yYXJlX2MxNTk1YmMwLWEyYTYtNDQ2Yi1hZWM0LTUxNzhjZDFkMmI3My5wbmcifX19.ewes_jY5ytFC77qT4ocerDIwClXcKH_1Y_68Pyb6udJsBCufBjUagXzKnpoeJYsWZY6Cy5aq3HWBJQwmJjIFVruiKUbXoswsnNXiIFzKFI45IRkNLRDJiVUAH3tMWEouoYzyHPlRTwWartjGzs1MVPfqifn5qq2zWrB1OOH_yy3ROg3lGxsGiekhFqUzdhTpIYm_Y4aegsedtaDKJW8RiADUmRxdsDGQkIlEgBrN-fzqgUAYfBvW4-aqZ1AgS-u-rigv_etGbS-BIXKkMddK6A-8ZaC26Z_3N7tokzzulMgvBblb6NBDomCRdgWt1Mv_LLQTa7f5a19J7m1moidzPg%22%2C%22webViewClientData%22%3A%7B%22appConfig%22%3A%7B%7D%7D%7D',
};

describe('extractPostIdFromUrl', () => {
	describe('Devvit iframe URLs with context parameter', () => {
		it('should extract postId from context parameter (first real URL)', () => {
			const url = urls.t3_1od6q1h;
			const result = extractPostIdFromUrl(url);
			expect(result).toBe('t3_1od6q1h');
		});

		it('should extract postId from context parameter (second real URL)', () => {
			const url = urls.t3_1od6q53;
			const result = extractPostIdFromUrl(url);
			expect(result).toBe('t3_1od6q53');
		});

		it('should handle simple context parameter', () => {
			const url =
				'https://example.devvit.net/index.html?context=%7B%22postId%22%3A%22t3_abc123%22%7D';
			const result = extractPostIdFromUrl(url);
			expect(result).toBe('t3_abc123');
		});

		it('should handle context parameter with additional data', () => {
			const url =
				'https://example.devvit.net/index.html?context=%7B%22subredditId%22%3A%22t5_test%22%2C%22postId%22%3A%22t3_xyz789%22%2C%22userId%22%3A%22t2_user%22%7D';
			const result = extractPostIdFromUrl(url);
			expect(result).toBe('t3_xyz789');
		});
	});

	describe('Devvit iframe URLs with JWT token', () => {
		it('should extract postId from JWT token when context is missing', () => {
			// URL with only JWT token (no context parameter)
			const url =
				'https://cabbageidle-eimoap-0-0-50-webview.devvit.net/index.html?webbit_token=eyJhbGciOiJIUzI1NiIsImtpZCI6ImVlYzJjOWUzLWM0NTctNTM3Zi05NThmLTI5MDg3N2U4NjNlYyIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkZXZ2aXQtZ2F0ZXdheS5yZWRkaXQuY29tIiwiYXVkIjpbIjdmMmU4MGQ3LTY4MjEtNGEyMC05NDA1LTA1YzNiNDMwMTJlYS0wLTAtNTAtd2Vidmlldy5kZXZ2aXQubmV0Il0sImV4cCI6MTc2MTIyNzMzNCwibmJmIjoxNzYxMTQwOTM0LCJpYXQiOjE3NjExNDA5MzQsImp0aSI6ImUwNjIzYmUyLWEzODYtNDQ0ZS04YTVmLWY2N2ZjMDg5NzAxZSIsImRldnZpdC1wb3N0LWlkIjoidDNfMW9kNnExaCIsImRldnZpdC1wb3N0LWRhdGEiOm51bGwsImRldnZpdC11c2VyLWlkIjoidDJfNmd4b2QiLCJkZXZ2aXQtaW5zdGFsbGF0aW9uIjoiN2YyZTgwZDctNjgyMS00YTIwLTk0MDUtMDVjM2I0MzAxMmVhIn0.HJn8C_OGZeIwKiH6qvXPagpAQDPTF2BsovPsqFauRPM';

			const result = extractPostIdFromUrl(url);
			expect(result).toBe('t3_1od6q1h');
		});

		it('should extract postId from JWT token (second URL)', () => {
			// URL with only JWT token (no context parameter)
			const url =
				'https://cabbageidle-eimoap-0-0-50-webview.devvit.net/index.html?webbit_token=eyJhbGciOiJIUzI1NiIsImtpZCI6ImVlYzJjOWUzLWM0NTctNTM3Zi05NThmLTI5MDg3N2U4NjNlYyIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkZXZ2aXQtZ2F0ZXdheS5yZWRkaXQuY29tIiwiYXVkIjpbIjdmMmU4MGQ3LTY4MjEtNGEyMC05NDA1LTA1YzNiNDMwMTJlYS0wLTAtNTAtd2Vidmlldy5kZXZ2aXQubmV0Il0sImV4cCI6MTc2MTIyODE3NCwibmJmIjoxNzYxMTQxNzc0LCJpYXQiOjE3NjExNDE3NzQsImp0aSI6ImIyZjhmNGIyLWU5ZTAtNGFiMi1hMTA0LWVmYmExNjA1Zjk1ZSIsImRldnZpdC1wb3N0LWlkIjoidDNfMW9kNnE1MyIsImRldnZpdC1wb3N0LWRhdGEiOm51bGwsImRldnZpdC11c2VyLWlkIjoidDJfNmd4b2QiLCJkZXZ2aXQtaW5zdGFsbGF0aW9uIjoiN2YyZTgwZDctNjgyMS00YTIwLTk0MDUtMDVjM2I0MzAxMmVhIn0.izdxy9fC5O8vED40xzDMt7ZRqdDxr3gwLLsERvMw6Xg';

			const result = extractPostIdFromUrl(url);
			expect(result).toBe('t3_1od6q53');
		});

		it('should handle malformed JWT token gracefully', () => {
			const url = 'https://example.devvit.net/index.html?webbit_token=invalid.jwt.token';
			const result = extractPostIdFromUrl(url);
			expect(result).toBeNull();
		});

		it('should handle JWT token without devvit-post-id', () => {
			// Create a valid JWT structure but without the devvit-post-id field
			const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
			const payload = btoa(JSON.stringify({ iss: 'devvit-gateway.reddit.com', exp: 1761227334 }));
			const signature = 'signature';
			const token = `${header}.${payload}.${signature}`;

			const url = `https://example.devvit.net/index.html?webbit_token=${token}`;
			const result = extractPostIdFromUrl(url);
			expect(result).toBeNull();
		});
	});

	describe('Legacy Reddit URLs', () => {
		it('should extract postId from Reddit comments URL', () => {
			const url =
				'https://www.reddit.com/r/SwordAndSupperGame/comments/1od6q1h/treasure_and_pod_on_grassy_plains/';
			const result = extractPostIdFromUrl(url);
			expect(result).toBe('t3_1od6q1h');
		});

		it('should extract postId from Reddit comments URL with embed parameter', () => {
			const url =
				'https://www.reddit.com/r/SwordAndSupperGame/comments/1od6q53/some_mission_title/?embed=true';
			const result = extractPostIdFromUrl(url);
			expect(result).toBe('t3_1od6q53');
		});

		it('should handle Reddit URL with additional parameters', () => {
			const url =
				'https://www.reddit.com/r/SwordAndSupperGame/comments/abc123/mission_title/?sort=hot&t=all';
			const result = extractPostIdFromUrl(url);
			expect(result).toBe('t3_abc123');
		});
	});

	describe('Edge cases and error handling', () => {
		it('should return null for invalid URLs', () => {
			const result = extractPostIdFromUrl('not-a-url');
			expect(result).toBeNull();
		});

		it('should return null for URLs without postId information', () => {
			const url = 'https://example.com/some/path';
			const result = extractPostIdFromUrl(url);
			expect(result).toBeNull();
		});

		it('should return null for empty string', () => {
			const result = extractPostIdFromUrl('');
			expect(result).toBeNull();
		});

		it('should handle malformed context JSON gracefully', () => {
			const url = 'https://example.devvit.net/index.html?context=invalid-json';
			const result = extractPostIdFromUrl(url);
			expect(result).toBeNull();
		});

		it('should handle context without postId field', () => {
			const context = JSON.stringify({ subredditId: 't5_test', userId: 't2_user' });
			const url = `https://example.devvit.net/index.html?context=${encodeURIComponent(context)}`;
			const result = extractPostIdFromUrl(url);
			expect(result).toBeNull();
		});

		it('should prioritize context parameter over JWT token', () => {
			// URL with both context and JWT token - context should take precedence
			const context = JSON.stringify({ postId: 't3_context_priority' });
			const url = `https://example.devvit.net/index.html?context=${encodeURIComponent(context)}&webbit_token=eyJhbGciOiJIUzI1NiIsImtpZCI6ImVlYzJjOWUzLWM0NTctNTM3Zi05NThmLTI5MDg3N2U4NjNlYyIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkZXZ2aXQtZ2F0ZXdheS5yZWRkaXQuY29tIiwiYXVkIjpbIjdmMmU4MGQ3LTY4MjEtNGEyMC05NDA1LTA1YzNiNDMwMTJlYS0wLTAtNTAtd2Vidmlldy5kZXZ2aXQubmV0Il0sImV4cCI6MTc2MTIyNzMzNCwibmJmIjoxNzYxMTQwOTM0LCJpYXQiOjE3NjExNDA5MzQsImp0aSI6ImUwNjIzYmUyLWEzODYtNDQ0ZS04YTVmLWY2N2ZjMDg5NzAxZSIsImRldnZpdC1wb3N0LWlkIjoidDNfMW9kNnExaCIsImRldnZpdC1wb3N0LWRhdGEiOm51bGwsImRldnZpdC11c2VyLWlkIjoidDJfNmd4b2QiLCJkZXZ2aXQtaW5zdGFsbGF0aW9uIjoiN2YyZTgwZDctNjgyMS00YTIwLTk0MDUtMDVjM2I0MzAxMmVhIn0.HJn8C_OGZeIwKiH6qvXPagpAQDPTF2BsovPsqFauRPM`;

			const result = extractPostIdFromUrl(url);
			expect(result).toBe('t3_context_priority');
		});
	});

	describe('Real-world URL variations', () => {
		it('should handle URL with hash fragment', () => {
			// Test with a simple context parameter that doesn't have hash fragments in the JSON
			const context = JSON.stringify({ postId: 't3_1od6q1h' });
			const url = `https://cabbageidle-eimoap-0-0-50-webview.devvit.net/index.html?context=${encodeURIComponent(context)}#some-hash`;
			const result = extractPostIdFromUrl(url);
			expect(result).toBe('t3_1od6q1h');
		});

		it('should handle URL with multiple query parameters', () => {
			const url =
				'https://example.devvit.net/index.html?param1=value1&context=%7B%22postId%22%3A%22t3_test123%22%7D&param2=value2';
			const result = extractPostIdFromUrl(url);
			expect(result).toBe('t3_test123');
		});

		it('should handle URL with encoded characters in context', () => {
			const context = JSON.stringify({
				postId: 't3_1od6q1h',
				title: 'Mission with special chars: & < > " \'',
			});
			const url = `https://example.devvit.net/index.html?context=${encodeURIComponent(context)}`;
			const result = extractPostIdFromUrl(url);
			expect(result).toBe('t3_1od6q1h');
		});
	});
});
