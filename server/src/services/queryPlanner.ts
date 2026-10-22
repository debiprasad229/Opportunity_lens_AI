import { logger } from '../utils/logger.js';

export interface PlannedQuery {
  originalQuery: string;
  intent: {
    roleType: string;
    targetAudience: string;
    location?: string;
    year?: string;
    specificTech?: string[];
  };
  searchVariants: string[];
}

export class QueryPlanner {
  /**
   * Analyzes the user's natural language request and generates
   * multiple search variants optimized for finding authentic internship postings.
   */
  public plan(rawQuery: string, locationFilter?: string): PlannedQuery {
    const trimmed = rawQuery.trim();
    logger.info(`Planning retrieval strategy for query: "${trimmed}"`);

    // Extract year signals (e.g. 2025, 2026)
    const yearMatch = trimmed.match(/\b(202[4-7])\b/);
    const year = yearMatch ? yearMatch[1] : '2025 OR 2026';

    // Extract tech keywords
    const commonTech = [
      'react', 'node', 'python', 'java', 'c++', 'golang', 'rust',
      'typescript', 'javascript', 'ai', 'ml', 'machine learning', 'frontend', 'backend', 'fullstack'
    ];
    const lower = trimmed.toLowerCase();
    const matchedTech = commonTech.filter(tech => {
      const regex = new RegExp(`\\b${tech.replace('+', '\\+')}\\b`, 'i');
      return regex.test(lower);
    });

    // Detect location
    let location = locationFilter;
    if (!location) {
      const locationMatches = trimmed.match(/\b(in|at|for)\s+([A-Z][a-zA-Z\s]+)/);
      if (locationMatches && locationMatches[2]) {
        location = locationMatches[2].trim();
      }
    }

    // Determine target audience
    const isFreshGrad = /\b(fresh|graduate|grad|fresher|entry-level|university|college|student|batch)\b/i.test(trimmed);
    const audienceTag = isFreshGrad ? 'fresh graduate OR fresher OR college' : 'intern';

    // Build specific search query variants
    const searchVariants: string[] = [];

    // 1. Direct role + intern + fresh grad + stipend keywords
    const techPrefix = matchedTech.length > 0 ? `${matchedTech.slice(0, 2).join(' ')} ` : '';
    const locSuffix = location ? ` ${location}` : '';

    searchVariants.push(
      `${techPrefix}software engineer intern fresh graduate stipend${locSuffix} ${year}`.trim()
    );

    // 2. Official ATS and career portal targets
    searchVariants.push(
      `(site:lever.co OR site:greenhouse.io OR site:myworkdayjobs.com) ${techPrefix}intern ${year}${locSuffix}`.trim()
    );

    // 3. User query combined with explicit internship criteria
    searchVariants.push(
      `${trimmed} internship stipend deadline`.trim()
    );

    // 4. SDE Intern roles on official career portals
    searchVariants.push(
      `${techPrefix}software engineer intern careers apply ${year}${locSuffix}`.trim()
    );

    // Deduplicate and filter empty
    const uniqueVariants = Array.from(new Set(searchVariants.filter(Boolean))).slice(0, 4);

    return {
      originalQuery: trimmed,
      intent: {
        roleType: matchedTech.length > 0 ? `${matchedTech.join(', ')} Developer` : 'Software Developer',
        targetAudience: audienceTag,
        location: location || undefined,
        year: year || undefined,
        specificTech: matchedTech.length > 0 ? matchedTech : undefined,
      },
      searchVariants: uniqueVariants,
    };
  }
}

export const queryPlanner = new QueryPlanner();
