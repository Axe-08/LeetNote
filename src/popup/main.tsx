import { createRoot } from 'react-dom/client';
import { PopupApp } from './PopupApp';

const container = document.getElementById('popup-root');
if (container) {
  const root = createRoot(container);
  root.render(<PopupApp />);
}
