/**
 * Options Page Entry Point for WXT
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import OptionsPage from '../../src/options/OptionsPage';

const container = document.getElementById('root');
if (container) {
	const root = createRoot(container);
	root.render(<OptionsPage />);
}
