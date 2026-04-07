import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const components: Partial<Components> = {
  p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-1.5 list-disc space-y-0.5 pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 list-decimal space-y-0.5 pl-4">{children}</ol>,
  li: ({ children }) => <li className="leading-snug">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children }) => (
    <code className="rounded bg-black/5 px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
  ),
  h2: ({ children }) => (
    <h2 className="mt-3 mb-1 text-sm font-semibold first:mt-0 text-inherit">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-2 mb-0.5 text-sm font-semibold text-inherit">{children}</h3>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-indigo-300/80 pl-3 text-slate-600 italic">{children}</blockquote>
  ),
};

type StudyAiMarkdownProps = {
  children: string;
  className?: string;
};

/** 练习页 AI 文案：安全子集 Markdown（无 raw HTML），配合 remark-gfm。 */
export function StudyAiMarkdown({ children, className = '' }: StudyAiMarkdownProps) {
  const text = (children ?? '').trim();
  if (!text) return null;
  return (
    <div className={`study-ai-md max-w-none text-inherit ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
