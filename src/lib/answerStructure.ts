// Parse a tutor answer into a scannable shape: a leading 概要 (one-liner), any lead prose,
// and top-level sections. Pure + testable (CLAUDE.md: the interface is the test surface).
// Used by StructuredAnswer to render a summary card + collapsible sections so long research-team
// answers stop reading as a wall of text.

export interface AnswerSection {
  title: string;
  body: string;
}

export interface ParsedAnswer {
  summary: string | null; // leading 概要 one-liner, if the answer opens with one
  lead: string; // prose before the first section heading
  sections: AnswerSection[];
}

// A line that opens a top-level section: a markdown h2/h3, or a CJK-ordinal heading like
// "一、核心差异" (optionally bolded). Deliberately NOT "1." list items — those are too granular
// and must stay inside their section.
function headingTitle(line: string): string | null {
  const md = line.match(/^\s{0,3}#{2,3}\s+(.+?)\s*#*\s*$/);
  if (md) return md[1].replace(/\*\*/g, '').trim();
  const cjk = line.match(/^\s{0,3}\*{0,2}\s*([一二三四五六七八九十]{1,3}、\s*[^\n]{1,40})\*{0,2}\s*$/);
  if (cjk) return cjk[1].replace(/\*\*/g, '').trim();
  return null;
}

const SUMMARY_RE = /^\s*\*{0,2}\s*(?:概要|摘要|一句话(?:概要|总结)|TL;?DR)\s*\*{0,2}\s*[:：]\s*/i;

export function parseAnswer(md: string): ParsedAnswer {
  const text = (md || '').replace(/\r\n/g, '\n').trim();
  if (!text) return { summary: null, lead: '', sections: [] };

  let summary: string | null = null;
  let lead = '';
  const sections: AnswerSection[] = [];
  let cur: AnswerSection | null = null;

  for (const line of text.split('\n')) {
    const title = headingTitle(line);
    if (title) {
      if (cur) sections.push(cur);
      cur = { title, body: '' };
      continue;
    }
    // a leading 概要 line — only before any section, and only captured once
    if (!cur && summary === null && SUMMARY_RE.test(line)) {
      summary = line.replace(SUMMARY_RE, '').trim();
      continue;
    }
    if (cur) {
      cur.body += (cur.body ? '\n' : '') + line;
    } else {
      lead += (lead ? '\n' : '') + line;
    }
  }
  if (cur) sections.push(cur);
  for (const s of sections) s.body = s.body.trim();

  return { summary, lead: lead.trim(), sections };
}
