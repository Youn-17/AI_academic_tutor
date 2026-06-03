/**
 * Supabase Edge Function for Semantic Scholar Recommendations
 * Gets similar/recommended papers based on a given paper
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

interface RecommendationsRequest {
    paperId: string;
    limit?: number;
    fields?: string[];
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
        const { paperId, limit = 10, fields } = await req.json() as RecommendationsRequest;

        if (!paperId) {
            return new Response(JSON.stringify({ success: false, error: 'paperId parameter is required' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Build request URL for recommendations
        const searchParams = new URLSearchParams({
            limit: limit.toString(),
            fields: fields?.join(',') || 'paperId,title,abstract,authors,year,venue,citationCount,url,score'
        });

        const recUrl = `https://api.semanticscholar.org/recommendations/v1/papers/${paperId}?${searchParams.toString()}`;

        console.log('Fetching recommendations for:', paperId);

        let response: Response;
        try {
            response = await fetchWithTimeout(recUrl, {
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

        // Extract recommended papers from response
        const recommended = data.recommended || [];

        return new Response(JSON.stringify({
            success: true,
            data: recommended,
            count: recommended.length
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Semantic Scholar Recommendations Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: '查询失败，请稍后重试'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
