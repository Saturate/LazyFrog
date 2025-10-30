export function Footer() {
  return (
    <footer className="mt-16 pt-8 border-t border-emerald-200 dark:border-emerald-800">
      <div className="text-center">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          FrogDB - Mission Database for{" "}
          <a
            href="https://www.reddit.com/r/SwordAndSupperGame/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            r/SwordAndSupperGame
          </a>
        </p>
        <div className="flex items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
          <a
            href="https://github.com/Saturate/LazyFrog/db"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            GitHub
          </a>
          <span>•</span>
          <span className="opacity-75">
            Made with 🐸 by{" "}
            <a
              href="https://akj.io"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              Allan Kimmer Jensen
            </a>{" "}
            & the community
          </span>
        </div>
      </div>
    </footer>
  );
}
