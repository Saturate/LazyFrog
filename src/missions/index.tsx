import React from 'react';
import { createRoot } from 'react-dom/client';
import MissionsPage from './MissionsPage';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<MissionsPage />);
}
