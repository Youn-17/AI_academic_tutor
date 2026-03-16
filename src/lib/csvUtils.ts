/** Build a CSV string from an array of flat objects */
export function buildCsv(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const escape = (val: unknown): string => {
        const s = val == null ? '' : String(val);
        return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"`
            : s;
    };
    const lines = [
        headers.join(','),
        ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
    ];
    return lines.join('\r\n');
}

/** Trigger a file download in the browser */
export function triggerDownload(content: string, filename: string): void {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
