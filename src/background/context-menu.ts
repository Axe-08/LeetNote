// Context menu registration and click handlers for community clipping
import browser from 'webextension-polyfill';

export function initializeContextMenu() {
  // Clear any existing menu items first to avoid duplication errors
  browser.contextMenus.removeAll().then(() => {
    browser.contextMenus.create({
      id: 'clip-to-leetnote',
      title: '📎 Clip to LeetNote',
      contexts: ['selection'],
      documentUrlPatterns: [
        'https://leetcode.com/problems/*/discuss/*',
        'https://leetcode.com/discuss/*',
        'https://leetcode.com/problems/*'
      ]
    });
  });
}

// Listen for clicks on the context menu item
browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'clip-to-leetnote' && tab?.id !== undefined) {
    // Message the content script in the active tab to grab the selection details
    browser.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' }).catch((err) => {
      console.error('Failed to send GET_SELECTION message to content script:', err);
    });
  }
});
