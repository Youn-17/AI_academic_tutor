/**
 * Document Service - Handle file uploads and document parsing
 */

import { supabase } from '@/lib/supabase';

export interface UploadedDocument {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
    content?: string; // Extracted text content
}

/**
 * Upload a document to Supabase Storage
 */
export async function uploadDocument(
    file: File,
    conversationId: string
): Promise<UploadedDocument> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${user.id}/${conversationId}/${timestamp}_${sanitizedName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
        });

    if (error) throw error;

    // Get signed URL（1小时有效，避免文件公开泄露）
    const { data: urlData, error: urlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(data.path, 3600);

    if (urlError) throw urlError;

    // Extract text content for supported file types
    let content = '';
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        content = await file.text();
    } else if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
        content = await file.text();
    } else if (file.type === 'application/json' || file.name.endsWith('.json')) {
        content = await file.text();
    }
    // For PDF, DOCX, etc., content extraction would need server-side processing

    return {
        id: data.path,
        name: file.name,
        url: urlData.signedUrl,
        type: file.type,
        size: file.size,
        content,
    };
}

/**
 * Read text content from a File object
 */
export async function readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;

        if (file.type.startsWith('text/') ||
            file.name.endsWith('.txt') ||
            file.name.endsWith('.md') ||
            file.name.endsWith('.json') ||
            file.name.endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            // For binary files, return a placeholder
            resolve(`[文件: ${file.name}, 大小: ${formatFileSize(file.size)}]`);
        }
    });
}

/**
 * Format file size to human readable string
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Get supported file types for upload
 */
export const SUPPORTED_FILE_TYPES = [
    '.txt',
    '.md',
    '.json',
    '.csv',
    '.pdf',
    '.doc',
    '.docx',
];

export const SUPPORTED_MIME_TYPES = [
    'text/plain',
    'text/markdown',
    'application/json',
    'text/csv',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// ── RAG Library ───────────────────────────────────────────────────────

export interface RagDoc {
  id: string;
  title: string;
  description?: string;
  layer: 1 | 2 | 3 | 4;
  visibility: string;
  resource_type: string;
  source_type: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_error?: string;
  chunk_count: number;
  file_size?: number;
  storage_path?: string;
  mime_type?: string;
  course_id?: string;
  created_at: string;
}

const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL
  || 'https://oztozjwngekmqtuylypt.supabase.co/functions/v1';

export async function uploadToLibrary(
  file: File,
  options: {
    title?: string;
    layer?: 1 | 2 | 3 | 4;
    visibility?: string;
    course_id?: string;
    resource_type?: string;
  } = {}
): Promise<RagDoc> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  const validation = validateFile(file);
  if (!validation.valid) throw new Error(validation.error);

  // Upload file to Storage
  const ts = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const storagePath = `${user.id}/library/${ts}_${safeName}`;

  const { error: storageErr } = await supabase.storage
    .from('documents')
    .upload(storagePath, file, { cacheControl: '3600', upsert: false });
  if (storageErr) throw storageErr;

  // Determine resource type from file
  const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
  const resourceType = options.resource_type
    || (['pdf'].includes(ext) ? 'pdf'
      : ['doc', 'docx'].includes(ext) ? 'docx'
      : 'txt');

  // Insert document record
  const { data: doc, error: insertErr } = await supabase
    .from('documents')
    .insert({
      owner_id: user.id,
      title: options.title || file.name.replace(/\.[^/.]+$/, ''),
      layer: options.layer ?? 2,
      visibility: options.visibility ?? 'private',
      course_id: options.course_id ?? null,
      resource_type: resourceType,
      source_type: 'upload',
      storage_path: storagePath,
      file_size: file.size,
      mime_type: file.type,
      processing_status: 'pending',
    })
    .select()
    .single();
  if (insertErr) throw insertErr;

  // For text-based files, extract content and trigger processing immediately
  const isText = file.type.startsWith('text/') || ['txt', 'md', 'json', 'csv'].includes(ext);
  if (isText) {
    const textContent = await file.text();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      fetch(`${EDGE_FUNCTION_URL}/process-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ document_id: doc.id, text_content: textContent }),
      }).catch(console.error); // fire-and-forget
    }
  }

  return doc as RagDoc;
}

export async function getLibraryDocuments(filters?: {
  layer?: number;
  course_id?: string;
  owner_id?: string;
}): Promise<RagDoc[]> {
  let q = supabase.from('documents').select('*').order('created_at', { ascending: false });
  if (filters?.layer) q = q.eq('layer', filters.layer);
  if (filters?.course_id) q = q.eq('course_id', filters.course_id);
  if (filters?.owner_id) q = q.eq('owner_id', filters.owner_id);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as RagDoc[];
}

export async function deleteLibraryDocument(id: string): Promise<void> {
  // Get storage path first
  const { data: doc } = await supabase.from('documents').select('storage_path').eq('id', id).single();
  if (doc?.storage_path) {
    await supabase.storage.from('documents').remove([doc.storage_path]).catch(() => {});
  }
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (file.size > maxSize) {
        return { valid: false, error: '文件大小不能超过 10MB' };
    }

    const isSupported = SUPPORTED_MIME_TYPES.includes(file.type) ||
        SUPPORTED_FILE_TYPES.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isSupported) {
        return { valid: false, error: '不支持的文件类型' };
    }

    return { valid: true };
}
