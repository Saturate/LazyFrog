/**
 * Popup UI Entry Point for WXT
 * React-based extension popup
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import PopupApp from '../../src/popup/PopupApp';
import '../../src/popup/popup.css'; // Import CSS directly

const container = document.getElementById('root');
if (container) {
	const root = createRoot(container);
	root.render(<PopupApp />);
}
