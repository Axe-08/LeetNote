// Notion REST API client wrapper for LeetNote
import {
  NOTION_API_BASE,
  NOTION_API_VERSION,
  NOTION_RATE_LIMIT_DELAY_MS,
  LANGUAGE_MAP
} from '../shared/constants';
import {
  SaveProblemPayload,
  CommunityClip,
  AppError
} from '../shared/types';

export class NotionClient {
  private token: string;
  private databaseId: string;
  private lastRequestTime = 0;

  constructor(token: string, databaseId: string) {
    this.token = token;
    this.databaseId = databaseId;
  }

  // Sleep utility for rate limiting
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < NOTION_RATE_LIMIT_DELAY_MS) {
      const waitTime = NOTION_RATE_LIMIT_DELAY_MS - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();
  }

  // Base API caller
  private async apiCall(method: string, path: string, body?: object): Promise<any> {
    await this.enforceRateLimit();

    const url = `${NOTION_API_BASE}${path}`;
    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Notion-Version': NOTION_API_VERSION,
      'Content-Type': 'application/json'
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        const status = response.status;
        let responseText = '';
        try {
          responseText = await response.text();
        } catch {
          // ignore
        }

        if (status === 401) {
          throw new AppError('LN_100', 'Notion authorization expired or invalid.');
        } else if (status === 429) {
          throw new AppError('LN_300', 'Notion API rate limit exceeded.');
        } else if (status === 404) {
          throw new AppError('LN_200', 'Notion database not found.');
        } else if (status === 400) {
          throw new AppError('LN_201', `Notion database schema mismatch or invalid request: ${responseText}`);
        } else if (status >= 500) {
          throw new AppError('LN_202', 'Notion server error.');
        } else {
          throw new AppError('LN_202', `Notion API returned HTTP ${status}: ${responseText}`);
        }
      }

      return await response.json();
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError('LN_400', `Network failure reaching Notion API: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Queries the database for a problem matching the given problem number.
   */
  public async findProblem(problemNumber: number): Promise<{
    pageId: string;
    attemptCount: number;
    lastAttempted: string | null;
    confidenceHistory: Array<{ attemptNumber: number; rating: number | null; date: string }>;
  } | null> {
    const response = await this.apiCall('POST', `/databases/${this.databaseId}/query`, {
      filter: {
        property: 'Problem Number',
        number: {
          equals: problemNumber
        }
      },
      page_size: 1
    });

    if (!response.results || response.results.length === 0) {
      return null;
    }

    const page = response.results[0];
    const props = page.properties;

    const attemptCount = props['Attempts']?.number || 0;
    const lastAttempted = props['Last Attempted']?.date?.start || null;

    // Parse confidence history if stored in log or properties.
    // For now we initialize confidenceHistory with basic metadata
    const confidenceHistory: Array<{ attemptNumber: number; rating: number | null; date: string }> = [];
    if (attemptCount > 0 && lastAttempted) {
      const confidence = props['Confidence']?.select?.name 
        ? parseInt(props['Confidence']?.select?.name, 10) 
        : null;
      confidenceHistory.push({
        attemptNumber: attemptCount,
        rating: isNaN(Number(confidence)) ? null : confidence,
        date: lastAttempted
      });
    }

    return {
      pageId: page.id,
      attemptCount,
      lastAttempted,
      confidenceHistory
    };
  }

  /**
   * Creates a new page in the database.
   */
  public async createProblemPage(payload: SaveProblemPayload): Promise<string> {
    const today = new Date().toISOString().split('T')[0];
    const reviewDate = this.calculateNextReviewDate(payload.confidenceRating, 1);

    const properties: Record<string, any> = {
      'Name': {
        title: [{ text: { content: payload.metadata.title } }]
      },
      'Problem Number': {
        number: payload.metadata.number
      },
      'Difficulty': {
        select: { name: payload.metadata.difficulty }
      },
      'Tags': {
        multi_select: payload.metadata.tags.map(t => ({ name: t }))
      },
      'URL': {
        url: payload.metadata.url
      },
      'Date Saved': {
        date: { start: today }
      },
      'Last Attempted': {
        date: { start: today }
      },
      'Attempts': {
        number: 1
      },
      'Status': {
        select: { name: payload.confidenceRating && payload.confidenceRating >= 3 ? 'Solved' : 'Attempted' }
      }
    };

    if (payload.confidenceRating !== null) {
      properties['Confidence'] = {
        select: { name: String(payload.confidenceRating) }
      };
    }
    if (reviewDate) {
      properties['Next Review'] = {
        date: { start: reviewDate }
      };
    }

    const children = this.buildPageBody(payload, 1);

    const response = await this.apiCall('POST', '/pages', {
      parent: { database_id: this.databaseId },
      icon: { type: 'emoji', emoji: '🧩' },
      properties,
      children
    });

    return response.id;
  }

  /**
   * Appends an attempt block structure to an existing page.
   */
  public async appendAttempt(pageId: string, payload: SaveProblemPayload, attemptNumber: number): Promise<void> {
    const children = this.buildAttemptBlocks(payload, attemptNumber);
    await this.apiCall('PATCH', `/blocks/${pageId}/children`, { children });
  }

  /**
   * Updates properties of an existing page.
   */
  public async updatePageProperties(pageId: string, updates: Record<string, any>): Promise<void> {
    await this.apiCall('PATCH', `/pages/${pageId}`, { properties: updates });
  }

  /**
   * High-level upsert manager. Check if exists:
   * - If no: create problem page.
   * - If yes: append attempt & update page props.
   */
  public async upsertProblem(payload: SaveProblemPayload): Promise<{ attemptNumber: number; pageId: string }> {
    const existing = await this.findProblem(payload.metadata.number);

    if (!existing) {
      const pageId = await this.createProblemPage(payload);
      return { attemptNumber: 1, pageId };
    } else {
      const nextAttempt = existing.attemptCount + 1;
      const today = new Date().toISOString().split('T')[0];
      const nextReview = this.calculateNextReviewDate(payload.confidenceRating, nextAttempt);

      // 1. Append attempt blocks
      await this.appendAttempt(existing.pageId, payload, nextAttempt);

      // 2. Update page metadata props
      const statusValue = payload.confidenceRating && payload.confidenceRating >= 4 
        ? 'Mastered' 
        : payload.confidenceRating && payload.confidenceRating >= 3 
          ? 'Solved' 
          : 'Attempted';

      const updates: Record<string, any> = {
        'Last Attempted': { date: { start: today } },
        'Attempts': { number: nextAttempt },
        'Status': { select: { name: statusValue } }
      };

      if (payload.confidenceRating !== null) {
        updates['Confidence'] = { select: { name: String(payload.confidenceRating) } };
      }
      if (nextReview) {
        updates['Next Review'] = { date: { start: nextReview } };
      }

      await this.updatePageProperties(existing.pageId, updates);

      return { attemptNumber: nextAttempt, pageId: existing.pageId };
    }
  }

  /**
   * Searches for pages shared with the integration to use as parent page
   */
  public async listEligiblePages(): Promise<Array<{ id: string; title: string }>> {
    const response = await this.apiCall('POST', '/search', {
      filter: {
        value: 'page',
        property: 'object'
      },
      page_size: 10
    });
    
    return (response.results || []).map((page: any) => {
      const titleProp = page.properties && Object.values(page.properties).find((p: any) => p.type === 'title') as any;
      const title = titleProp?.title?.[0]?.plain_text || 'Untitled Page';
      return { id: page.id, title };
    });
  }

  /**
   * Lists all databases shared with the integration
   */
  public async listDatabases(): Promise<Array<{ id: string; title: string; properties: any }>> {
    const response = await this.apiCall('POST', '/search', {
      filter: {
        value: 'database',
        property: 'object'
      },
      page_size: 20
    });
    
    return (response.results || []).map((db: any) => {
      const title = db.title?.[0]?.plain_text || 'Untitled Database';
      return { id: db.id, title, properties: db.properties };
    });
  }

  /**
   * Validates and updates database schema if properties are missing
   */
  public async validateAndFixDatabaseSchema(dbId: string): Promise<{ success: boolean; fixed: boolean; missing: string[] }> {
    const db = await this.apiCall('GET', `/databases/${dbId}`);
    const props = db.properties || {};
    
    const requiredProps = {
      'Name': { title: {} },
      'Problem Number': { number: { format: 'number' } },
      'Difficulty': {
        select: {
          options: [
            { name: 'Easy', color: 'green' },
            { name: 'Medium', color: 'yellow' },
            { name: 'Hard', color: 'red' }
          ]
        }
      },
      'Tags': { multi_select: {} },
      'URL': { url: {} },
      'Date Saved': { date: {} },
      'Last Attempted': { date: {} },
      'Confidence': {
        select: {
          options: [
            { name: '1', color: 'red' },
            { name: '2', color: 'orange' },
            { name: '3', color: 'yellow' },
            { name: '4', color: 'blue' },
            { name: '5', color: 'green' }
          ]
        }
      },
      'Next Review': { date: {} },
      'Attempts': { number: { format: 'number' } },
      'Status': {
        select: {
          options: [
            { name: 'Not Started', color: 'gray' },
            { name: 'Attempted', color: 'yellow' },
            { name: 'Solved', color: 'blue' },
            { name: 'Mastered', color: 'green' }
          ]
        }
      }
    };
    
    const missing: string[] = [];
    const updates: Record<string, any> = {};
    
    for (const [name, def] of Object.entries(requiredProps)) {
      if (!props[name]) {
        missing.push(name);
        updates[name] = def;
      }
    }
    
    if (missing.length === 0) {
      return { success: true, fixed: false, missing: [] };
    }
    
    // Perform PATCH to add missing fields
    await this.apiCall('PATCH', `/databases/${dbId}`, { properties: updates });
    return { success: true, fixed: true, missing };
  }

  /**
   * Auto-creates a new Notion database in user workspace
   */
  public async createDatabase(parentPageId: string): Promise<string> {
    const response = await this.apiCall('POST', '/databases', {
      parent: { type: 'page_id', page_id: parentPageId },
      title: [{ type: 'text', text: { content: 'LeetNotion — DSA Journal' } }],
      icon: { type: 'emoji', emoji: '🧩' },
      properties: {
        'Name': { title: {} },
        'Problem Number': { number: { format: 'number' } },
        'Difficulty': {
          select: {
            options: [
              { name: 'Easy', color: 'green' },
              { name: 'Medium', color: 'yellow' },
              { name: 'Hard', color: 'red' }
            ]
          }
        },
        'Tags': { multi_select: {} },
        'URL': { url: {} },
        'Date Saved': { date: {} },
        'Last Attempted': { date: {} },
        'Confidence': {
          select: {
            options: [
              { name: '1', color: 'red' },
              { name: '2', color: 'orange' },
              { name: '3', color: 'yellow' },
              { name: '4', color: 'blue' },
              { name: '5', color: 'green' }
            ]
          }
        },
        'Next Review': { date: {} },
        'Attempts': { number: { format: 'number' } },
        'Status': {
          select: {
            options: [
              { name: 'Not Started', color: 'gray' },
              { name: 'Attempted', color: 'yellow' },
              { name: 'Solved', color: 'blue' },
              { name: 'Mastered', color: 'green' }
            ]
          }
        }
      }
    });

    return response.id;
  }

  // Private helpers for constructing blocks
  private calculateNextReviewDate(rating: number | null, attemptNumber: number): string | null {
    if (rating === null) return null;
    let days = 1;
    if (rating === 1) days = 1;
    else if (rating === 2) days = 3;
    else if (rating === 3) days = 7;
    else {
      // SM-2 algorithm simplified
      if (attemptNumber === 1) {
        days = rating * 3;
      } else {
        const easeFactor = 1.3 + (rating * 0.25);
        days = Math.round(7 * easeFactor);
      }
    }

    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  private buildPageBody(payload: SaveProblemPayload, attemptNumber: number): any[] {
    const blocks: any[] = [];

    // 1. Difficulty-colored callout header
    const diffColor = payload.metadata.difficulty === 'Easy' ? 'green' : payload.metadata.difficulty === 'Medium' ? 'yellow' : 'red';
    blocks.push({
      object: 'block',
      type: 'callout',
      callout: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: `${payload.metadata.title} (LeetCode #${payload.metadata.number}) — ${payload.metadata.difficulty}\nTags: ${payload.metadata.tags.join(', ')} | Acceptance: ${payload.metadata.acceptanceRate || 'N/A'}%`
            }
          }
        ],
        icon: { type: 'emoji', emoji: '🧩' },
        color: `${diffColor}_background`
      }
    });

    // 2. Heading: Solutions
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: '💡 Solutions' } }]
      }
    });

    // 3. Attempt Toggle structure
    blocks.push(...this.buildAttemptBlocks(payload, attemptNumber));

    // 4. Notes Section
    if (payload.notes.trim()) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: '📝 My Notes' } }]
        }
      });
      blocks.push(...this.markdownToBlocks(payload.notes));
    }

    // 5. Community Clips Section
    if (payload.clips.length > 0) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: '🌐 Community Insights' } }]
        }
      });
      for (const clip of payload.clips) {
        blocks.push(this.buildQuoteBlock(clip));
      }
    }

    return blocks;
  }

  private buildAttemptBlocks(payload: SaveProblemPayload, attemptNumber: number): any[] {
    const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const codeLang = LANGUAGE_MAP[payload.solution.language.toLowerCase()] || 'plain text';

    const childBlocks: any[] = [];

    // Code Block
    if (payload.solution.code.trim()) {
      childBlocks.push({
        object: 'block',
        type: 'code',
        code: {
          rich_text: [{ type: 'text', text: { content: payload.solution.code } }],
          language: codeLang
        }
      });
    }

    // Complexity Callouts
    childBlocks.push({
      object: 'block',
      type: 'callout',
      callout: {
        rich_text: [{ type: 'text', text: { content: `Time Complexity: ${payload.solution.timeComplexity || 'N/A'}` } }],
        icon: { type: 'emoji', emoji: '⏱️' },
        color: 'gray_background'
      }
    });
    childBlocks.push({
      object: 'block',
      type: 'callout',
      callout: {
        rich_text: [{ type: 'text', text: { content: `Space Complexity: ${payload.solution.spaceComplexity || 'N/A'}` } }],
        icon: { type: 'emoji', emoji: '💾' },
        color: 'gray_background'
      }
    });

    return [
      {
        object: 'block',
        type: 'toggle',
        toggle: {
          rich_text: [
            {
              type: 'text',
              text: { content: `Attempt ${attemptNumber} — ${today}` },
              annotations: { bold: true }
            }
          ],
          children: childBlocks
        }
      }
    ];
  }

  private buildQuoteBlock(clip: CommunityClip): any {
    const handle = clip.authorHandle ? ` — @${clip.authorHandle}` : '';
    return {
      object: 'block',
      type: 'quote',
      quote: {
        rich_text: [
          {
            type: 'text',
            text: { content: `"${clip.text}"${handle}` }
          }
        ]
      }
    };
  }

  private markdownToBlocks(markdown: string): any[] {
    const lines = markdown.split('\n');
    return lines
      .filter((line) => line.trim())
      .map((line) => {
        return {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: line } }]
          }
        };
      });
  }
}
