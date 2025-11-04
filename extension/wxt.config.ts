import { defineConfig } from 'wxt';
import packageJson from './package.json';

export default defineConfig({
	modules: ['@wxt-dev/module-react'],
	outDir: 'dist',

	manifest: {
		name: 'LazyFrog',
		version: packageJson.version, // Auto-sync from package.json
		description:
			'Automation bot for the Sword & Supper Reddit game. Catalogs missions and plays them!',
		permissions: ['storage', 'activeTab', 'scripting', 'tabs', 'unlimitedStorage'],
		host_permissions: ['https://www.reddit.com/*', 'https://*.devvit.net/*'],
		icons: {
			16: '/icons/icon16.png',
			32: '/icons/icon32.png',
			48: '/icons/icon48.png',
			128: '/icons/icon128.png',
		},
		browser_specific_settings: {
			gecko: {
				id: 'autosupper@akj.io',
			},
		},
		web_accessible_resources: [
			{
				resources: ['fetchInterceptor.js', 'missionDataFetcher.js'],
				matches: ['https://www.reddit.com/*'],
			},
		],
	},

	// Define global constants (replaces webpack.DefinePlugin)
	vite: () => ({
		define: {
			__VERSION__: JSON.stringify(packageJson.version),
			__BUILD_TIME__: JSON.stringify(new Date().toISOString()),
		},
		build: {
			minify: false,
		},
	}),
});
