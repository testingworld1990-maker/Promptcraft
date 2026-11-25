import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { SavedPrompt } from '../types/prompt';
import { copyTextToClipboard } from '../utils/promptBuilder';
import { parseImportedPromptsJson } from '../utils/storage';

interface SettingsModalProps {
  isOpen: boolean;
  savedApiKey: string;
  savedPrompts: SavedPrompt[];
  onClose: () => void;
  onSaveApiKey: (key: string) => void;
  onImportPrompts: (imported: SavedPrompt[]) => void;
  onNotify: (message: string) => void;
}

export function SettingsModal({
  isOpen,
  savedApiKey,
  savedPrompts,
  onClose,
  onSaveApiKey,
  onImportPrompts,
  onNotify,
}: SettingsModalProps) {
  const [inputKey, setInputKey] = useState(savedApiKey);
  const [showKey, setShowKey] = useState(false);
  const [showPasteImport, setShowPasteImport] = useState(false);
  const [pasteJson, setPasteJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setInputKey(savedApiKey);
      setShowKey(false);
      setShowPasteImport(false);
      setPasteJson('');
      setImportError(null);
    }
  }, [isOpen, savedApiKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveApiKey(inputKey.trim());
    onClose();
  };

  const handleClear = () => {
    setInputKey('');
    onSaveApiKey('');
  };

  const buildBackupPayload = () =>
    JSON.stringify(
      {
        app: 'PromptCraft',
        exportedAt: new Date().toISOString(),
        prompts: savedPrompts,
      },
      null,
      2
    );

  const handleExportDownload = async () => {
    if (savedPrompts.length === 0) {
      onNotify('No saved prompts to export');
      return;
    }
    const json = buildBackupPayload();
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `promptcraft-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onNotify(`Exported ${savedPrompts.length} prompts`);
    } catch {
      const copied = await copyTextToClipboard(json);
      onNotify(copied ? 'Backup JSON copied to clipboard' : 'Could not export backup');
    }
  };

  const handleCopyBackup = async () => {
    if (savedPrompts.length === 0) {
      onNotify('No saved prompts to back up');
      return;
    }
    const copied = await copyTextToClipboard(buildBackupPayload());
    onNotify(copied ? 'Backup JSON copied to clipboard' : 'Could not copy backup');
  };

  const processImportString = (raw: string) => {
    const parsed = parseImportedPromptsJson(raw);
    if (!parsed || parsed.length === 0) {
      setImportError('Invalid backup JSON or no prompts found inside.');
      return;
    }
    setImportError(null);
    onImportPrompts(parsed);
    setShowPasteImport(false);
    setPasteJson('');
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        processImportString(reader.result);
      }
    };
    reader.onerror = () => {
      setImportError('Could not read the selected file.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-modal-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full sm:max-w-md max-h-[88dvh] overflow-y-auto bg-[#13151A] border-t sm:border border-white/[0.1] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 pb-safe shadow-2xl"
          >
            {/* Mobile grab handle */}
            <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h2
                    id="settings-modal-title"
                    className="text-lg font-semibold text-[#F4F4F6] leading-tight"
                  >
                    Settings
                  </h2>
                  <p className="text-xs text-[#8B92A0]">
                    Standalone API key & offline backups
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close settings"
                className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#8B92A0] hover:text-white hover:bg-white/[0.06] -mr-2 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Gemini API Key Form */}
            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="gemini-api-key-input"
                    className="text-sm font-medium text-[#E5E7EB]"
                  >
                    Gemini API Key
                  </label>
                  <span className="text-xs text-[#8B92A0]">
                    {savedApiKey ? (
                      <span className="text-emerald-400 inline-flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        Saved on device
                      </span>
                    ) : (
                      'Not saved yet'
                    )}
                  </span>
                </div>

                <div className="relative">
                  <input
                    id="gemini-api-key-input"
                    type={showKey ? 'text' : 'password'}
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="AIzaSy..."
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full min-h-[48px] pl-4 pr-12 rounded-2xl bg-[#0B0C0E] border border-white/[0.1] font-mono text-sm text-[#F4F4F6] placeholder:text-[#5F6675] focus:outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/15 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((prev) => !prev)}
                    aria-label={showKey ? 'Hide API key' : 'Show API key'}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center text-[#8B92A0] hover:text-white transition-colors"
                  >
                    {showKey ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <p className="text-xs text-[#8B92A0] leading-relaxed">
                  Saved privately in localStorage so{' '}
                  <strong className="text-[#D1D5DE] font-medium">Polish with AI</strong>{' '}
                  connects directly to <span className="font-mono">gemini-4-hydrogen</span>{' '}
                  even when packaged as a standalone Android APK.
                </p>
              </div>

              <div className="flex items-center justify-between gap-2.5">
                {savedApiKey ? (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="min-h-[46px] px-4 py-2 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-sm font-medium text-rose-300 hover:bg-rose-500/20 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-[46px] px-4 py-2 rounded-2xl bg-[#1A1D24] border border-white/[0.08] text-sm font-medium text-[#D1D5DE] hover:text-white whitespace-nowrap shrink-0 transition-colors"
                  >
                    Cancel
                  </button>
                )}

                <button
                  type="submit"
                  className="flex-1 min-h-[46px] px-5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-[#0B0C0E] text-sm font-semibold whitespace-nowrap active:scale-[0.98] transition-all"
                >
                  Save API Key
                </button>
              </div>
            </form>

            {/* Offline Library Backup / Restore */}
            <div className="mt-6 pt-5 border-t border-white/[0.08] flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-[#F4F4F6]">
                  Offline Prompt Backup
                </h3>
                <span className="text-xs font-mono tabular-nums text-[#8B92A0]">
                  {savedPrompts.length} saved
                </span>
              </div>
              <p className="text-xs text-[#8B92A0] leading-relaxed">
                Export or restore your saved prompt library as JSON when moving devices or reinstalling an APK.
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={savedPrompts.length === 0}
                  onClick={handleExportDownload}
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-[#1A1D24] hover:bg-[#22262F] border border-white/[0.08] text-xs font-medium text-[#F4F4F6] flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-40 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-[#9DA3B0]" />
                  <span>Export JSON</span>
                </button>

                <button
                  type="button"
                  disabled={savedPrompts.length === 0}
                  onClick={handleCopyBackup}
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-[#1A1D24] hover:bg-[#22262F] border border-white/[0.08] text-xs font-medium text-[#F4F4F6] flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-40 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-[#9DA3B0]" />
                  <span>Copy JSON</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-[#0B0C0E] hover:bg-[#1A1D24] border border-white/[0.08] text-xs font-medium text-[#D1D5DE] flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-[#9DA3B0]" />
                  <span>Import File</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowPasteImport((prev) => !prev);
                    setImportError(null);
                  }}
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-[#0B0C0E] hover:bg-[#1A1D24] border border-white/[0.08] text-xs font-medium text-[#D1D5DE] flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
                >
                  <span>Paste JSON</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleFileImport}
                className="hidden"
              />

              {showPasteImport && (
                <div className="flex flex-col gap-2 pt-1">
                  <textarea
                    value={pasteJson}
                    onChange={(e) => setPasteJson(e.target.value)}
                    placeholder='Paste PromptCraft backup JSON here...'
                    rows={4}
                    className="w-full rounded-xl bg-[#0B0C0E] border border-white/[0.1] p-3 font-mono text-xs text-[#F4F4F6] placeholder:text-[#5F6675] focus:outline-none focus:border-amber-400/60"
                  />
                  <button
                    type="button"
                    disabled={!pasteJson.trim()}
                    onClick={() => processImportString(pasteJson)}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-amber-400/15 border border-amber-400/40 text-xs font-semibold text-amber-200 hover:bg-amber-400/25 disabled:opacity-40"
                  >
                    Restore Prompts
                  </button>
                </div>
              )}

              {importError && (
                <p role="alert" className="text-xs text-rose-300">
                  {importError}
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
