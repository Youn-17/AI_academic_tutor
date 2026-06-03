/**
 * Supabase Edge Function for Semantic Scholar Paper Search
 * Searches academic papers by keyword/query
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SEMANTIC_SCHOLAR_API = "https://api.semanticscholar.org/graph/v1/paper/search";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Fetch with timeout (abort hung provider)
async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    try {
        return await fetch(url, { ...init, signal: c.signal });
    } finally {
        clearTimeout(t);
    }
}

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
        return new Response('ok', { status: 200, headers: corsHeaders });
    }

    // Verify authentication (JWT)
    const authHeader = req.headers.get('Authorization');
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader ?? '' } } }
    );
    const { data: { user }, error: authErr } = await supabaseClient.auth.getUser();
    if (authErr || !user) {
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    try {
        const { query, fields, limit = 10, offset = 0, year, venue, publicationTypes, openAccessPdf } = await req.json() as SearchRequest;

        if (!query || query.trim().length === 0) {
            return new Response(JSON.stringify({ success: false, error: 'Query parameter is required' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
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

        let response: Response;
        try {
            response = await fetchWithTimeout(searchUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            }, 30_000);
        } catch (fetchErr) {
            console.error('Semantic Scholar fetch failed:', fetchErr);
            return new Response(JSON.stringify({ success: false, error: '查询失败，请稍后重试' }), {
                status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (!response.ok) {
            const error = await response.text();
            console.error(`Semantic Scholar API Error: ${response.status} - ${error}`);
            return new Response(JSON.stringify({ success: false, error: '查询失败，请稍后重试' }), {
                status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
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
            error: '查询失败，请稍后重试'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
