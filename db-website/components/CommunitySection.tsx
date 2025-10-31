import { Heart, FileJson } from 'lucide-react';

export function CommunitySection() {
	return (
		<div className="mt-12 max-w-4xl mx-auto space-y-6">
			{/* JSON Schema */}
			<div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6 text-center">
				<div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full mx-auto mb-3">
					<FileJson className="w-6 h-6 text-blue-600 dark:text-blue-400" />
				</div>
				<h3 className="text-xl font-semibold text-blue-800 dark:text-blue-300 mb-2">
					Mission JSON Schema
				</h3>
				<p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
					Validate your mission data with our JSON Schema
				</p>
				<a
					href="/mission-schema.json"
					download
					className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
				>
					<FileJson className="w-4 h-4" />
					Download Schema
				</a>
			</div>

			{/* Community */}
			<div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl p-8 text-center">
				<div className="flex items-center justify-center w-16 h-16 bg-emerald-100 dark:bg-emerald-900/50 rounded-full mx-auto mb-4">
					<Heart className="w-8 h-8 text-emerald-600 dark:text-emerald-400 fill-emerald-600 dark:fill-emerald-400" />
				</div>
				<h3 className="text-2xl font-semibold text-emerald-800 dark:text-emerald-300 mb-3">
					Community Powered
				</h3>
				<p className="text-gray-700 dark:text-gray-300 mb-4">
					This database is made possible by the amazing r/SwordAndSupper community. Every mission
					you see here has been played, documented, and shared by fellow adventurers.
				</p>
				<p className="text-gray-600 dark:text-gray-400 text-sm">
					Thank you to everyone who has contributed missions and helped build this resource!
				</p>
			</div>
		</div>
	);
}
