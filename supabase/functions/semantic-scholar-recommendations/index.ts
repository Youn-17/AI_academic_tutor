/**
 * Supabase Edge Function for Semantic Scholar Recommendations
 * Gets similar/recommended papers based on a given paper
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecommendationsRequest {
    paperId: string;
    limit?: number;
    fields?: string[];
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

        const { paperId, limit = 10, fields } = await req.json() as RecommendationsRequest;

        if (!paperId) {
            throw new Error('paperId parameter is required');
        }

        // Build request URL for recommendations
        const searchParams = new URLSearchParams({
            limit: limit.toString(),
            fields: fields?.join(',') || 'paperId,title,abstract,authors,year,venue,citationCount,url,score'
        });

        const recUrl = `https://api.semanticscholar.org/recommendations/v1/papers/${paperId}?${searchParams.toString()}`;

        console.log('Fetching recommendations for:', paperId);

        const response = await fetch(recUrl, {
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
            error: error.message || 'Failed to fetch recommendations'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
