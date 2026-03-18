/**
 * Supabase Edge Function for Semantic Scholar Paper Details
 * Fetches detailed information about a specific paper
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetailsRequest {
    paperId: string;
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

        const { paperId, fields } = await req.json() as DetailsRequest;

        if (!paperId) {
            throw new Error('paperId parameter is required');
        }

        // Default fields to fetch - comprehensive for academic use
        const defaultFields = [
            'paperId',
            'title',
            'abstract',
            'authors',
            'year',
            'venue',
            'citationCount',
            'influentialCitationCount',
            'openAccessPdf',
            'url',
            'publicationTypes',
            'journal',
            'doi',
            'externalIds',
            'fieldsOfStudy',
            's2FieldsOfStudy',
            'referenceCount',
            'corpusId'
        ];

        const searchParams = new URLSearchParams({
            fields: fields?.join(',') || defaultFields.join(',')
        });

        const detailsUrl = `https://api.semanticscholar.org/graph/v1/paper/${paperId}?${searchParams.toString()}`;

        console.log('Fetching paper details:', paperId);

        const response = await fetch(detailsUrl, {
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

        // Format response with additional metadata
        return new Response(JSON.stringify({
            success: true,
            data: {
                ...data,
                fetchedAt: new Date().toISOString()
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Semantic Scholar Details Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Failed to fetch paper details'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
