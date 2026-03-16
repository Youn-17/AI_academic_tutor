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
