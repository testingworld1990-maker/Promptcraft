import {
  AlertCircle,
  BookmarkPlus,
  Braces,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  Pencil,
  Settings,
  Share2,
  SlidersHorizontal,
  Undo2,
  Wand2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  PolishStyle,
  PromptBoosters,
  PromptMode,
} from '../types/prompt';
import {
  applyTemplateVariables,
  countActiveBoosters,
  countWords,
  extractTemplateVariables,
} from '../utils/promptBuilder';

interface LivePreviewProps {
  draftPrompt: string;
  polishedPrompt: string | null;
  customEditPrompt: string | null;
  mode: PromptMode;
  boosters: PromptBoosters;
  polishStyle: PolishStyle;
  variableValues: Record<string, string>;
  isPolishing: boolean;
  polishError: { message: string; needsApiKey: boolean } | null;
  copied: boolean;
  onModeChange: (mode: PromptMode) => void;
  onToggleBooster: (key: keyof PromptBoosters) => void;
  onPolishStyleChange: (style: PolishStyle) => void;
  onVariableChange: (name: string, value: string) => void;
  onClearVariables: () => void;
  onCustomEditChange: (value: string | null) => void;
  onCopy: (resolvedText: string) => void;
  onShare?: (resolvedText: string) => void;
  onPolish: () => void;
  onRevertPolished: () => void;
  onOpenSave: () => void;
  onOpenSettings: () => void;
  onDismissError: () => void;
}

const BOOSTER_OPTIONS: Array<{
  key: keyof PromptBoosters;
  label: string;
}> = [
  { key: 'stepByStep', label: 'Think step by step' },
  { key: 'askQuestionsFirst', label: 'Ask clarifying questions first' },
  { key: 'includeExamples', label: 'Include real-world examples' },
  { key: 'selfVerify', label: 'Self-check quality before finishing' },
];

const POLISH_STYLES: Array<{ id: PolishStyle; label: string }> = [
  { id: 'detailed', label: 'Detailed' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'concise', label: 'Concise' },
];

export function LivePreview({
  draftPrompt,
  polishedPrompt,
  customEditPrompt,
  mode,
  boosters,
  polishStyle,
  variableValues,
  isPolishing,
  polishError,
  copied,
  onModeChange,
  onToggleBooster,
  onPolishStyleChange,
  onVariableChange,
  onClearVariables,
  onCustomEditChange,
  onCopy,
  onShare,
  onPolish,
  onRevertPolished,
  onOpenSave,
  onOpenSettings,
  onDismissError,
}: LivePreviewProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isEditingDirect, setIsEditingDirect] = useState(false);
  const [comparingDraft, setComparingDraft] = useState(false);

  const rawActivePrompt =
    customEditPrompt !== null
      ? customEditPrompt
      : polishedPrompt !== null && !comparingDraft
        ? polishedPrompt
        : draftPrompt;

  const detectedVariables = useMemo(
    () => extractTemplateVariables(rawActivePrompt),
    [rawActivePrompt]
  );

  const resolvedPrompt = useMemo(
    () => applyTemplateVariables(rawActivePrompt, variableValues),
    [rawActivePrompt, variableValues]
  );

  const hasContent = rawActivePrompt.trim().length > 0;
  const words = countWords(resolvedPrompt);
  const activeBoosterCount = countActiveBoosters(boosters);

  const canShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    Boolean(onShare);

  const extraActiveCount =
    activeBoosterCount + (mode === 'xml' ? 1 : 0) + (polishStyle !== 'detailed' ? 1 : 0);

  return (
    <section
      aria-label="Live prompt preview"
      className="relative overflow-hidden bg-[#141720] border border-white/[0.09] rounded-3xl p-5 sm:p-6 flex flex-col gap-4"
    >
      {/* Subtle colorful top accent hairline */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#FF6B4A] via-sky-400 to-emerald-400"
      />

      {/* Clean Header + Simple 2-way Casual / Structured Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-[#F7F8FA] leading-tight">
            Your Prompt
          </h2>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-[#8B92A5] font-mono tabular-nums">
            <span>{words} {words === 1 ? 'word' : 'words'}</span>
            {hasContent && (
              <>
                <span aria-hidden="true" className="text-white/25">
                  ·
                </span>
                <span
                  className={
                    polishedPrompt && !comparingDraft
                      ? 'text-[#FF9B85] font-sans font-medium'
                      : 'font-sans'
                  }
                >
                  {customEditPrompt !== null
                    ? 'Edited'
                    : polishedPrompt !== null
                      ? comparingDraft
                        ? 'Original'
                        : 'AI Polished'
                      : mode === 'xml'
                        ? 'XML'
                        : 'Live preview'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Simple, clear Casual / Structured toggle */}
        <div
          role="group"
          aria-label="Prompt format style"
          className="inline-flex items-center p-1 rounded-xl bg-[#0D1016] border border-white/[0.08] shrink-0"
        >
          <button
            type="button"
            onClick={() => {
              setIsEditingDirect(false);
              setComparingDraft(false);
              onModeChange('casual');
            }}
            aria-pressed={mode === 'casual'}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              mode === 'casual'
                ? 'bg-emerald-400/20 text-emerald-200'
                : 'text-[#8B92A5] hover:text-white'
            }`}
          >
            Casual
          </button>
          <button
            type="button"
            onClick={() => {
              setIsEditingDirect(false);
              setComparingDraft(false);
              onModeChange('structured');
            }}
            aria-pressed={mode === 'structured'}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              mode === 'structured'
                ? 'bg-sky-400/20 text-sky-200'
                : 'text-[#8B92A5] hover:text-white'
            }`}
          >
            Structured
          </button>
        </div>
      </div>

      {/* Live Prompt Box */}
      <div className="rounded-2xl bg-[#0D1016] border border-white/[0.08] overflow-hidden flex flex-col">
        {hasContent && (
          <div className="px-3.5 py-2 bg-[#11151E] border-b border-white/[0.07] flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              {polishedPrompt ? (
                <div className="inline-flex items-center rounded-lg bg-[#0D1016] border border-white/[0.08] p-0.5">
                  <button
                    type="button"
                    onClick={() => setComparingDraft(false)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                      !comparingDraft
                        ? 'bg-[#FF6B4A]/25 text-[#FFD3C9]'
                        : 'text-[#8B92A5] hover:text-white'
                    }`}
                  >
                    AI Polished
                  </button>
                  <button
                    type="button"
                    onClick={() => setComparingDraft(true)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                      comparingDraft
                        ? 'bg-white/10 text-white'
                        : 'text-[#8B92A5] hover:text-white'
                    }`}
                  >
                    Draft
                  </button>
                </div>
              ) : (
                <span className="text-[#8B92A5] text-[11px] font-medium">
                  Ready to copy
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {polishedPrompt && (
                <button
                  type="button"
                  onClick={() => {
                    setComparingDraft(false);
                    onRevertPolished();
                  }}
                  className="min-h-[32px] px-2 rounded-lg text-[11px] font-medium text-[#9DA4B5] hover:text-white hover:bg-white/[0.06] flex items-center gap-1 whitespace-nowrap"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>Revert</span>
                </button>
              )}

              {customEditPrompt !== null && (
                <button
                  type="button"
                  onClick={() => {
                    onCustomEditChange(null);
                    setIsEditingDirect(false);
                  }}
                  className="min-h-[32px] px-2 rounded-lg text-[11px] font-medium text-sky-300 hover:bg-white/[0.06] flex items-center gap-1 whitespace-nowrap"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>Reset edit</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (!isEditingDirect && customEditPrompt === null) {
                    onCustomEditChange(rawActivePrompt);
                  }
                  setIsEditingDirect((prev) => !prev);
                }}
                aria-pressed={isEditingDirect}
                className={`min-h-[32px] px-2.5 rounded-lg text-[11px] font-medium flex items-center gap-1 whitespace-nowrap transition-colors ${
                  isEditingDirect
                    ? 'bg-sky-400/20 text-sky-200'
                    : 'text-[#9DA4B5] hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Pencil className="w-3 h-3" />
                <span>{isEditingDirect ? 'Done' : 'Edit'}</span>
              </button>
            </div>
          </div>
        )}

        <div className="p-4 sm:p-5 min-h-[172px] max-h-[380px] overflow-y-auto">
          {hasContent ? (
            isEditingDirect ? (
              <textarea
                value={customEditPrompt ?? rawActivePrompt}
                onChange={(e) => onCustomEditChange(e.target.value)}
                rows={8}
                aria-label="Edit final prompt directly"
                className="w-full bg-transparent text-[14px] leading-relaxed text-[#F7F8FA] font-mono focus:outline-none resize-y min-h-[160px]"
              />
            ) : (
              <p
                className={`whitespace-pre-wrap break-words text-[#F0F2F7] ${
                  (mode === 'structured' || mode === 'xml') && !polishedPrompt
                    ? 'font-mono text-[13.5px] leading-relaxed'
                    : 'text-[15px] leading-relaxed'
                }`}
              >
                {resolvedPrompt}
              </p>
            )
          ) : (
            <div className="h-[140px] flex flex-col items-center justify-center text-center px-4">
              <p className="text-sm font-medium text-[#A8B0C2]">
                Your detailed prompt appears here live
              </p>
              <p className="mt-1 text-xs text-[#6E768A] max-w-xs">
                Answer the 3 essential steps above—or tap a Template—to generate a clear prompt.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Automatic {{variable}} quick-fill inputs ONLY when placeholders exist */}
      {detectedVariables.length > 0 && (
        <div className="rounded-2xl bg-[#0D1016] border border-sky-400/25 p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-sky-200 flex items-center gap-1.5">
              <Braces className="w-3.5 h-3.5 text-sky-400" />
              <span>Fill placeholders</span>
            </span>
            {Object.values(variableValues).some((v) => v.trim().length > 0) && (
              <button
                type="button"
                onClick={onClearVariables}
                className="text-[11px] font-medium text-[#9DA4B5] hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {detectedVariables.map((varName) => (
              <input
                key={varName}
                type="text"
                value={variableValues[varName] ?? ''}
                onChange={(e) => onVariableChange(varName, e.target.value)}
                placeholder={varName.replace(/_/g, ' ')}
                aria-label={`Value for ${varName}`}
                className="min-h-[40px] px-3 rounded-xl bg-[#141720] border border-white/[0.08] text-xs text-[#F7F8FA] placeholder:text-[#6B7387] focus:outline-none focus:border-sky-400/60"
              />
            ))}
          </div>
        </div>
      )}

      {/* Inline error notice for AI polish */}
      {polishError && (
        <div
          role="alert"
          className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-3.5 flex flex-col gap-2.5 text-sm text-rose-200"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm leading-relaxed flex-1">
              {polishError.message}
            </p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onDismissError}
              className="min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium text-rose-200/80 hover:text-white whitespace-nowrap shrink-0"
            >
              Dismiss
            </button>
            {polishError.needsApiKey && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="min-h-[36px] px-3.5 py-1.5 rounded-lg bg-rose-500/20 border border-rose-400/40 text-xs font-medium text-white hover:bg-rose-500/30 flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Open Settings</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3 clean, colorful primary action buttons */}
      <div className="flex flex-col gap-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={!hasContent}
            onClick={() => onCopy(resolvedPrompt)}
            className={`min-h-[48px] px-4 py-2.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 whitespace-nowrap shrink-0 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none ${
              copied
                ? 'bg-emerald-400 text-[#09120E]'
                : 'bg-gradient-to-r from-emerald-400 to-teal-300 text-[#09120E] hover:brightness-110'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 shrink-0" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 shrink-0" />
                <span>Copy Prompt</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={!hasContent || isPolishing}
            onClick={onPolish}
            className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#FF6B4A] to-[#F59E0B] text-[#0D0F14] hover:brightness-110 text-sm font-semibold flex items-center justify-center gap-2 whitespace-nowrap shrink-0 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            {isPolishing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Polishing...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 shrink-0" />
                <span>Polish with AI</span>
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          disabled={!hasContent}
          onClick={onOpenSave}
          className="min-h-[46px] px-4 py-2.5 rounded-2xl bg-[#1B1F2B] hover:bg-[#242A3A] border border-white/[0.1] text-[#F7F8FA] text-sm font-medium flex items-center justify-center gap-2 whitespace-nowrap shrink-0 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none"
        >
          <BookmarkPlus className="w-4 h-4 shrink-0 text-sky-400" />
          <span>Save Prompt</span>
        </button>
      </div>

      {/* Single discreet collapsible drawer for optional power settings (closed by default) */}
      <div className="pt-1 border-t border-white/[0.07]">
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          aria-expanded={showAdvanced}
          className="w-full min-h-[40px] px-1 flex items-center justify-between gap-2 text-xs font-medium text-[#8B92A5] hover:text-[#E5E7EB] transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>More options</span>
            {extraActiveCount > 0 && (
              <span className="text-sky-300 font-mono tabular-nums">
                · {extraActiveCount} active
              </span>
            )}
          </span>
          {showAdvanced ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {showAdvanced && (
          <div className="mt-3 flex flex-col gap-4 rounded-2xl bg-[#0D1016] border border-white/[0.07] p-3.5">
            {/* XML Format option */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-[#C7CDD9]">Output format</span>
              <div className="inline-flex items-center p-0.5 rounded-lg bg-[#141720] border border-white/[0.08]">
                {(
                  [
                    { id: 'casual', label: 'Casual' },
                    { id: 'structured', label: 'Structured' },
                    { id: 'xml', label: 'XML' },
                  ] as Array<{ id: PromptMode; label: string }>
                ).map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => onModeChange(fmt.id)}
                    className={`min-h-[32px] px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                      mode === fmt.id
                        ? 'bg-violet-400/20 text-violet-200'
                        : 'text-[#8B92A5] hover:text-white'
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Polish Depth */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-[#C7CDD9]">AI Polish depth</span>
              <div className="inline-flex items-center p-0.5 rounded-lg bg-[#141720] border border-white/[0.08]">
                {POLISH_STYLES.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => onPolishStyleChange(st.id)}
                    className={`min-h-[32px] px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                      polishStyle === st.id
                        ? 'bg-[#FF6B4A]/20 text-[#FFD3C9]'
                        : 'text-[#8B92A5] hover:text-white'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Quality Boosters */}
            <div className="space-y-2">
              <span className="block text-xs text-[#C7CDD9]">Quality boosters</span>
              <div className="grid grid-cols-1 gap-1.5">
                {BOOSTER_OPTIONS.map((item) => {
                  const active = boosters[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => onToggleBooster(item.key)}
                      aria-pressed={active}
                      className={`min-h-[40px] px-3 py-2 rounded-xl border text-left flex items-center gap-2.5 text-xs transition-colors ${
                        active
                          ? 'bg-emerald-400/12 border-emerald-400/40 text-emerald-100'
                          : 'bg-[#141720] border-white/[0.07] text-[#B8C0D0] hover:border-white/15'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                          active
                            ? 'bg-emerald-400 border-emerald-400 text-[#09120E]'
                            : 'border-white/25'
                        }`}
                      >
                        {active && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {canShare && hasContent && (
              <button
                type="button"
                onClick={() => onShare?.(resolvedPrompt)}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#141720] hover:bg-[#1B202E] border border-white/[0.08] text-xs font-medium text-[#E5E7EB] flex items-center justify-center gap-2"
              >
                <Share2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Share to another app</span>
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
