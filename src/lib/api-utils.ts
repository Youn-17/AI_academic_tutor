/**
 * API Error Handling Utilities
 * 
 * Provides consistent error handling for API calls with:
 * - Retry logic for transient failures
 * - Proper error typing
 * - User-friendly error messages
 */

export class APIError extends Error {
    constructor(
        message: string,
        public statusCode: number,
        public isRetryable: boolean = false
    ) {
        super(message);
        this.name = 'APIError';
    }
}

/**
 * Retry configuration for API calls
 */
interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
};

/**
 * Exponential backoff delay calculation
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
    const delay = Math.min(
        config.baseDelay * Math.pow(2, attempt),
        config.maxDelay
    );
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
}

/**
 * Retry wrapper for async functions
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {}
): Promise<T> {
    const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            // Don't retry non-retryable errors
            if (error instanceof APIError && !error.isRetryable) {
                throw error;
            }

            // Don't retry on last attempt
            if (attempt === fullConfig.maxRetries) {
                break;
            }

            // Wait before retrying
            await new Promise(resolve =>
                setTimeout(resolve, calculateDelay(attempt, fullConfig))
            );
        }
    }

    throw lastError;
}

/**
 * Parse API error response into user-friendly message
 */
export function parseErrorMessage(error: unknown): string {
    if (error instanceof APIError) {
        return error.message;
    }

    if (error instanceof Error) {
        // Common error patterns
        if (error.message.includes('Failed to fetch')) {
            return '网络连接失败，请检查您的网络连接后重试。';
        }
        if (error.message.includes('timeout')) {
            return '请求超时，请稍后重试。';
        }
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            return '登录已过期，请重新登录。';
        }
        if (error.message.includes('403') || error.message.includes('Forbidden')) {
            return '您没有权限执行此操作。';
        }
        if (error.message.includes('404')) {
            return '请求的资源不存在。';
        }
        if (error.message.includes('500')) {
            return '服务器错误，请稍后重试。';
        }
        return error.message;
    }

    return '发生未知错误，请稍后重试。';
}

/**
 * Create a fetch wrapper with timeout and error handling
 */
export async function fetchWithTimeout(
    url: string,
    options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
    const { timeout = 30000, ...fetchOptions } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
        });

        if (!response.ok) {
            const isRetryable = response.status >= 500 || response.status === 429;
            throw new APIError(
                `HTTP ${response.status}: ${response.statusText}`,
                response.status,
                isRetryable
            );
        }

        return response;
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new APIError('Request timeout', 408, true);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}
