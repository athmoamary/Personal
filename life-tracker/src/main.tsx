import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { IS_WEB } from './lib/env';

if (IS_WEB) {
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  // Ask the browser not to evict saved data when space runs low.
  navigator.storage?.persist?.().catch(() => {});
}

createRoot(document.getElementById('root')!).render(<App />);
