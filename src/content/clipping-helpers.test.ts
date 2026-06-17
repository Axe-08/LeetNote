import { describe, it, expect, vi } from 'vitest';

// Mock webextension-polyfill first
vi.mock('webextension-polyfill', () => {
  return {
    default: {
      runtime: {
        sendMessage: vi.fn(),
        onMessage: {
          addListener: vi.fn(),
        },
      },
    },
  };
});

import { findAuthorHandle, checkIsCode } from './clipping-helpers';

// Ensure global Node constants and document exist for test environment
if (typeof (globalThis as any).Node === 'undefined') {
  (globalThis as any).Node = {
    ELEMENT_NODE: 1,
    TEXT_NODE: 3,
  };
}

if (typeof (globalThis as any).document === 'undefined') {
  const bodyMock = {
    nodeType: 1,
    tagName: 'BODY',
    parentElement: null,
  };
  (globalThis as any).document = {
    body: bodyMock,
  } as any;
}

describe('Clipping Helpers (Mocked DOM)', () => {
  describe('findAuthorHandle', () => {
    it('should return null if node is null', () => {
      expect(findAuthorHandle(null)).toBeNull();
    });

    it('should extract handle from a link element containing /u/username', () => {
      // Mock user link
      const mockLink = {
        nodeType: 1,
        getAttribute: (attr: string) => {
          if (attr === 'href') return '/u/test_user_123/';
          return null;
        },
      };

      // Mock parent
      const mockParent = {
        nodeType: 1,
        querySelectorAll: (selector: string) => {
          if (selector === 'a[href*="/u/"]') {
            return [mockLink];
          }
          return [];
        },
        parentElement: document.body,
      };

      // Target node points to parent
      const mockNode = {
        nodeType: 1,
        parentElement: mockParent,
        querySelectorAll: () => [],
        querySelector: () => null,
      } as any;

      const handle = findAuthorHandle(mockNode);
      expect(handle).toBe('test_user_123');
    });

    it('should extract handle using username class name fallback', () => {
      const mockUsernameEl = {
        nodeType: 1,
        textContent: '@dev_master',
      };

      const mockParent = {
        nodeType: 1,
        querySelectorAll: () => [],
        querySelector: (selector: string) => {
          if (selector === '[class*="username"], [class*="author"]') {
            return mockUsernameEl;
          }
          return null;
        },
        parentElement: document.body,
      };

      const mockTextNode = {
        nodeType: 3, // Node.TEXT_NODE
        parentElement: mockParent,
      } as any;

      const handle = findAuthorHandle(mockTextNode);
      expect(handle).toBe('dev_master');
    });
  });

  describe('checkIsCode', () => {
    it('should return true if selection is inside a pre tag', () => {
      const mockPre = {
        nodeType: 1,
        tagName: 'PRE',
        classList: {
          contains: () => false,
        },
        parentElement: document.body,
      };

      const mockTextNode = {
        nodeType: 3,
        parentElement: mockPre,
      };

      const mockSelection = {
        anchorNode: mockTextNode,
        toString: () => 'const x = 123;',
      } as unknown as Selection;

      expect(checkIsCode(mockSelection)).toBe(true);
    });

    it('should detect code based on text signature fallback keywords', () => {
      const mockSelection = {
        anchorNode: {
          nodeType: 3,
          parentElement: {
            nodeType: 1,
            tagName: 'DIV',
            classList: { contains: () => false },
            parentElement: document.body,
          },
        },
        toString: () => `
          function solve(nums) {
            let res = [];
            return res;
          }
        `,
      } as unknown as Selection;

      expect(checkIsCode(mockSelection)).toBe(true);
    });

    it('should return false for plain text selections without keywords', () => {
      const mockSelection = {
        anchorNode: {
          nodeType: 3,
          parentElement: {
            nodeType: 1,
            tagName: 'DIV',
            classList: { contains: () => false },
            parentElement: document.body,
          },
        },
        toString: () => 'This is a brief text snippet from a post explaining the solution',
      } as unknown as Selection;

      expect(checkIsCode(mockSelection)).toBe(false);
    });
  });
});
