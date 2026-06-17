// Sidebar injector creating closed Shadow DOM host and docked trigger
import browser from 'webextension-polyfill';
import { SIDEBAR_WIDTH_DEFAULT } from '../shared/constants';
import { mountSidebar } from '../sidebar/main';

let hostElement: HTMLDivElement | null = null;
let shadowRootRef: ShadowRoot | null = null;
let triggerButton: HTMLButtonElement | null = null;

/**
 * Returns whether the sidebar is currently visible (width > 0)
 */
export function isSidebarOpen(): boolean {
  if (!hostElement) return false;
  return parseInt(hostElement.style.width, 10) > 0;
}

/**
 * Toggles the sidebar visibility with transitions
 */
export function toggleSidebar(): void {
  if (!hostElement) {
    injectSidebar();
  }

  if (hostElement) {
    const isOpen = isSidebarOpen();
    if (isOpen) {
      hostElement.style.width = '0px';
      if (triggerButton) {
        triggerButton.style.right = '0px';
      }
    } else {
      hostElement.style.width = `${SIDEBAR_WIDTH_DEFAULT}px`;
      if (triggerButton) {
        triggerButton.style.right = `${SIDEBAR_WIDTH_DEFAULT}px`;
      }
    }

    // Dispatch custom event for content script listeners
    window.dispatchEvent(
      new CustomEvent('leetnote:sidebar-toggle', {
        detail: { open: !isOpen },
      })
    );
  }
}

/**
 * Detects page theme (dark/light) and updates the shadow host data-theme attribute
 */
function updateTheme(): void {
  if (!hostElement) return;
  const isDark = document.documentElement.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  hostElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

/**
 * Injects the Shadow DOM host, trigger button, and renders React sidebar App
 */
export function injectSidebar(): void {
  if (document.getElementById('leetnote-sidebar-host')) return;

  // 1. Create Host Element
  hostElement = document.createElement('div');
  hostElement.id = 'leetnote-sidebar-host';
  hostElement.style.position = 'fixed';
  hostElement.style.top = '0';
  hostElement.style.right = '0';
  hostElement.style.height = '100vh';
  hostElement.style.zIndex = '99990';
  hostElement.style.width = '0px';
  hostElement.style.transition = 'width 180ms ease-out';
  hostElement.style.boxShadow = '-2px 0 10px rgba(0,0,0,0.1)';
  hostElement.style.overflow = 'hidden';

  // 2. Attach Shadow DOM in closed mode
  shadowRootRef = hostElement.attachShadow({ mode: 'closed' });

  // 3. Inject CSS Link Tags into Shadow DOM
  const cssUrl = browser.runtime.getURL('sidebar.css');
  const linkEl = document.createElement('link');
  linkEl.rel = 'stylesheet';
  linkEl.href = cssUrl;
  shadowRootRef.appendChild(linkEl);

  // Font imports
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';
  shadowRootRef.appendChild(fontLink);

  // 4. Create React Mount Container
  const mountContainer = document.createElement('div');
  mountContainer.id = 'leetnote-sidebar-root';
  mountContainer.style.height = '100%';
  mountContainer.style.width = '100%';
  shadowRootRef.appendChild(mountContainer);

  // Append host to body
  document.body.appendChild(hostElement);

  // 5. Initialize Theme and Dark Mode Observers
  updateTheme();
  const themeObserver = new MutationObserver(() => updateTheme());
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

  // 6. Create Docked Toggle Trigger Button
  createTriggerButton();

  // 7. Mount React App inside Shadow DOM
  try {
    mountSidebar(mountContainer);
  } catch (err) {
    console.error('Failed to mount sidebar React app:', err);
  }
}

/**
 * Creates a vertically centered fixed toggle trigger on the viewport's right margin
 */
function createTriggerButton(): void {
  if (document.getElementById('leetnote-sidebar-trigger')) return;

  triggerButton = document.createElement('button');
  triggerButton.id = 'leetnote-sidebar-trigger';
  triggerButton.style.position = 'fixed';
  triggerButton.style.right = '0px';
  triggerButton.style.top = '50%';
  triggerButton.style.transform = 'translateY(-50%)';
  triggerButton.style.zIndex = '99991';
  triggerButton.style.width = '40px';
  triggerButton.style.height = '48px';
  triggerButton.style.border = 'none';
  triggerButton.style.borderRadius = '8px 0 0 8px';
  triggerButton.style.cursor = 'pointer';
  triggerButton.style.backgroundColor = '#6366F1'; // Electric Indigo
  triggerButton.style.color = '#FFFFFF';
  triggerButton.style.display = 'flex';
  triggerButton.style.alignItems = 'center';
  triggerButton.style.justifyContent = 'center';
  triggerButton.style.boxShadow = '-2px 2px 8px rgba(0,0,0,0.15)';
  triggerButton.style.transition = 'right 180ms ease-out, background-color 150ms';

  // SVG logo icon
  triggerButton.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="16 18 22 12 16 6"></polyline>
      <polyline points="8 6 2 12 8 18"></polyline>
      <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor"></rect>
    </svg>
  `;

  triggerButton.addEventListener('click', () => toggleSidebar());
  triggerButton.addEventListener('mouseenter', () => {
    if (triggerButton) triggerButton.style.backgroundColor = '#4F46E5'; // Darker indigo
  });
  triggerButton.addEventListener('mouseleave', () => {
    if (triggerButton) triggerButton.style.backgroundColor = '#6366F1';
  });

  document.body.appendChild(triggerButton);
}
