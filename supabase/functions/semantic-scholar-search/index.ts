/**
 * Supabase Edge Function for Semantic Scholar Paper Search
 * Searches academic papers by keyword/query
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SEMANTIC_SCHOLAR_API = "https://api.semanticscholar.org/graph/v1/paper/search";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
    query: string;
    fields?: string[];
    limit?: number;
    offset?: number;
    year?: string;
    venue?: string;
    publicationTypes?: string;
    openAccessPdf?: boolean;
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Verify authentication
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('Missing authorization header');
        }

        const { query, fields, limit = 10, offset = 0, year, venue, publicationTypes, openAccessPdf } = await req.json() as SearchRequest;

        if (!query || query.trim().length === 0) {
            throw new Error('Query parameter is required');
        }

        // Build search URL with parameters
        const searchParams = new URLSearchParams({
            query: query.trim(),
            limit: limit.toString(),
            offset: offset.toString(),
            fields: fields?.join(',') || 'paperId,title,abstract,authors,year,venue,citationCount,openAccessPdf,url,publicationTypes,journal'
        });

        // Add optional filters
        if (year) searchParams.append('year', year);
        if (venue) searchParams.append('venue', venue);
        if (publicationTypes) searchParams.append('publicationTypes', publicationTypes);
        if (openAccessPdf !== undefined) searchParams.append('openAccessPdf', openAccessPdf.toString());

        const searchUrl = `${SEMANTIC_SCHOLAR_API}?${searchParams.toString()}`;

        console.log('Searching Semantic Scholar:', searchUrl);

        const response = await fetch(searchUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Semantic Scholar API Error: ${response.status} - ${error}`);
        }

        const data = await response.json();

        // Log the search for analytics (can be stored to DB later)
        console.log('Search completed:', {
            query: query.trim(),
            resultCount: data.total || 0,
            returned: data.data?.length || 0
        });

        return new Response(JSON.stringify({
            success: true,
            data: data.data || [],
            total: data.total || 0,
            offset: data.offset || 0,
            next: data.next
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Semantic Scholar Search Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Search failed'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
