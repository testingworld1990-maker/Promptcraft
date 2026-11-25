import {
  ArrowUpRight,
  Bookmark,
  Check,
  Copy,
  CopyPlus,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { PromptMode, SavedPrompt } from '../types/prompt';
import {
  copyTextToClipboard,
  countWords,
  extractTemplateVariables,
  formatRelativeDate,
} from '../utils/promptBuilder';

interface SavedPromptsViewProps {
  savedPrompts: SavedPrompt[];
  onLoadPrompt: (prompt: SavedPrompt) => void;
  onDuplicatePrompt: (prompt: SavedPrompt) => void;
  onTogglePin: (id: string) => void;
  onDeletePrompt: (id: string) => void;
  onGoToBuilder: () => void;
  onNotify: (message: string) => void;
}

type FilterMode = 'all' | 'pinned' | PromptMode;

const FILTER_OPTIONS: Array<{ id: FilterMode; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pinned', label: 'Pinned' },
  { id: 'structured', label: 'Structured' },
  { id: 'casual', label: 'Casual' },
];

const MODE_RIBBON: Record<PromptMode, string> = {
  structured: 'from-sky-400 to-cyan-300',
  casual: 'from-emerald-400 to-teal-300',
  xml: 'from-violet-400 to-indigo-400',
};

const MODE_TEXT: Record<PromptMode, string> = {
  structured: 'text-sky-300',
  casual: 'text-emerald-300',
  xml: 'text-violet-300',
};

export function SavedPromptsView({
  savedPrompts,
  onLoadPrompt,
  onDuplicatePrompt,
  onTogglePin,
  onDeletePrompt,
  onGoToBuilder,
  onNotify,
}: SavedPromptsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<FilterMode>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredPrompts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return savedPrompts
      .filter((item) => {
        if (modeFilter === 'pinned' && !item.isPinned) return false;
        if (
          modeFilter !== 'all' &&
          modeFilter !== 'pinned' &&
          item.mode !== modeFilter
        ) {
          return false;
        }
        if (!q) return true;
        return (
          item.title.toLowerCase().includes(q) ||
          item.finalPrompt.toLowerCase().includes(q) ||
          Object.values(item.answers).some((val) => val.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const pinDiff = Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned));
        if (pinDiff !== 0) return pinDiff;
        return b.updatedAt - a.updatedAt;
      });
  }, [savedPrompts, searchQuery, modeFilter]);

  const handleCopy = async (item: SavedPrompt) => {
    const ok = await copyTextToClipboard(item.finalPrompt);
    if (ok) {
      setCopiedId(item.id);
      onNotify(`Copied "${item.title}"`);
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === item.id ? null : prev));
      }, 2000);
    } else {
      onNotify('Could not copy to clipboard');
    }
  };

  return (
    <section
      aria-label="Saved prompts library"
      className="max-w-5xl mx-auto flex flex-col gap-5"
    >
      {/* Header & Search controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#F7F8FA]">
              Saved Prompts
            </h1>
            <p className="mt-1 text-sm text-[#9DA4B5]">
              Available anytime, even completely offline.
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-[#8B92A5]">
            {savedPrompts.length} saved
          </span>
        </div>

        {savedPrompts.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#7D8596] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search saved prompts..."
                aria-label="Search saved prompts"
                className="w-full min-h-[48px] pl-11 pr-10 rounded-2xl bg-[#141720] border border-white/[0.09] text-sm text-[#F7F8FA] placeholder:text-[#6B7387] focus:outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/15 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl flex items-center justify-center text-[#8B92A5] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div
              role="group"
              aria-label="Filter saved prompts"
              className="inline-flex items-center p-1 rounded-2xl bg-[#141720] border border-white/[0.09] overflow-x-auto max-w-full"
            >
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setModeFilter(option.id)}
                  aria-pressed={modeFilter === option.id}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    modeFilter === option.id
                      ? 'bg-sky-400/20 text-sky-200'
                      : 'text-[#8B92A5] hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Empty states */}
      {savedPrompts.length === 0 ? (
        <div className="bg-[#141720] border border-white/[0.09] rounded-3xl px-6 py-14 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF6B4A]/20 to-sky-400/20 border border-white/[0.1] flex items-center justify-center text-sky-300">
            <Bookmark className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold text-[#F7F8FA]">
            No saved prompts yet
          </h2>
          <p className="text-sm text-[#9DA4B5] max-w-sm">
            Build your first prompt in the Builder tab and tap Save Prompt to keep it here offline.
          </p>
          <button
            type="button"
            onClick={onGoToBuilder}
            className="mt-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B4A] to-amber-400 text-[#0D0F14] text-sm font-semibold whitespace-nowrap shrink-0 hover:brightness-110 transition-all"
          >
            Create your first prompt
          </button>
        </div>
      ) : filteredPrompts.length === 0 ? (
        <div className="bg-[#141720] border border-white/[0.09] rounded-3xl px-6 py-12 text-center flex flex-col items-center gap-2">
          <p className="text-base font-medium text-[#F7F8FA]">No matching prompts</p>
          <p className="text-sm text-[#9DA4B5]">
            Try a different keyword or switch the filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setModeFilter('all');
            }}
            className="mt-2 min-h-[44px] px-4 py-2 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-sm font-medium text-[#F7F8FA] hover:bg-[#242A3A]"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPrompts.map((item) => {
            const isCopied = copiedId === item.id;
            const isDeleting = confirmDeleteId === item.id;
            const words = countWords(item.finalPrompt);
            const variableCount = extractTemplateVariables(item.finalPrompt).length;

            return (
              <article
                key={item.id}
                className="relative overflow-hidden bg-[#141720] border border-white/[0.09] rounded-3xl p-4 sm:p-5 flex flex-col justify-between gap-4"
              >
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${MODE_RIBBON[item.mode]}`}
                />

                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-[#F7F8FA] leading-snug line-clamp-1">
                        {item.title}
                      </h2>
                      <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[#8B92A5]">
                        <span
                          className={`font-medium ${MODE_TEXT[item.mode]} ${
                            item.mode === 'xml' ? 'uppercase font-mono' : 'capitalize'
                          }`}
                        >
                          {item.mode}
                        </span>
                        <span aria-hidden="true" className="text-white/25">
                          ·
                        </span>
                        <span className="font-mono tabular-nums">{words} words</span>
                        {variableCount > 0 && (
                          <>
                            <span aria-hidden="true" className="text-white/25">
                              ·
                            </span>
                            <span>
                              {variableCount}{' '}
                              {variableCount === 1 ? 'placeholder' : 'placeholders'}
                            </span>
                          </>
                        )}
                        {item.isPolished && (
                          <>
                            <span aria-hidden="true" className="text-white/25">
                              ·
                            </span>
                            <span className="text-[#FF9B85] font-medium">Polished</span>
                          </>
                        )}
                        <span aria-hidden="true" className="text-white/25">
                          ·
                        </span>
                        <span>{formatRelativeDate(item.updatedAt)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onTogglePin(item.id)}
                      aria-label={
                        item.isPinned ? `Unpin ${item.title}` : `Pin ${item.title}`
                      }
                      aria-pressed={Boolean(item.isPinned)}
                      className={`min-h-[40px] min-w-[40px] -mt-1 -mr-1 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                        item.isPinned
                          ? 'text-amber-400 hover:bg-amber-400/10'
                          : 'text-[#6E768A] hover:text-white hover:bg-white/[0.06]'
                      }`}
                    >
                      <Star
                        className="w-4 h-4"
                        fill={item.isPinned ? 'currentColor' : 'none'}
                      />
                    </button>
                  </div>

                  <p className="text-sm text-[#CDD3DF] leading-relaxed line-clamp-4 whitespace-pre-wrap break-words bg-[#0D1016] border border-white/[0.07] rounded-2xl p-3.5">
                    {item.finalPrompt}
                  </p>
                </div>

                {/* Card actions */}
                <div className="pt-1 flex items-center justify-between gap-2">
                  {isDeleting ? (
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="text-xs font-medium text-rose-300">
                        Delete this prompt?
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1B1F2B] text-xs font-medium text-[#D8DCE6] hover:text-white whitespace-nowrap shrink-0"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeletePrompt(item.id);
                            setConfirmDeleteId(null);
                          }}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-xs font-semibold text-rose-200 hover:bg-rose-500/30 whitespace-nowrap shrink-0"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(item)}
                          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-all ${
                            isCopied
                              ? 'bg-emerald-400 text-[#09120E]'
                              : 'bg-gradient-to-r from-emerald-400 to-teal-300 text-[#09120E] hover:brightness-110'
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => onLoadPrompt(item)}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1B1F2B] hover:bg-[#242A3A] border border-white/[0.09] text-xs font-medium text-[#F7F8FA] flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                        >
                          <span>Edit</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-sky-400" />
                        </button>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onDuplicatePrompt(item)}
                          aria-label={`Duplicate ${item.title}`}
                          className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#8B92A5] hover:text-white hover:bg-white/[0.06] transition-colors"
                        >
                          <CopyPlus className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(item.id)}
                          aria-label={`Delete ${item.title}`}
                          className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#8B92A5] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
