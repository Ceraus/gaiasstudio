import ReactDOM from 'react-dom/client';
import './i18n';
import './lib/fontManager';
import './index.css';
import App from './App';

if (import.meta.env.DEV || import.meta.env.VITE_E2E === 'true') {
  void import('./lib/testBridge');
}

// StrictMode is intentionally omitted: its double-invoke of effects tears down
// and recreates the Fabric canvas, which is disruptive for a canvas editor.
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
