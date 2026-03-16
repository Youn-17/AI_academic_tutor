# AI Academic Tutor - Deployment Guide

## 1. Deploy Edge Functions

The AI chat memory and API integration logic resides in Supabase Edge Functions. You must deploy the local code to the remote project for it to work.

### Prerequisites

- Supabase CLI installed (`npm install supabase --save-dev`)
- Logged in to Supabase (`npx supabase login`)

### Deployment Command

Run the following command from the project root:

```bash
npm run deploy:functions
```

Or manually:

```bash
cd backend
npx supabase functions deploy chat --project-ref oztozjwngekmqtuylypt --no-verify-jwt
```

**Note**: The API Keys for DeepSeek and Zhipu have been hardcoded into `backend/supabase/functions/chat/index.ts` for ease of deployment. In a production environment, you should use `supabase secrets set`.

## 2. Check Database Migrations

Ensure your database has the necessary tables (`conversations`, `messages`) and storage buckets (`documents`).

Check `backend/supabase/migrations` for SQL scripts. You can run them in the Supabase Dashboard SQL Editor.

## 3. Verify

After deployment, refresh your browser. The "AI Service Unavailable" error should disappear, and you should be able to chat with DeepSeek and Zhipu models.
