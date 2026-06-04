// Stateful stripper that removes leaked <thinking>…</thinking> blocks from a streamed token
// stream, correctly handling tags split across chunks. Pure + dependency-free → unit-testable
// (CLAUDE.md: the interface is the test surface). See thinking.test.ts.
export function makeThinkingStripper() {
    let buf = '';
    let inside = false;
    const OPEN = /<think(?:ing)?>/i;
    const CLOSE = /<\/think(?:ing)?>/i;
    const isTagPrefix = (s: string) => {
        const t = s.toLowerCase();
        return '<thinking>'.startsWith(t) || '<think>'.startsWith(t)
            || '</thinking>'.startsWith(t) || '</think>'.startsWith(t);
    };
    const run = (flush: boolean): string => {
        let out = '';
        // loop because a chunk may contain multiple open/close transitions
        // eslint-disable-next-line no-constant-condition
        while (true) {
            if (!inside) {
                const m = buf.match(OPEN);
                if (m) { out += buf.slice(0, m.index); buf = buf.slice((m.index ?? 0) + m[0].length); inside = true; continue; }
                const lt = buf.lastIndexOf('<');
                if (flush || lt === -1) { out += buf; buf = ''; }
                else {
                    const tail = buf.slice(lt);
                    if (isTagPrefix(tail)) { out += buf.slice(0, lt); buf = tail; } // hold possible partial open tag
                    else { out += buf; buf = ''; }
                }
                break;
            } else {
                const m = buf.match(CLOSE);
                if (m) { buf = buf.slice((m.index ?? 0) + m[0].length); inside = false; continue; }
                if (flush) { buf = ''; }
                else {
                    const lt = buf.lastIndexOf('<');
                    buf = (lt !== -1 && isTagPrefix(buf.slice(lt))) ? buf.slice(lt) : '';
                }
                break;
            }
        }
        return out;
    };
    return { push: (t: string) => { buf += t; return run(false); }, flush: () => run(true) };
}
