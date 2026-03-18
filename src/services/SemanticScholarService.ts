/**
 * Semantic Scholar Service
 * Handles academic paper search and retrieval via Edge Functions
 */

import { supabase } from '@/lib/supabase';

const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL ||
    'https://oztozjwngekmqtuylypt.supabase.co/functions/v1';

// Get auth headers for Edge Function calls
async function getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
        throw new Error('Not authenticated');
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
    };
}

// Paper search result types
export interface Author {
    authorId?: string;
    name: string;
}

export interface PaperBasic {
    paperId: string;
    title: string;
    abstract?: string;
    authors: Author[];
    year?: number;
    venue?: string;
    citationCount?: number;
    influentialCitationCount?: number;
    openAccessPdf?: {
        url: string;
    };
    url: string;
    publicationTypes?: string[];
    journal?: {
        name: string;
        pages?: string;
        volume?: string;
    };
    doi?: string;
    externalIds?: {
        DOI?: string;
        PubMed?: string;
        arXiv?: string;
    };
    score?: number; // For recommendations
}

export interface SearchResult {
    data: PaperBasic[];
    total: number;
    offset: number;
    next?: string;
}

export interface DetailsResult {
    data: PaperBasic & {
        referenceCount?: number;
        corpusId?: number;
        fieldsOfStudy?: string[];
        s2FieldsOfStudy?: Array<{ category: string; source: string }>;
    };
}

/**
 * Search academic papers by keyword
 */
export async function searchPapers(params: {
    query: string;
    limit?: number;
    offset?: number;
    year?: string;
    venue?: string;
    publicationTypes?: string;
    openAccessPdf?: boolean;
}): Promise<SearchResult> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${EDGE_FUNCTION_URL}/semantic-scholar-search`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Search failed');
    }

    const result = await response.json();
    return {
        data: result.data || [],
        total: result.total || 0,
        offset: result.offset || 0,
        next: result.next,
    };
}

/**
 * Get detailed information about a specific paper
 */
export async function getPaperDetails(paperId: string): Promise<DetailsResult> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${EDGE_FUNCTION_URL}/semantic-scholar-details`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ paperId }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch paper details');
    }

    return await response.json();
}

/**
 * Get recommended papers similar to a given paper
 */
export async function getRecommendations(paperId: string, limit = 10): Promise<{ data: PaperBasic[]; count: number }> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${EDGE_FUNCTION_URL}/semantic-scholar-recommendations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ paperId, limit }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch recommendations');
    }

    const result = await response.json();
    return {
        data: result.data || [],
        count: result.count || 0,
    };
}

/**
 * Format citation for academic use
 */
export function formatCitation(paper: PaperBasic, style: 'apa' | 'mla' | 'chicago' = 'apa'): string {
    const authors = paper.authors?.slice(0, 3).map(a => a.name) || [];
    const authorStr = authors.length > 0
        ? authors.join(', ')
        : 'Unknown Author';

    const year = paper.year || 'n.d.';
    const title = paper.title || '';
    const venue = paper.venue || paper.journal?.name || '';
    const doi = paper.doi || paper.externalIds?.DOI;

    switch (style) {
        case 'apa':
            if (doi) {
                return `${authorStr} (${year}). ${title}. ${venue}. https://doi.org/${doi}`;
            }
            return `${authorStr} (${year}). ${title}. ${venue}.`;

        case 'mla':
            return `${authorStr}. "${title}." ${venue}, ${year}.`;

        case 'chicago':
            return `${authorStr}. "${title}." ${venue} (${year}).`;

        default:
            return `${authorStr} (${year}). ${title}. ${venue}.`;
    }
}

/**
 * Get paper URL (prefer Semantic Scholar, fallback to DOI)
 */
export function getPaperUrl(paper: PaperBasic): string {
    return paper.url || (paper.doi ? `https://doi.org/${paper.doi}` : '');
}
