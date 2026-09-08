import { Fragment, type ReactNode } from 'react';

/*
 * Minimal, safe Markdown renderer for coach replies. It never injects HTML: text is parsed into React
 * nodes, supporting headings (#), bullet / numbered lists, paragraphs, **bold**, *italic* and `code`.
 */
function inline(text: string, key = 0): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g;
  let last = 0; let m: RegExpExecArray | null; let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) out.push(<strong key={`${key}-${i++}`} className="font-bold">{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('`')) out.push(<code key={`${key}-${i++}`} className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.85em] dark:bg-white/15">{tok.slice(1, -1)}</code>);
    else out.push(<em key={`${key}-${i++}`}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function Markdown({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r/g, '').split('\n');
  const blocks: ReactNode[] = [];
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let para: string[] = [];
  const flushPara = () => { if (para.length) { blocks.push(<p key={blocks.length} className="my-1.5 leading-relaxed">{inline(para.join(' '), blocks.length)}</p>); para = []; } };
  const flushList = () => {
    if (!list) return;
    const Tag = list.type;
    blocks.push(<Tag key={blocks.length} className={`my-1.5 space-y-1 pl-5 ${list.type === 'ul' ? 'list-disc' : 'list-decimal'}`}>{list.items.map((it, i) => <li key={i} className="leading-relaxed">{inline(it, i)}</li>)}</Tag>);
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    const ul = /^\s*[-*•]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (h) { flushPara(); flushList(); blocks.push(<p key={blocks.length} className={`mt-2 font-extrabold ${h[1].length === 1 ? 'text-base' : 'text-sm'}`}>{inline(h[2], blocks.length)}</p>); continue; }
    if (ul || ol) { flushPara(); const type = ul ? 'ul' : 'ol'; const item = (ul || ol)![1]; if (!list || list.type !== type) { flushList(); list = { type, items: [] }; } list.items.push(item); continue; }
    if (!line.trim()) { flushPara(); flushList(); continue; }
    if (list) { list.items[list.items.length - 1] += ` ${line.trim()}`; continue; }
    para.push(line.trim());
  }
  flushPara(); flushList();
  return <div className={className}>{blocks.map((b, i) => <Fragment key={i}>{b}</Fragment>)}</div>;
}
