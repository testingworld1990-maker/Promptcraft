import { AnimatePresence, motion } from 'motion/react';
import { BookmarkPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SavePromptModalProps {
  isOpen: boolean;
  defaultTitle: string;
  previewText: string;
  isEditingExisting: boolean;
  onClose: () => void;
  onSaveNew: (title: string) => void;
  onUpdateExisting: (title: string) => void;
}

export function SavePromptModal({
  isOpen,
  defaultTitle,
  previewText,
  isEditingExisting,
  onClose,
  onSaveNew,
  onUpdateExisting,
}: SavePromptModalProps) {
  const [title, setTitle] = useState(defaultTitle);

  useEffect(() => {
    if (isOpen) {
      setTitle(defaultTitle);
    }
  }, [isOpen, defaultTitle]);

  const trimmedTitle = title.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmedTitle) return;
    if (isEditingExisting) {
      onUpdateExisting(trimmedTitle);
    } else {
      onSaveNew(trimmedTitle);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-modal-title"
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
            className="relative z-10 w-full sm:max-w-md bg-[#13151A] border-t sm:border border-white/[0.1] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 pb-safe shadow-2xl"
          >
            <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
                  <BookmarkPlus className="w-4 h-4" />
                </div>
                <div>
                  <h2
                    id="save-modal-title"
                    className="text-lg font-semibold text-[#F4F4F6] leading-tight"
                  >
                    {isEditingExisting ? 'Update Saved Prompt' : 'Save Prompt'}
                  </h2>
                  <p className="text-xs text-[#8B92A0]">
                    Stored offline on this device
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close save dialog"
                className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#8B92A0] hover:text-white hover:bg-white/[0.06] -mr-2 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
              <div className="space-y-2">
                <label
                  htmlFor="prompt-title-input"
                  className="text-sm font-medium text-[#E5E7EB]"
                >
                  Prompt Title
                </label>
                <input
                  id="prompt-title-input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Cold Outreach Email — SaaS Founders"
                  maxLength={80}
                  autoFocus
                  className="w-full min-h-[48px] px-4 rounded-2xl bg-[#0B0C0E] border border-white/[0.1] text-sm text-[#F4F4F6] placeholder:text-[#5F6675] focus:outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/15 transition-colors"
                />
              </div>

              <div className="rounded-2xl bg-[#0B0C0E] border border-white/[0.06] p-3.5 max-h-28 overflow-y-auto">
                <p className="text-xs text-[#9DA3B0] whitespace-pre-wrap break-words line-clamp-4 leading-relaxed">
                  {previewText}
                </p>
              </div>

              <div className="pt-1 flex items-center gap-2.5">
                {isEditingExisting ? (
                  <>
                    <button
                      type="button"
                      disabled={!trimmedTitle}
                      onClick={() => {
                        if (!trimmedTitle) return;
                        onSaveNew(trimmedTitle);
                        onClose();
                      }}
                      className="min-h-[46px] px-4 py-2.5 rounded-2xl bg-[#1A1D24] hover:bg-[#22262F] border border-white/[0.1] text-sm font-medium text-[#F4F4F6] whitespace-nowrap shrink-0 disabled:opacity-40 transition-colors"
                    >
                      Save as New
                    </button>
                    <button
                      type="submit"
                      disabled={!trimmedTitle}
                      className="flex-1 min-h-[46px] px-5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-[#0B0C0E] text-sm font-semibold whitespace-nowrap disabled:opacity-40 active:scale-[0.98] transition-all"
                    >
                      Update Saved
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={onClose}
                      className="min-h-[46px] px-4 py-2.5 rounded-2xl bg-[#1A1D24] border border-white/[0.08] text-sm font-medium text-[#D1D5DE] hover:text-white whitespace-nowrap shrink-0 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!trimmedTitle}
                      className="flex-1 min-h-[46px] px-5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-[#0B0C0E] text-sm font-semibold whitespace-nowrap disabled:opacity-40 active:scale-[0.98] transition-all"
                    >
                      Save to Library
                    </button>
                  </>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
