// React sidebar entry point
import { createRoot } from 'react-dom/client';
import { SidebarApp } from './Sidebar';
import './styles/sidebar.css';

export function mountSidebar(container: HTMLElement) {
  const root = createRoot(container);
  root.render(<SidebarApp />);
  return root;
}

// Fallback for non-shadow-DOM development
const container = document.getElementById('leetnote-sidebar-root');
if (container) {
  mountSidebar(container);
}
