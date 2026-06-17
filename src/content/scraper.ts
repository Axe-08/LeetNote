// DOM Scraper for LeetCode problem pages
import { ScrapeResult, ScrapeWarning, ProblemMetadata } from '../shared/types';
import selectors from '../shared/selectors.json';

/**
 * Main scraper function. Combines selector fallbacks for metadata extraction
 * and multiple retrieval strategies for the solution code.
 */
export async function scrape(): Promise<ScrapeResult> {
  const warnings: ScrapeWarning[] = [];
  const scrapedAt = Date.now();

  let title: string | null = null;
  let number: number | null = null;
  let difficulty: 'Easy' | 'Medium' | 'Hard' | null = null;
  const tags: string[] = [];
  let acceptanceRate: number | null = null;
  let language = 'python3'; // Default fallback

  // 1. Scrape Title
  try {
    for (const selector of selectors.title) {
      const el = document.querySelector(selector);
      if (el && el.textContent) {
        const text = el.textContent.trim();
        // LeetCode title can be "1. Two Sum" or "Two Sum"
        const match = text.match(/^(\d+)\.\s*(.+)$/);
        if (match) {
          number = parseInt(match[1], 10);
          title = match[2].trim();
        } else {
          title = text;
        }
        break;
      }
    }
    if (!title) {
      warnings.push({
        field: 'title',
        message: 'Could not extract problem title using configured selectors.',
        severity: 'high'
      });
    }
  } catch (err) {
    warnings.push({
      field: 'title',
      message: `Error scraping title: ${err instanceof Error ? err.message : String(err)}`,
      severity: 'high'
    });
  }

  // 2. Scrape Number (Fallback if not parsed from title)
  try {
    if (!number) {
      // Try parsing from URL slug first: /problems/two-sum/
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      const problemsIdx = pathParts.indexOf('problems');
      if (problemsIdx !== -1 && pathParts[problemsIdx + 1]) {
        // We have the slug. We check if there's a selector for number
        for (const selector of selectors.number) {
          const el = document.querySelector(selector);
          if (el && el.textContent) {
            const numText = el.textContent.trim().replace('.', '');
            const parsed = parseInt(numText, 10);
            if (!isNaN(parsed)) {
              number = parsed;
              break;
            }
          }
        }
      }
    }
  } catch (err) {
    warnings.push({
      field: 'number',
      message: `Error scraping number: ${err instanceof Error ? err.message : String(err)}`,
      severity: 'medium'
    });
  }

  // 3. Scrape Difficulty
  try {
    for (const selector of selectors.difficulty) {
      const el = document.querySelector(selector);
      if (el) {
        const text = el.textContent?.trim().toLowerCase() || '';
        const attrVal = el.getAttribute('diff')?.toLowerCase() || '';

        if (text.includes('easy') || attrVal.includes('easy')) {
          difficulty = 'Easy';
          break;
        } else if (text.includes('medium') || attrVal.includes('medium')) {
          difficulty = 'Medium';
          break;
        } else if (text.includes('hard') || attrVal.includes('hard')) {
          difficulty = 'Hard';
          break;
        }
      }
    }
    if (!difficulty) {
      warnings.push({
        field: 'difficulty',
        message: 'Could not resolve problem difficulty.',
        severity: 'medium'
      });
    }
  } catch (err) {
    warnings.push({
      field: 'difficulty',
      message: `Error scraping difficulty: ${err instanceof Error ? err.message : String(err)}`,
      severity: 'medium'
    });
  }

  // 4. Scrape Tags
  try {
    for (const selector of selectors.tags) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        elements.forEach((el) => {
          const tagText = el.textContent?.trim();
          if (tagText && !tags.includes(tagText)) {
            tags.push(tagText);
          }
        });
        break;
      }
    }
  } catch (err) {
    warnings.push({
      field: 'tags',
      message: `Error scraping tags: ${err instanceof Error ? err.message : String(err)}`,
      severity: 'low'
    });
  }

  // 5. Scrape Acceptance Rate
  try {
    for (const selector of selectors.acceptanceRate) {
      const el = document.querySelector(selector);
      if (el && el.textContent) {
        const text = el.textContent.trim();
        // Parse float from text containing % e.g. "Acceptance Rate 53.2%"
        const match = text.match(/([\d.]+)\s*%/);
        if (match) {
          acceptanceRate = parseFloat(match[1]);
          break;
        }
      }
    }
  } catch (err) {
    warnings.push({
      field: 'acceptanceRate',
      message: `Error scraping acceptance rate: ${err instanceof Error ? err.message : String(err)}`,
      severity: 'low'
    });
  }

  // 6. Scrape Active Language
  try {
    for (const selector of selectors.language) {
      const el = document.querySelector(selector);
      if (el && el.textContent) {
        language = el.textContent.trim().toLowerCase();
        break;
      }
    }
  } catch (err) {
    warnings.push({
      field: 'language',
      message: `Error scraping active language: ${err instanceof Error ? err.message : String(err)}`,
      severity: 'low'
    });
  }

  // 7. Scrape Code
  let code = '';
  try {
    // Attempt 1: DOM Textarea fallback (monaco hides text inside textarea.inputarea)
    const textarea = document.querySelector('textarea.inputarea') as HTMLTextAreaElement;
    if (textarea && textarea.value) {
      code = textarea.value;
    }

    // Attempt 2: If textarea empty, try scraping the divs representing lines of code
    if (!code) {
      const lines = document.querySelectorAll('.view-lines .view-line');
      if (lines.length > 0) {
        const codeLines: string[] = [];
        lines.forEach((line) => {
          codeLines.push(line.textContent || '');
        });
        code = codeLines.join('\n');
      }
    }

    // Attempt 3: CodeMirror editor fallback
    if (!code) {
      const codeMirrorEl = document.querySelector('.CodeMirror-code');
      if (codeMirrorEl) {
        const codeLines: string[] = [];
        codeMirrorEl.querySelectorAll('.CodeMirror-line').forEach((line) => {
          codeLines.push(line.textContent || '');
        });
        code = codeLines.join('\n');
      }
    }

    if (!code) {
      warnings.push({
        field: 'code',
        message: 'Failed to extract solution code from editor.',
        severity: 'medium'
      });
    }
  } catch (err) {
    warnings.push({
      field: 'code',
      message: `Error extracting code: ${err instanceof Error ? err.message : String(err)}`,
      severity: 'medium'
    });
  }

  // Construct metadata object
  let metadata: ProblemMetadata | null = null;
  if (title && number) {
    metadata = {
      title,
      number,
      difficulty: difficulty || 'Medium', // Fallback to Medium if null
      tags,
      url: window.location.href,
      acceptanceRate
    };
  }

  return {
    metadata,
    code,
    language,
    warnings,
    scrapedAt
  };
}
