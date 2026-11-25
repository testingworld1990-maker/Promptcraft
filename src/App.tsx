/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnimatePresence, motion } from 'motion/react';
import { Check, LayoutTemplate, Settings } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { LivePreview } from './components/LivePreview';
import { SavePromptModal } from './components/SavePromptModal';
import { SavedPromptsView } from './components/SavedPromptsView';
import { SettingsModal } from './components/SettingsModal';
import { StepBuilder } from './components/StepBuilder';
import { TemplatesModal } from './components/TemplatesModal';
import { PolishError, polishPromptWithGemini } from './services/geminiPolish';
import {
  AppTab,
  DEFAULT_BOOSTERS,
  EMPTY_ANSWERS,
  PolishStyle,
  PromptAnswers,
  PromptBoosters,
  PromptMode,
  PromptTemplate,
  QuestionKey,
  SavedPrompt,
} from './types/prompt';
import {
  buildPrompt,
  copyTextToClipboard,
  suggestPromptTitle,
} from './utils/promptBuilder';
import {
  generatePromptId,
  loadActiveDraft,
  loadGeminiApiKey,
  loadSavedPrompts,
  persistSavedPrompts,
  saveActiveDraft,
  saveGeminiApiKey,
} from './utils/storage';

export default function App() {
  // Pure state-based tab switching (no URL routing so APK WebViews never crash on launch)
  const [activeTab, setActiveTab] = useState<AppTab>('builder');

  // Restore work-in-progress draft from localStorage on launch
  const initialDraft = useMemo(() => loadActiveDraft(), []);

  // Builder state
  const [answers, setAnswers] = useState<PromptAnswers>(
    () => initialDraft?.answers ?? EMPTY_ANSWERS
  );
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(
    () => initialDraft?.currentStepIndex ?? 0
  );
  const [mode, setMode] = useState<PromptMode>(
    () => initialDraft?.mode ?? 'structured'
  );
  const [boosters, setBoosters] = useState<PromptBoosters>(
    () => initialDraft?.boosters ?? DEFAULT_BOOSTERS
  );
  const [polishStyle, setPolishStyle] = useState<PolishStyle>(
    () => initialDraft?.polishStyle ?? 'detailed'
  );
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [polishedPrompt, setPolishedPrompt] = useState<string | null>(null);
  const [customEditPrompt, setCustomEditPrompt] = useState<string | null>(null);
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishError, setPolishError] = useState<{
    message: string;
    needsApiKey: boolean;
  } | null>(null);
  const [copiedPreview, setCopiedPreview] = useState(false);

  // Track currently loaded saved prompt for editing
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editingPromptTitle, setEditingPromptTitle] = useState<string | null>(null);

  // Offline persisted state (localStorage)
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>(() =>
    loadSavedPrompts()
  );
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() =>
    loadGeminiApiKey()
  );

  // Modals & toast
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  // Auto-save work-in-progress draft locally so mobile users never lose edits
  useEffect(() => {
    saveActiveDraft({
      answers,
      mode,
      boosters,
      currentStepIndex,
      polishStyle,
    });
  }, [answers, mode, boosters, currentStepIndex, polishStyle]);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 2400);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  const draftPrompt = useMemo(
    () => buildPrompt(answers, mode, boosters),
    [answers, mode, boosters]
  );

  // Saved prompt keeps {{variables}} reusable; Copy & Share use resolved text
  const savablePrompt = customEditPrompt ?? polishedPrompt ?? draftPrompt;

  const handleAnswerChange = useCallback((key: QuestionKey, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setPolishedPrompt(null);
    setCustomEditPrompt(null);
    setPolishError(null);
  }, []);

  const handleModeChange = useCallback((nextMode: PromptMode) => {
    setMode(nextMode);
    setPolishedPrompt(null);
    setCustomEditPrompt(null);
    setPolishError(null);
  }, []);

  const handleToggleBooster = useCallback((key: keyof PromptBoosters) => {
    setBoosters((prev) => ({ ...prev, [key]: !prev[key] }));
    setPolishedPrompt(null);
    setCustomEditPrompt(null);
    setPolishError(null);
  }, []);

  const handleVariableChange = useCallback((name: string, value: string) => {
    setVariableValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleClearVariables = useCallback(() => {
    setVariableValues({});
  }, []);

  const handleSelectTemplate = useCallback(
    (template: PromptTemplate) => {
      setAnswers({ ...EMPTY_ANSWERS, ...template.answers });
      setMode(template.mode);
      setBoosters({ ...DEFAULT_BOOSTERS, ...(template.boosters ?? {}) });
      setVariableValues({});
      setPolishedPrompt(null);
      setCustomEditPrompt(null);
      setPolishError(null);
      setEditingPromptId(null);
      setEditingPromptTitle(null);
      setCurrentStepIndex(0);
      setActiveTab('builder');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast(`Loaded "${template.title}" template`);
    },
    [showToast]
  );

  const handleResetBuilder = useCallback(() => {
    setAnswers(EMPTY_ANSWERS);
    setBoosters(DEFAULT_BOOSTERS);
    setVariableValues({});
    setCurrentStepIndex(0);
    setPolishedPrompt(null);
    setCustomEditPrompt(null);
    setPolishError(null);
    setEditingPromptId(null);
    setEditingPromptTitle(null);
    showToast('Builder reset');
  }, [showToast]);

  const handleCopyPreview = useCallback(
    async (textToCopy: string) => {
      if (!textToCopy.trim()) return;
      const ok = await copyTextToClipboard(textToCopy);
      if (ok) {
        setCopiedPreview(true);
        showToast('Prompt copied to clipboard');
        if (copyTimerRef.current !== null) {
          window.clearTimeout(copyTimerRef.current);
        }
        copyTimerRef.current = window.setTimeout(() => {
          setCopiedPreview(false);
          copyTimerRef.current = null;
        }, 2000);
      } else {
        showToast('Could not copy to clipboard');
      }
    },
    [showToast]
  );

  const handleSharePreview = useCallback(
    async (textToShare: string) => {
      if (!textToShare.trim() || typeof navigator.share !== 'function') return;
      try {
        await navigator.share({
          title: editingPromptTitle || suggestPromptTitle(answers),
          text: textToShare,
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        showToast('Could not open share sheet');
      }
    },
    [answers, editingPromptTitle, showToast]
  );

  const handlePolish = useCallback(async () => {
    const sourceText = (customEditPrompt ?? draftPrompt).trim();
    if (!sourceText || isPolishing) return;

    setIsPolishing(true);
    setPolishError(null);

    try {
      const result = await polishPromptWithGemini(sourceText, mode, polishStyle);
      setPolishedPrompt(result.polished);
      setCustomEditPrompt(null);
      showToast('Prompt polished with Gemini');
    } catch (err: unknown) {
      if (err instanceof PolishError) {
        setPolishError({ message: err.message, needsApiKey: err.needsApiKey });
      } else {
        setPolishError({
          message: 'Something went wrong while polishing. Please try again.',
          needsApiKey: false,
        });
      }
    } finally {
      setIsPolishing(false);
    }
  }, [customEditPrompt, draftPrompt, isPolishing, mode, polishStyle, showToast]);

  const handleSaveApiKey = useCallback(
    (key: string) => {
      saveGeminiApiKey(key);
      setGeminiApiKey(key);
      setPolishError(null);
      showToast(key ? 'Gemini API key saved on device' : 'Gemini API key removed');
    },
    [showToast]
  );

  const handleSaveNewPrompt = useCallback(
    (title: string) => {
      const now = Date.now();
      const newEntry: SavedPrompt = {
        id: generatePromptId(),
        title,
        answers: { ...answers },
        mode,
        boosters: { ...boosters },
        finalPrompt: savablePrompt,
        isPolished: polishedPrompt !== null,
        isPinned: false,
        createdAt: now,
        updatedAt: now,
      };
      setSavedPrompts((prev) => {
        const next = [newEntry, ...prev];
        persistSavedPrompts(next);
        return next;
      });
      setEditingPromptId(newEntry.id);
      setEditingPromptTitle(newEntry.title);
      showToast(`Saved "${title}"`);
    },
    [answers, boosters, mode, polishedPrompt, savablePrompt, showToast]
  );

  const handleUpdateExistingPrompt = useCallback(
    (title: string) => {
      if (!editingPromptId) {
        handleSaveNewPrompt(title);
        return;
      }
      const now = Date.now();
      setSavedPrompts((prev) => {
        const next = prev.map((item) =>
          item.id === editingPromptId
            ? {
                ...item,
                title,
                answers: { ...answers },
                mode,
                boosters: { ...boosters },
                finalPrompt: savablePrompt,
                isPolished: polishedPrompt !== null,
                updatedAt: now,
              }
            : item
        );
        persistSavedPrompts(next);
        return next;
      });
      setEditingPromptTitle(title);
      showToast(`Updated "${title}"`);
    },
    [
      answers,
      boosters,
      editingPromptId,
      handleSaveNewPrompt,
      mode,
      polishedPrompt,
      savablePrompt,
      showToast,
    ]
  );

  const handleLoadPrompt = useCallback(
    (prompt: SavedPrompt) => {
      setAnswers({ ...EMPTY_ANSWERS, ...prompt.answers });
      setMode(prompt.mode);
      setBoosters({ ...DEFAULT_BOOSTERS, ...(prompt.boosters ?? {}) });
      setVariableValues({});
      setPolishedPrompt(prompt.isPolished ? prompt.finalPrompt : null);
      const rebuilt = buildPrompt(
        { ...EMPTY_ANSWERS, ...prompt.answers },
        prompt.mode,
        { ...DEFAULT_BOOSTERS, ...(prompt.boosters ?? {}) }
      );
      setCustomEditPrompt(
        !prompt.isPolished && prompt.finalPrompt.trim() !== rebuilt.trim()
          ? prompt.finalPrompt
          : null
      );
      setPolishError(null);
      setEditingPromptId(prompt.id);
      setEditingPromptTitle(prompt.title);
      setCurrentStepIndex(0);
      setActiveTab('builder');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast(`Loaded "${prompt.title}"`);
    },
    [showToast]
  );

  const handleDuplicatePrompt = useCallback(
    (prompt: SavedPrompt) => {
      const now = Date.now();
      const copy: SavedPrompt = {
        ...prompt,
        id: generatePromptId(),
        title: `${prompt.title} (Copy)`,
        isPinned: false,
        createdAt: now,
        updatedAt: now,
      };
      setSavedPrompts((prev) => {
        const next = [copy, ...prev];
        persistSavedPrompts(next);
        return next;
      });
      showToast(`Duplicated "${prompt.title}"`);
    },
    [showToast]
  );

  const handleTogglePin = useCallback((id: string) => {
    setSavedPrompts((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, isPinned: !item.isPinned } : item
      );
      persistSavedPrompts(next);
      return next;
    });
  }, []);

  const handleDeletePrompt = useCallback(
    (id: string) => {
      setSavedPrompts((prev) => {
        const next = prev.filter((item) => item.id !== id);
        persistSavedPrompts(next);
        return next;
      });
      if (editingPromptId === id) {
        setEditingPromptId(null);
        setEditingPromptTitle(null);
      }
      showToast('Prompt deleted');
    },
    [editingPromptId, showToast]
  );

  const handleImportPrompts = useCallback(
    (imported: SavedPrompt[]) => {
      let addedCount = 0;
      setSavedPrompts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const fresh = imported.filter((p) => !existingIds.has(p.id));
        addedCount = fresh.length;
        const merged = [...fresh, ...prev];
        persistSavedPrompts(merged);
        return merged;
      });
      showToast(
        addedCount > 0
          ? `Imported ${addedCount} ${addedCount === 1 ? 'prompt' : 'prompts'}`
          : 'All prompts in backup are already saved'
      );
    },
    [showToast]
  );

  const handleJumpToPreview = useCallback(() => {
    previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const defaultSaveTitle = useMemo(() => {
    if (editingPromptTitle) return editingPromptTitle;
    return suggestPromptTitle(answers);
  }, [answers, editingPromptTitle]);

  return (
    <div className="min-h-dvh bg-[#0D0F14] text-[#F7F8FA] flex flex-col">
      {/* Compact sticky top bar (56px height to respect mobile sticky budget) */}
      <header className="sticky top-0 z-30 h-14 bg-[#0D0F14]/90 backdrop-blur-md border-b border-white/[0.08]">
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('builder')}
            className="text-lg font-bold tracking-tight whitespace-nowrap shrink-0 font-display bg-gradient-to-r from-[#FF8E75] via-sky-300 to-emerald-300 bg-clip-text text-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 rounded-lg"
          >
            PromptCraft
          </button>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsTemplatesOpen(true)}
              aria-label="Open quick-start templates"
              className="min-h-[44px] px-3 rounded-xl text-sm font-medium text-[#D8DCE6] hover:text-white hover:bg-white/[0.06] flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
            >
              <LayoutTemplate className="w-4 h-4 text-sky-400" />
              <span>Templates</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Open settings"
              className="min-h-[44px] px-3 rounded-xl text-sm font-medium text-[#D8DCE6] hover:text-white hover:bg-white/[0.06] flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
            >
              <Settings className="w-4 h-4 text-[#9DA4B5]" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main viewport content with generous bottom clearance for fixed BottomNav */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7 pb-28">
        {activeTab === 'builder' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7 items-start">
            <div className="lg:col-span-7">
              <StepBuilder
                answers={answers}
                currentStepIndex={currentStepIndex}
                editingTitle={editingPromptTitle}
                onStepChange={setCurrentStepIndex}
                onAnswerChange={handleAnswerChange}
                onResetAll={handleResetBuilder}
                onJumpToPreview={handleJumpToPreview}
              />
            </div>

            <div
              ref={previewRef}
              className="lg:col-span-5 lg:sticky lg:top-20 scroll-mt-20"
            >
              <LivePreview
                draftPrompt={draftPrompt}
                polishedPrompt={polishedPrompt}
                customEditPrompt={customEditPrompt}
                mode={mode}
                boosters={boosters}
                polishStyle={polishStyle}
                variableValues={variableValues}
                isPolishing={isPolishing}
                polishError={polishError}
                copied={copiedPreview}
                onModeChange={handleModeChange}
                onToggleBooster={handleToggleBooster}
                onPolishStyleChange={setPolishStyle}
                onVariableChange={handleVariableChange}
                onClearVariables={handleClearVariables}
                onCustomEditChange={setCustomEditPrompt}
                onCopy={handleCopyPreview}
                onShare={handleSharePreview}
                onPolish={handlePolish}
                onRevertPolished={() => setPolishedPrompt(null)}
                onOpenSave={() => setIsSaveModalOpen(true)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onDismissError={() => setPolishError(null)}
              />
            </div>
          </div>
        ) : (
          <SavedPromptsView
            savedPrompts={savedPrompts}
            onLoadPrompt={handleLoadPrompt}
            onDuplicatePrompt={handleDuplicatePrompt}
            onTogglePin={handleTogglePin}
            onDeletePrompt={handleDeletePrompt}
            onGoToBuilder={() => setActiveTab('builder')}
            onNotify={showToast}
          />
        )}
      </main>

      {/* Subtle transient toast above BottomNav */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            role="status"
            aria-live="polite"
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-[#1E222B] border border-white/[0.12] text-sm font-medium text-[#F4F4F6] shadow-xl flex items-center gap-2 whitespace-nowrap max-w-[90vw]"
          >
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* State-based Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        savedCount={savedPrompts.length}
        onChangeTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
        }}
      />

      {/* Quick-Start Templates Modal */}
      <TemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Settings Modal (Gemini API key + Offline JSON backup) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        savedApiKey={geminiApiKey}
        savedPrompts={savedPrompts}
        onClose={() => setIsSettingsOpen(false)}
        onSaveApiKey={handleSaveApiKey}
        onImportPrompts={handleImportPrompts}
        onNotify={showToast}
      />

      {/* Save Prompt Modal (offline localStorage) */}
      <SavePromptModal
        isOpen={isSaveModalOpen}
        defaultTitle={defaultSaveTitle}
        previewText={savablePrompt}
        isEditingExisting={editingPromptId !== null}
        onClose={() => setIsSaveModalOpen(false)}
        onSaveNew={handleSaveNewPrompt}
        onUpdateExisting={handleUpdateExistingPrompt}
      />
    </div>
  );
}
