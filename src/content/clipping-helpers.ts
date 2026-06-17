// Shared helpers for text and code clipping across content scripts
import browser from 'webextension-polyfill';

export function findAuthorHandle(node: Node | null): string | null {
  if (!node) return null;
  let element: HTMLElement | null = node.nodeType === Node.ELEMENT_NODE 
    ? (node as HTMLElement) 
    : node.parentElement;

  while (element && element !== document.body) {
    // Check common LeetCode user link patterns in discuss pages
    const userLinks = element.querySelectorAll('a[href*="/u/"]');
    for (const link of Array.from(userLinks)) {
      const href = link.getAttribute('href');
      if (href) {
        const parts = href.split('/u/').filter(Boolean);
        if (parts.length > 0) {
          return parts[parts.length - 1].split('/')[0].trim();
        }
      }
    }

    // Fallback: Check elements with classes containing 'username' or 'author'
    const nameEl = element.querySelector('[class*="username"], [class*="author"]');
    if (nameEl && nameEl.textContent) {
      return nameEl.textContent.trim().replace('@', '');
    }

    element = element.parentElement;
  }
  return null;
}

export function checkIsCode(selection: Selection): boolean {
  if (!selection.anchorNode) return false;
  let element: HTMLElement | null = selection.anchorNode.nodeType === Node.ELEMENT_NODE
    ? (selection.anchorNode as HTMLElement)
    : selection.anchorNode.parentElement;

  while (element && element !== document.body) {
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'pre' || tagName === 'code') {
      return true;
    }
    if (element.classList.contains('hljs') || element.classList.contains('code-area')) {
      return true;
    }
    element = element.parentElement;
  }

  // Fallback: text analysis for code signatures
  const selectedText = selection.toString().trim();
  const codeKeywords = ['function', 'const', 'let', 'var', 'def ', 'class ', 'import ', 'public ', 'void ', 'return;'];
  const matchedKeywords = codeKeywords.filter(keyword => selectedText.includes(keyword));
  return matchedKeywords.length >= 2;
}

/**
 * Common event listener for processing GET_SELECTION events sent by the context menu router.
 */
export function setupClippingListener(): void {
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'GET_SELECTION') {
      const selection = window.getSelection();
      if (!selection) return;

      const selectedText = selection.toString().trim();
      if (!selectedText) {
        console.warn('LeetNote: Cannot clip empty selection.');
        return;
      }

      const isCode = checkIsCode(selection);
      const authorHandle = findAuthorHandle(selection.anchorNode);

      // Send CLIP_ADD command to background script
      browser.runtime.sendMessage({
        type: 'CLIP_ADD',
        requestId: crypto.randomUUID(),
        payload: {
          text: selectedText,
          isCode,
          sourceUrl: window.location.href,
          authorHandle
        }
      }).then((response) => {
        if (response && response.success) {
          console.log('LeetNote: Selection successfully clipped to session queue.');
        } else {
          console.error('LeetNote: Failed to save clip to session queue:', response?.error?.message);
        }
      }).catch((err) => {
        console.error('LeetNote: Error forwarding clip to background service:', err);
      });
    }
  });
}
