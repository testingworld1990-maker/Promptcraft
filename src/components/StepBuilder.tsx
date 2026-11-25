import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Mic,
  MicOff,
  Plus,
  RotateCcw,
  SkipForward,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PROMPT_QUESTIONS } from '../data/questions';
import { PromptAnswers, QuestionKey, StepColorKey } from '../types/prompt';
import {
  countAnsweredSteps,
  isChipSelected,
  toggleChipInText,
} from '../utils/promptBuilder';

interface StepBuilderProps {
  answers: PromptAnswers;
  currentStepIndex: number;
  editingTitle: string | null;
  onStepChange: (index: number) => void;
  onAnswerChange: (key: QuestionKey, value: string) => void;
  onResetAll: () => void;
  onJumpToPreview?: () => void;
}

interface StepTheme {
  glow: string;
  barActive: string;
  barFilled: string;
  tabActive: string;
  labelText: string;
  focusBorder: string;
  chipSelected: string;
  chipCheck: string;
  primaryBtn: string;
}

const STEP_THEMES: Record<StepColorKey, StepTheme> = {
  coral: {
    glow: 'from-[#FF6B4A]/20 via-[#FF6B4A]/5 to-transparent',
    barActive: 'bg-[#FF6B4A]',
    barFilled: 'bg-[#FF6B4A]/65',
    tabActive: 'bg-[#FF6B4A]/15 border-[#FF6B4A]/60 text-[#FF9B85]',
    labelText: 'text-[#FF8E75]',
    focusBorder: 'focus:border-[#FF6B4A]/70 focus:ring-[#FF6B4A]/20',
    chipSelected: 'bg-[#FF6B4A]/18 border-[#FF6B4A]/55 text-[#FFD3C9]',
    chipCheck: 'text-[#FF8E75]',
    primaryBtn: 'bg-gradient-to-r from-[#FF6B4A] to-[#F59E0B] text-[#0D0F14] hover:brightness-110',
  },
  sky: {
    glow: 'from-sky-400/20 via-sky-400/5 to-transparent',
    barActive: 'bg-sky-400',
    barFilled: 'bg-sky-400/65',
    tabActive: 'bg-sky-400/15 border-sky-400/60 text-sky-300',
    labelText: 'text-sky-300',
    focusBorder: 'focus:border-sky-400/70 focus:ring-sky-400/20',
    chipSelected: 'bg-sky-400/18 border-sky-400/55 text-sky-100',
    chipCheck: 'text-sky-300',
    primaryBtn: 'bg-gradient-to-r from-sky-400 to-cyan-300 text-[#0D0F14] hover:brightness-110',
  },
  emerald: {
    glow: 'from-emerald-400/20 via-emerald-400/5 to-transparent',
    barActive: 'bg-emerald-400',
    barFilled: 'bg-emerald-400/65',
    tabActive: 'bg-emerald-400/15 border-emerald-400/60 text-emerald-300',
    labelText: 'text-emerald-300',
    focusBorder: 'focus:border-emerald-400/70 focus:ring-emerald-400/20',
    chipSelected: 'bg-emerald-400/18 border-emerald-400/55 text-emerald-100',
    chipCheck: 'text-emerald-300',
    primaryBtn: 'bg-gradient-to-r from-emerald-400 to-teal-300 text-[#0D0F14] hover:brightness-110',
  },
  amber: {
    glow: 'from-amber-400/20 via-amber-400/5 to-transparent',
    barActive: 'bg-amber-400',
    barFilled: 'bg-amber-400/65',
    tabActive: 'bg-amber-400/15 border-amber-400/60 text-amber-300',
    labelText: 'text-amber-300',
    focusBorder: 'focus:border-amber-400/70 focus:ring-amber-400/20',
    chipSelected: 'bg-amber-400/18 border-amber-400/55 text-amber-100',
    chipCheck: 'text-amber-300',
    primaryBtn: 'bg-gradient-to-r from-amber-400 to-yellow-300 text-[#0D0F14] hover:brightness-110',
  },
  violet: {
    glow: 'from-violet-400/20 via-violet-400/5 to-transparent',
    barActive: 'bg-violet-400',
    barFilled: 'bg-violet-400/65',
    tabActive: 'bg-violet-400/15 border-violet-400/60 text-violet-300',
    labelText: 'text-violet-300',
    focusBorder: 'focus:border-violet-400/70 focus:ring-violet-400/20',
    chipSelected: 'bg-violet-400/18 border-violet-400/55 text-violet-100',
    chipCheck: 'text-violet-300',
    primaryBtn: 'bg-gradient-to-r from-violet-400 to-indigo-300 text-[#0D0F14] hover:brightness-110',
  },
  rose: {
    glow: 'from-rose-400/20 via-rose-400/5 to-transparent',
    barActive: 'bg-rose-400',
    barFilled: 'bg-rose-400/65',
    tabActive: 'bg-rose-400/15 border-rose-400/60 text-rose-300',
    labelText: 'text-rose-300',
    focusBorder: 'focus:border-rose-400/70 focus:ring-rose-400/20',
    chipSelected: 'bg-rose-400/18 border-rose-400/55 text-rose-100',
    chipCheck: 'text-rose-300',
    primaryBtn: 'bg-gradient-to-r from-rose-400 to-pink-300 text-[#0D0F14] hover:brightness-110',
  },
};

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function StepBuilder({
  answers,
  currentStepIndex,
  editingTitle,
  onStepChange,
  onAnswerChange,
  onResetAll,
  onJumpToPreview,
}: StepBuilderProps) {
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const latestValueRef = useRef('');
  const currentQuestion = PROMPT_QUESTIONS[currentStepIndex];
  const currentValue = answers[currentQuestion.id];
  latestValueRef.current = currentValue;

  const theme = STEP_THEMES[currentQuestion.colorKey];
  const speechSupported = getSpeechRecognitionCtor() !== null;
  const answeredCount = countAnsweredSteps(answers);
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === PROMPT_QUESTIONS.length - 1;
  const isLastCoreStep = currentStepIndex === 2;

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore stop errors
        }
        recognitionRef.current = null;
      }
      setIsListening(false);
    };
  }, [currentStepIndex]);

  const handleToggleVoice = () => {
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore stop errors
      }
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    try {
      const recognition = new Ctor();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = navigator.language || 'en-US';

      recognition.onresult = (event) => {
        const spokenParts: string[] = [];
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const item = event.results[i];
          if (item && item[0]?.transcript) {
            spokenParts.push(item[0].transcript.trim());
          }
        }
        const transcript = spokenParts.join(' ').trim();
        if (transcript) {
          const existing = latestValueRef.current.trim();
          const combined = existing ? `${existing} ${transcript}` : transcript;
          onAnswerChange(currentQuestion.id, combined);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      setIsListening(true);
      recognition.start();
    } catch {
      setIsListening(false);
      recognitionRef.current = null;
    }
  };

  const handleChipTap = (chip: string) => {
    const updated = toggleChipInText(currentValue, chip);
    onAnswerChange(currentQuestion.id, updated);
  };

  const handleResetConfirm = () => {
    onResetAll();
    setConfirmingReset(false);
  };

  return (
    <section
      aria-label="Prompt builder questions"
      className="relative overflow-hidden bg-[#141720] border border-white/[0.09] rounded-3xl p-5 sm:p-6 flex flex-col gap-5"
    >
      {/* Soft top ambient color wash tied to current step */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${theme.glow} transition-colors duration-300`}
      />

      {/* Editing context banner if loaded from Saved Prompts */}
      {editingTitle && (
        <div className="relative flex items-center justify-between gap-3 pb-3 border-b border-white/[0.08] text-xs text-[#A1A8B8]">
          <span className="truncate">
            Editing:{' '}
            <strong className="font-medium text-[#F4F4F6]">{editingTitle}</strong>
          </span>
          <button
            type="button"
            onClick={onResetAll}
            className="text-sky-300 hover:text-sky-200 font-medium whitespace-nowrap shrink-0 min-h-[36px] px-2 -mr-2"
          >
            New prompt
          </button>
        </div>
      )}

      {/* Clean colorful 6-step progress strip: Core (1-3) + Optional (4-6) */}
      <div className="relative flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 font-mono tabular-nums">
            <span className={`font-semibold ${theme.labelText}`}>
              Step {currentQuestion.stepNumber}/6
            </span>
            <span className="text-white/25" aria-hidden="true">
              ·
            </span>
            <span className="font-sans font-medium text-[#E5E7EB]">
              {currentQuestion.shortLabel}
            </span>
            <span className="text-white/25" aria-hidden="true">
              ·
            </span>
            <span className="font-sans text-[#949CAE]">
              {currentQuestion.isOptional ? 'Optional' : 'Essential'}
            </span>
          </div>

          <span className="font-mono tabular-nums text-[#8B92A5]">
            {answeredCount}/6
          </span>
        </div>

        {/* Colorful 6-segment tap bar */}
        <div
          role="tablist"
          aria-label="Prompt steps"
          className="grid grid-cols-6 gap-1.5"
        >
          {PROMPT_QUESTIONS.map((q, idx) => {
            const qTheme = STEP_THEMES[q.colorKey];
            const isActive = idx === currentStepIndex;
            const isFilled = answers[q.id].trim().length > 0;
            return (
              <button
                key={q.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Step ${q.stepNumber}: ${q.shortLabel} (${q.isOptional ? 'Optional' : 'Essential'})`}
                onClick={() => onStepChange(idx)}
                className={`min-h-[44px] rounded-xl border flex flex-col items-center justify-center gap-1.5 px-1 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                  isActive
                    ? qTheme.tabActive
                    : isFilled
                      ? 'bg-[#1B202C] border-white/[0.12] text-[#F4F4F6] hover:border-white/25'
                      : 'bg-[#0E1117]/80 border-white/[0.06] text-[#7D8596] hover:text-[#D1D5DE] hover:border-white/15'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-6 rounded-full transition-colors ${
                    isActive
                      ? qTheme.barActive
                      : isFilled
                        ? qTheme.barFilled
                        : 'bg-white/12'
                  }`}
                />
                <span className="text-[10px] font-medium truncate max-w-full leading-none">
                  {q.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Animated single-question area */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex flex-col gap-4"
        >
          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#F7F8FA] leading-snug">
              {currentQuestion.question}
            </h2>
            <p className="text-sm text-[#9DA4B5] leading-relaxed">
              {currentQuestion.helperText}
            </p>
          </div>

          {/* Clean dark input textarea with optional mic & clear */}
          <div className="relative">
            <textarea
              id={`question-input-${currentQuestion.id}`}
              value={currentValue}
              onChange={(e) => onAnswerChange(currentQuestion.id, e.target.value)}
              placeholder={currentQuestion.placeholder}
              rows={3}
              className={`w-full rounded-2xl bg-[#0D1016] border px-4 py-3.5 pr-12 text-[15px] leading-relaxed text-[#F7F8FA] placeholder:text-[#626A7B] focus:outline-none focus:ring-2 resize-y min-h-[104px] transition-colors ${
                isListening
                  ? 'border-rose-400/70 focus:border-rose-400 focus:ring-rose-400/20'
                  : `border-white/[0.1] ${theme.focusBorder}`
              }`}
            />

            <div className="absolute top-2.5 right-2.5 flex flex-col items-center gap-1">
              {currentValue.length > 0 && (
                <button
                  type="button"
                  onClick={() => onAnswerChange(currentQuestion.id, '')}
                  aria-label="Clear this answer"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[#8B92A5] hover:text-white hover:bg-white/[0.07] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {speechSupported && (
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  aria-label={isListening ? 'Stop voice input' : 'Dictate with voice'}
                  aria-pressed={isListening}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                    isListening
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
                      : 'text-[#8B92A5] hover:text-white hover:bg-white/[0.07]'
                  }`}
                >
                  {isListening ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>

            {isListening && (
              <p
                role="status"
                className="mt-1.5 text-xs font-medium text-rose-300 flex items-center gap-1.5"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Listening — speak your answer</span>
              </p>
            )}
          </div>

          {/* 6 crisp, colorful clickable suggestion chips */}
          <div className="space-y-2">
            <span className="block text-xs font-medium text-[#8B92A5]">
              Quick tap ideas
            </span>
            <div className="flex flex-wrap gap-2">
              {currentQuestion.suggestions.map((suggestion) => {
                const selected = isChipSelected(currentValue, suggestion);
                return (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleChipTap(suggestion)}
                    aria-pressed={selected}
                    className={`min-h-[42px] px-3.5 py-2 rounded-xl border text-sm text-left flex items-center gap-2 transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                      selected
                        ? `${theme.chipSelected} font-medium`
                        : 'bg-[#1B1F2B] border-white/[0.08] text-[#D8DCE6] hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {selected ? (
                      <Check className={`w-3.5 h-3.5 shrink-0 ${theme.chipCheck}`} />
                    ) : (
                      <Plus className="w-3.5 h-3.5 text-[#7E8698] shrink-0" />
                    )}
                    <span className="leading-snug">{suggestion}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Clean, simple step navigation footer */}
      <div className="relative pt-3 border-t border-white/[0.08] flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => onStepChange(Math.max(0, currentStepIndex - 1))}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-sm font-medium text-[#E5E7EB] hover:bg-[#242938] disabled:opacity-35 disabled:pointer-events-none flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {answeredCount > 0 && !confirmingReset && (
            <button
              type="button"
              onClick={() => setConfirmingReset(true)}
              aria-label="Reset all answers"
              className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium text-[#8B92A5] hover:text-white hover:bg-white/[0.05] flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          {confirmingReset && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleResetConfirm}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-400/40 text-xs font-medium text-rose-200 hover:bg-rose-500/30 whitespace-nowrap shrink-0"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setConfirmingReset(false)}
                className="min-h-[40px] px-2 py-1.5 rounded-xl text-xs font-medium text-[#9DA4B5] hover:text-white whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* On Step 3 (end of Essential steps), let user finish immediately OR keep going to optional steps */}
          {isLastCoreStep && onJumpToPreview && (
            <button
              type="button"
              onClick={onJumpToPreview}
              className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium text-emerald-300 hover:text-emerald-200 hover:bg-emerald-400/10 whitespace-nowrap shrink-0 transition-colors"
            >
              Use now
            </button>
          )}

          {/* On Optional steps (4-6), give a clear 1-tap Skip action */}
          {currentQuestion.isOptional && !isLast && (
            <button
              type="button"
              onClick={() => onStepChange(currentStepIndex + 1)}
              className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium text-[#9DA4B5] hover:text-white hover:bg-white/[0.06] flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
            >
              <span>Skip</span>
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          )}

          {!isLast ? (
            <button
              type="button"
              onClick={() =>
                onStepChange(Math.min(PROMPT_QUESTIONS.length - 1, currentStepIndex + 1))
              }
              className={`min-h-[44px] px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-[0.98] transition-all ${theme.primaryBtn}`}
            >
              <span>{isLastCoreStep ? 'Add Extras' : 'Next'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (onJumpToPreview) {
                  onJumpToPreview();
                }
              }}
              className={`min-h-[44px] px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-[0.98] transition-all ${theme.primaryBtn}`}
            >
              <Check className="w-4 h-4" />
              <span>Done</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
