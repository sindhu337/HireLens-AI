import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  IconSearch,
  IconCopy,
  IconCheck,
  IconFileText,
  IconCode,
  IconSparkles,
  IconAlertTriangle,
  IconTarget,
} from '@tabler/icons-react';

interface MarkdownCvViewerProps {
  markdownText: string;
  candidateName?: string;
  filename?: string;
  highlightQuery?: string | null;
  highlightType?: 'evidence' | 'unsupported' | 'skill' | 'verified' | 'neutral' | null;
  onClearHighlight?: () => void;
}

export const MarkdownCvViewer: React.FC<MarkdownCvViewerProps> = ({
  markdownText,
  highlightQuery,
  highlightType = 'evidence',
  onClearHighlight,
}) => {
  const [localSearch, setLocalSearch] = useState('');
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentBodyRef = useRef<HTMLDivElement>(null);

  // Active query is either local search or external highlight query
  const effectiveQuery = useMemo(() => {
    if (localSearch.trim()) return localSearch.trim();
    if (!highlightQuery) return '';
    // Clean quotes or preamble from evidence strings like 'Demonstrated React: "..."'
    const match = highlightQuery.match(/"([^"]+)"/);
    if (match && match[1].length > 4) {
      return match[1].trim();
    }
    // Remove prefixes like "Demonstrated X: " or "Experience Verification: "
    const cleaned = highlightQuery
      .replace(/^Demonstrated\s+[^:]+:\s*/i, '')
      .replace(/^Experience Verification:\s*/i, '')
      .replace(/^[A-Za-z\s]+Gap:\s*/i, '')
      .replace(/^[A-Za-z\s]+Mismatch:\s*/i, '')
      .replace(/^Unsupported\s+[^:]+:\s*/i, '')
      .trim();
    return cleaned.length > 2 ? cleaned : highlightQuery.trim();
  }, [localSearch, highlightQuery]);

  // Copy Markdown content
  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdownText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setLocalSearch('');
    if (onClearHighlight) {
      onClearHighlight();
    }
  };

  // Pure HTML generation without any dangerous regex replacing on markup
  const cleanFormattedHtml = useMemo(() => {
    return escapeAndFormat(markdownText);
  }, [markdownText]);

  // Highlight Class based on type
  const highlightClass = useMemo(() => {
    if (highlightType === 'unsupported') {
      return 'bg-rose-500/25 text-rose-950 dark:text-rose-100 font-bold px-1.5 py-0.5 rounded border border-rose-500/50 shadow-xs ring-2 ring-rose-400/20';
    }
    if (highlightType === 'skill' || highlightType === 'verified') {
      return 'bg-emerald-500/25 text-emerald-950 dark:text-emerald-100 font-bold px-1.5 py-0.5 rounded border border-emerald-500/50 shadow-xs ring-2 ring-emerald-400/20';
    }
    return 'bg-amber-400/35 text-amber-950 dark:text-amber-100 font-bold px-1.5 py-0.5 rounded border border-amber-500/50 shadow-xs ring-2 ring-amber-400/20';
  }, [highlightType]);

  // Safe DOM TreeWalker Highlighting (Only touches Node.TEXT_NODE, never HTML tags or attributes!)
  useEffect(() => {
    if (viewMode !== 'preview' || !contentBodyRef.current) return;
    const container = contentBodyRef.current;

    // 1. Remove previous highlights
    const existingMarks = container.querySelectorAll('mark.cv-highlight');
    existingMarks.forEach((m) => {
      const parent = m.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(m.textContent || ''), m);
        parent.normalize();
      }
    });

    if (!effectiveQuery || !effectiveQuery.trim()) {
      return;
    }

    // 2. Compute search terms safely
    const docText = container.textContent || '';
    const terms = getSearchTerms(effectiveQuery, docText);
    if (terms.length === 0) return;

    // 3. Build regex for text matching
    const escapedTerms = terms
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .sort((a, b) => b.length - a.length); // Longest terms first
    const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');

    // 4. TreeWalker to find all TextNodes
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes: Text[] = [];
    let currNode: Node | null;
    while ((currNode = walker.nextNode())) {
      if (currNode.nodeValue && currNode.nodeValue.trim().length > 0) {
        textNodes.push(currNode as Text);
      }
    }

    for (const textNode of textNodes) {
      const text = textNode.nodeValue || '';
      if (!regex.test(text)) continue;
      regex.lastIndex = 0;

      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        const matchStart = match.index;
        const matchEnd = regex.lastIndex;

        if (matchStart > lastIndex) {
          fragment.appendChild(document.createTextNode(text.substring(lastIndex, matchStart)));
        }

        const mark = document.createElement('mark');
        mark.className = `${highlightClass} cv-highlight`;
        mark.setAttribute('data-highlight', 'true');
        mark.textContent = match[0];
        fragment.appendChild(mark);

        lastIndex = matchEnd;
      }

      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
      }

      textNode.parentNode?.replaceChild(fragment, textNode);
    }

    // 5. Scroll first highlight into view
    const firstMark = container.querySelector('mark.cv-highlight');
    if (firstMark) {
      firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [cleanFormattedHtml, effectiveQuery, highlightClass, viewMode]);

  return (
    <Card className="rounded-none border-0 bg-card overflow-hidden shadow-none flex flex-col h-full max-h-[85vh]">
      {/* Top Action & Search Bar */}
      <div className="p-3 border-b border-border/70 bg-muted/30 flex items-center justify-between gap-3">
        {/* Internal In-Doc Search at start */}
        <div className="relative flex-1 max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search inside CV..."
            className="pl-9 pr-3 h-8.5 text-xs sm:text-sm rounded-xl bg-background border-border/70 w-full"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Toggle View Mode */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setViewMode(viewMode === 'preview' ? 'raw' : 'preview')}
            className="h-8.5 px-3 rounded-xl text-xs font-semibold cursor-pointer"
            title="Toggle between formatted Markdown preview and raw source"
          >
            {viewMode === 'preview' ? (
              <>
                <IconCode className="h-3.5 w-3.5 mr-1.5" />
                Show Raw .md
              </>
            ) : (
              <>
                <IconFileText className="h-3.5 w-3.5 mr-1.5" />
                Show Preview
              </>
            )}
          </Button>

          {/* Copy Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyMarkdown}
            className="h-8.5 px-3 rounded-xl text-xs font-semibold cursor-pointer"
            title="Copy Markdown to clipboard"
          >
            {copied ? (
              <>
                <IconCheck className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                Copied
              </>
            ) : (
              <>
                <IconCopy className="h-3.5 w-3.5 mr-1.5" />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Active Highlight Query Notification Bar */}
      {effectiveQuery && (
        <div
          className={`px-4 py-2 border-b text-xs flex items-center justify-between transition-colors ${
            highlightType === 'unsupported'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200'
              : highlightType === 'skill' || highlightType === 'verified'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            {highlightType === 'unsupported' ? (
              <IconAlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            ) : highlightType === 'skill' || highlightType === 'verified' ? (
              <IconSparkles className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <IconTarget className="h-4 w-4 shrink-0 text-amber-600" />
            )}
            <span className="font-semibold shrink-0">
              {highlightType === 'unsupported'
                ? 'Highlighting Unsupported Claim:'
                : highlightType === 'skill' || highlightType === 'verified'
                ? 'Highlighting Verified Evidence / Skill:'
                : 'Highlighting Evidence Statement:'}
            </span>
            <span className="truncate italic font-mono text-xs">"{effectiveQuery}"</span>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleClear}
            className="h-6 text-xs px-2 hover:bg-transparent underline cursor-pointer text-muted-foreground hover:text-foreground font-semibold"
          >
            Clear
          </Button>
        </div>
      )}

      {/* CV Scrollable Content Body */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 font-sans text-sm text-foreground leading-relaxed selection:bg-amber-400/30"
      >
        {viewMode === 'raw' ? (
          <pre className="p-4 rounded-xl bg-muted/40 border border-border/70 font-mono text-xs whitespace-pre-wrap leading-relaxed select-all">
            {markdownText}
          </pre>
        ) : (
          <div
            ref={contentBodyRef}
            className="markdown-cv-body prose prose-sm dark:prose-invert max-w-none space-y-4"
            dangerouslySetInnerHTML={{ __html: cleanFormattedHtml }}
          />
        )}
      </div>
    </Card>
  );
};

/**
 * Intelligent term resolver for evidence highlighting.
 * Resolves exact terms, plural/singular forms, and technology variations (e.g., "RESTful APIs" -> "REST API").
 */
function getSearchTerms(query: string, documentText: string): string[] {
  const cleanQ = query.trim();
  if (!cleanQ) return [];

  const lowerDoc = documentText.toLowerCase();
  const lowerQ = cleanQ.toLowerCase();

  // 1. Direct match check
  if (lowerDoc.includes(lowerQ)) {
    return [cleanQ];
  }

  const terms: string[] = [];

  // 2. Tech synonyms & common naming variations
  const synMap: Record<string, string[]> = {
    'restful apis': ['restful api', 'rest api', 'restful', 'rest apis', 'rest'],
    'restful api': ['rest api', 'restful', 'rest apis', 'rest'],
    'rest apis': ['rest api', 'restful api', 'restful', 'rest'],
    'rest api': ['rest api', 'restful api', 'rest'],
    'clean code standards': ['clean code', 'clean coding', 'code standards', 'linting'],
    'code reviews': ['code review', 'code reviews'],
    'unit testing': ['unit tests', 'unit test', 'pytest', 'jest', 'testing'],
    'sql databases': ['sql database', 'sql databases', 'sql', 'postgresql', 'mysql', 'sqlite'],
    'ci/cd pipelines': ['ci/cd', 'github actions', 'pipeline', 'pipelines'],
    'modern state management': ['redux', 'state management', 'context api'],
    'microservices architecture': ['microservices', 'microservice'],
    'python rest framework': ['python rest', 'rest framework', 'flask', 'fastapi'],
  };

  if (synMap[lowerQ]) {
    for (const syn of synMap[lowerQ]) {
      if (lowerDoc.includes(syn)) {
        terms.push(syn);
      }
    }
  }

  // 3. Tokenize significant words (3+ chars or common tech acronyms)
  const words = cleanQ
    .split(/[\s,+/()&:"'’]+/)
    .map((w) => w.replace(/^[^\w]+|[^\w]+$/g, ''))
    .filter(
      (w) =>
        w.length >= 3 &&
        !['and', 'the', 'for', 'with', 'from', 'lists', 'candidate', 'mentions', 'context'].includes(
          w.toLowerCase()
        )
    );

  for (const w of words) {
    const lowW = w.toLowerCase();
    if (lowerDoc.includes(lowW)) {
      terms.push(w);
    }
    // Check singular if ends in 's'
    if (lowW.endsWith('s') && lowW.length > 3 && lowerDoc.includes(lowW.slice(0, -1))) {
      terms.push(w.slice(0, -1));
    }
  }

  // Fallback to query itself if no subterms found
  return terms.length > 0 ? Array.from(new Set(terms)) : [cleanQ];
}

/**
 * Converts structured Markdown text into semantic HTML blocks.
 */
function escapeAndFormat(text: string): string {
  if (!text) return '';

  const lines = text.split('\n');
  const htmlParts: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      htmlParts.push('</ul>');
      inList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      closeList();
      continue;
    }

    if (trimmed === '---') {
      closeList();
      htmlParts.push('<hr class="my-4 border-border/60" />');
      continue;
    }

    // Main Heading: # Title
    if (trimmed.startsWith('# ')) {
      closeList();
      const content = escapeHtml(trimmed.substring(2));
      htmlParts.push(
        `<h1 class="font-heading text-xl sm:text-2xl font-black text-foreground tracking-tight pb-1">${content}</h1>`
      );
      continue;
    }

    // Section Heading: ## Section
    if (trimmed.startsWith('## ')) {
      closeList();
      const content = escapeHtml(trimmed.substring(3));
      htmlParts.push(
        `<h2 class="font-heading text-base sm:text-lg font-bold text-foreground border-b border-border/60 pb-1.5 mt-5 mb-2.5 flex items-center gap-2"><span class="h-2 w-2 rounded-full bg-emerald-500"></span>${content}</h2>`
      );
      continue;
    }

    // Subheading: ### Role / Institution
    if (trimmed.startsWith('### ')) {
      closeList();
      const content = escapeHtml(trimmed.substring(4));
      htmlParts.push(
        `<h3 class="font-heading text-sm font-bold text-foreground mt-3 mb-1 text-emerald-700 dark:text-emerald-400">${content}</h3>`
      );
      continue;
    }

    // Bullet points: - Bullet
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
      if (!inList) {
        htmlParts.push('<ul class="list-disc list-outside pl-5 space-y-1 my-1.5 text-xs text-foreground/90 leading-relaxed">');
        inList = true;
      }
      const bulletText = escapeHtml(trimmed.replace(/^[-•*]\s*/, ''));
      htmlParts.push(`<li>${formatInlineMarkdown(bulletText)}</li>`);
      continue;
    }

    closeList();

    // Bold lines or contact lines
    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      const content = escapeHtml(trimmed.slice(2, -2));
      htmlParts.push(`<p class="font-semibold text-xs text-foreground/90 my-1">${content}</p>`);
      continue;
    }

    // Standard paragraph line
    const formatted = formatInlineMarkdown(escapeHtml(trimmed));
    htmlParts.push(`<p class="text-xs text-muted-foreground my-1 leading-relaxed">${formatted}</p>`);
  }

  closeList();
  return htmlParts.join('\n');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatInlineMarkdown(text: string): string {
  // Bold **text**
  let result = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');
  // Italic *text*
  result = result.replace(/\*([^*]+)\*/g, '<em class="italic text-muted-foreground">$1</em>');
  // Links [text](url)
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer" class="text-emerald-600 hover:underline inline-flex items-center gap-0.5">$1</a>'
  );
  return result;
}
