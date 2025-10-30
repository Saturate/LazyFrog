import {
  Zap,
  Target,
  Brain,
  Shield,
  Activity,
  Heart,
  Github,
  Search,
  Sparkles,
  Bug,
  Lightbulb,
  Database,
  ExternalLink,
} from "lucide-react";
import DownloadButton from "@/components/DownloadButton";
import { getLatestDownload } from "@/lib/getLatestDownload";

export const dynamic = "force-static";
export const revalidate = false; // Build-time only; updates on next build
export const runtime = "nodejs";

export default function Home() {
  const latest = getLatestDownload();
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 dark:from-zinc-900 dark:to-emerald-950">
      {/* Hero Section */}
      <header className="container mx-auto px-6 py-16">
        <div className="text-center">
          <div className="text-8xl mb-6">🐸</div>
          <h1 className="text-6xl font-bold text-emerald-800 dark:text-emerald-400 mb-4">
            LazyFrog
          </h1>
          <p className="text-2xl text-emerald-600 dark:text-emerald-300 mb-8">
            Automation bot for Sword & Supper on Reddit
          </p>
          <DownloadButton
            href={latest.href}
            label={`Download v${latest.version}`}
          />
        </div>
      </header>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold text-center text-emerald-800 dark:text-emerald-400 mb-12">
          Features
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Search size={32} />}
            title="Auto Mission Finder"
            description="Unlike other bots, LazyFrog automatically finds and navigates to the next mission to complete. Fully autonomous from start to finish."
          />
          <FeatureCard
            icon={<Sparkles size={32} />}
            title="Customizable Choices"
            description="Rank blessings, items, and decisions based on your preferences. The bot makes choices according to your personalized strategy."
          />
          <FeatureCard
            icon={<Database size={32} />}
            title="Import Missions from DB"
            description="Access our comprehensive mission database to import missions directly into the extension. Browse 300+ missions with filters and stats."
            href="https://frogdb.akj.io"
            external
          />
          <FeatureCard
            icon={<Zap size={32} />}
            title="Auto-Play"
            description="Automatically select and complete missions based on your strategy. The bot handles the grind while you relax."
          />
          <FeatureCard
            icon={<Brain size={32} />}
            title="Smart Decisions"
            description="Advanced state machine that makes intelligent decisions about which missions to prioritize for optimal progression."
          />
          <FeatureCard
            icon={<Shield size={32} />}
            title="Safe & Local"
            description="Everything runs locally in your browser. No data is sent to external servers. Your privacy is protected."
          />
          <FeatureCard
            icon={<Activity size={32} />}
            title="Mission Analytics"
            description="Track your progress, see mission completion rates, and optimize your strategy with detailed logs."
          />
        </div>
      </section>

      {/* Installation Guide */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold text-center text-emerald-800 dark:text-emerald-400 mb-12">
          Installation Guide
        </h2>
        <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8">
          <ol className="space-y-6">
            <InstallStep
              number={1}
              title="Download the Extension"
              description="Click the download button above to get the latest version of LazyFrog."
            />
            <InstallStep
              number={2}
              title="Extract the ZIP File"
              description="Unzip the downloaded file to a location on your computer. Remember this location!"
            />
            <InstallStep
              number={3}
              title="Open Chrome Extensions"
              description="In Chrome, go to chrome://extensions/ or click the three dots → Extensions → Manage Extensions."
            />
            <InstallStep
              number={4}
              title="Enable Developer Mode"
              description="Toggle the 'Developer mode' switch in the top-right corner of the extensions page."
            />
            <InstallStep
              number={5}
              title="Load the Extension"
              description="Click 'Load unpacked' and select the folder where you extracted LazyFrog."
            />
            <InstallStep
              number={6}
              title="Play Sword & Supper"
              description="Navigate to the Sword & Supper game on Reddit and the extension will activate automatically!"
            />
          </ol>
        </div>
      </section>

      {/* How to Use */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold text-center text-emerald-800 dark:text-emerald-400 mb-12">
          How to Use
        </h2>
        <div className="max-w-3xl mx-auto space-y-6">
          <UsageCard
            title="1. Configure Mission Filters"
            description="Open the LazyFrog extension popup and select your preferred mission filters. Choose which types of missions you want the bot to focus on."
          />
          <UsageCard
            title="2. Start the Bot"
            description="After selecting your mission filters, press the Start or Play button in the extension popup. LazyFrog will now automatically select and complete missions based on your filters and its internal logic."
          />
          <UsageCard
            title="3. Step-by-Step Debugging"
            description="Need to see exactly what the bot is doing? Go to Settings and enable 'Step by Step Debugging'. This mode will pause between each action, allowing you to follow along and understand the bot's decision-making process."
          />
          <UsageCard
            title="4. Monitor Progress"
            description="Check the extension's logs to see what decisions the bot is making, track mission completions, and debug any issues. Access logs through the extension popup or DevTools console."
          />
        </div>
      </section>

      {/* Feedback Section */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold text-center text-emerald-800 dark:text-emerald-400 mb-12">
          Feedback & Support
        </h2>
        <div className="max-w-3xl mx-auto">
          <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <Github
                className="text-blue-600 dark:text-blue-400"
                size={32}
              />
              <h3 className="text-2xl font-semibold text-blue-800 dark:text-blue-300">
                Help Improve LazyFrog
              </h3>
            </div>
            <p className="text-blue-700 dark:text-blue-200 mb-6">
              Your feedback is valuable! Whether you&apos;ve found a bug or have an idea for a new feature, let me know on GitHub.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="https://github.com/Saturate/LazyFrog/issues/new?labels=bug&template=bug_report.md"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-md"
              >
                <Bug size={20} />
                Report a Bug
              </a>
              <a
                href="https://github.com/Saturate/LazyFrog/issues/new?labels=enhancement&template=feature_request.md"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-md"
              >
                <Lightbulb size={20} />
                Request Feature
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Donate Section */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold text-center text-emerald-800 dark:text-emerald-400 mb-12">
          Support Development
        </h2>
        <div className="max-w-3xl mx-auto">
          <div className="bg-pink-50 dark:bg-pink-900/20 border-2 border-pink-200 dark:border-pink-800 rounded-xl p-8 text-center">
            <Heart
              className="text-pink-600 dark:text-pink-400 mx-auto mb-6"
              size={48}
            />
            <h3 className="text-2xl font-semibold text-pink-800 dark:text-pink-300 mb-4">
              Enjoying LazyFrog?
            </h3>
            <p className="text-pink-700 dark:text-pink-200 mb-4 text-lg">
              This extension is completely free and always will be. You
              don&apos;t need to donate to use it!
            </p>
            <p className="text-pink-700 dark:text-pink-200 mb-6">
              However, if you&apos;d like to support the development and help me
              continue improving LazyFrog, I would be very happy! Your support
              helps me dedicate more time to fixing bugs, adding features, and
              maintaining the project.
            </p>
            <a
              href="https://github.com/sponsors/Saturate"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-pink-600 hover:bg-pink-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-colors shadow-lg"
            >
              <Heart size={24} />
              Sponsor on GitHub
            </a>
            <p className="text-sm text-pink-600 dark:text-pink-300 mt-4 opacity-75">
              Not required • Not needed • Just appreciated 💚
            </p>
            <p className="text-pink-700 dark:text-pink-200 mt-8 pt-8 border-t border-pink-200 dark:border-pink-800">
              ⚔️ <strong>Love Sword & Supper?</strong> Don&apos;t forget to
              support the game developers too! They created this amazing game
              that we all enjoy. 🎮
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-12 text-center text-emerald-600 dark:text-emerald-400">
        <p className="mb-2">LazyFrog - Automation for Sword & Supper</p>
        <p className="text-sm opacity-75">Made with 🐸 for lazy adventurers</p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  href,
  external,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  external?: boolean;
}) {
  const content = (
    <>
      <div className="text-emerald-600 dark:text-emerald-400 mb-4 flex items-center justify-between">
        {icon}
        {external && <ExternalLink size={20} className="text-gray-400" />}
      </div>
      <h3 className="text-xl font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="block bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow hover:scale-105 transform transition-transform"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
      {content}
    </div>
  );
}

function InstallStep({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <li className="flex gap-4">
      <div className="flex-shrink-0 w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold">
        {number}
      </div>
      <div>
        <h3 className="text-xl font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300">{description}</p>
      </div>
    </li>
  );
}

function UsageCard({
  title,
  description,
  code,
}: {
  title: string;
  description: string;
  code?: string[];
}) {
  return (
    <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-lg">
      <h3 className="text-2xl font-semibold text-emerald-800 dark:text-emerald-300 mb-3">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-300 mb-4">{description}</p>
      {code && (
        <pre className="bg-zinc-900 text-emerald-400 p-4 rounded-lg overflow-x-auto">
          <code>{code.join("\n")}</code>
        </pre>
      )}
    </div>
  );
}
