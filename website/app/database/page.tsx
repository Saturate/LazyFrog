'use client';

import { useEffect } from 'react';

export default function DatabaseRedirect() {
  useEffect(() => {
    window.location.href = 'https://frogdb.akj.io';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🐸</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Redirecting to FrogDB...
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          If you are not redirected automatically, {' '}
          <a href="https://frogdb.akj.io" className="text-emerald-600 dark:text-emerald-400 underline">
            click here
          </a>
        </p>
      </div>
    </div>
  );
}
