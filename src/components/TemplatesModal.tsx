import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, LayoutTemplate, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PROMPT_TEMPLATES } from '../data/templates';
import { PromptTemplate } from '../types/prompt';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: PromptTemplate) => void;
}

type CategoryFilter = 'All' | PromptTemplate['category'];

const CATEGORIES: CategoryFilter[] = [
  'All',
  'Writing',
  'Coding',
  'Strategy',
  'Marketing',
  'Learning',
];

const CATEGORY_ACCENT: Record<PromptTemplate['category'], string> = {
  Writing: 'from-[#FF6B4A] to-amber-400',
  Coding: 'from-sky-400 to-cyan-300',
  Strategy: 'from-amber-400 to-yellow-300',
  Marketing: 'from-rose-400 to-pink-400',
  Learning: 'from-emerald-400 to-teal-300',
};

const CATEGORY_TEXT: Record<PromptTemplate['category'], string> = {
  Writing: 'text-[#FF9B85]',
  Coding: 'text-sky-300',
  Strategy: 'text-amber-300',
  Marketing: 'text-rose-300',
  Learning: 'text-emerald-300',
};

export function TemplatesModal({
  isOpen,
  onClose,
  onSelectTemplate,
}: TemplatesModalProps) {
  const [category, setCategory] = useState<CategoryFilter>('All');

  const filtered = useMemo(() => {
    if (category === 'All') return PROMPT_TEMPLATES;
    return PROMPT_TEMPLATES.filter((t) => t.category === category);
  }, [category]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="templates-modal-title"
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
            className="relative z-10 w-full sm:max-w-2xl max-h-[86dvh] bg-[#141720] border-t sm:border border-white/[0.1] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="px-5 pt-4 sm:pt-5 pb-4 border-b border-white/[0.08] shrink-0">
              <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-3.5 sm:hidden" />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF6B4A]/25 to-sky-400/25 border border-white/[0.12] flex items-center justify-center text-sky-300">
                    <LayoutTemplate className="w-4 h-4" />
                  </div>
                  <div>
                    <h2
                      id="templates-modal-title"
                      className="text-lg font-semibold text-[#F7F8FA] leading-tight"
                    >
                      Quick Templates
                    </h2>
                    <p className="text-xs text-[#8B92A5]">
                      Tap any template to fill the builder instantly
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close templates"
                  className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#8B92A5] hover:text-white hover:bg-white/[0.06] -mr-2 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                {CATEGORIES.map((cat) => {
                  const active = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      aria-pressed={active}
                      className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                        active
                          ? 'bg-gradient-to-r from-[#FF6B4A] to-amber-400 text-[#0D0F14] font-semibold'
                          : 'bg-[#0D1016] border border-white/[0.08] text-[#9DA4B5] hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 pb-safe">
              {filtered.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => {
                    onSelectTemplate(template);
                    onClose();
                  }}
                  className="relative overflow-hidden group text-left bg-[#0D1016] hover:bg-[#181C28] border border-white/[0.08] hover:border-white/20 rounded-2xl p-4 flex flex-col justify-between gap-2.5 transition-colors active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
                >
                  <div
                    aria-hidden="true"
                    className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${CATEGORY_ACCENT[template.category]}`}
                  />
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[#F7F8FA] group-hover:text-white transition-colors">
                        {template.title}
                      </h3>
                      <ArrowRight className="w-4 h-4 text-[#6E768A] group-hover:text-white shrink-0 transition-colors" />
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#8B92A5]">
                      <span className={`font-medium ${CATEGORY_TEXT[template.category]}`}>
                        {template.category}
                      </span>
                      <span aria-hidden="true" className="text-white/25">
                        ·
                      </span>
                      <span className="capitalize">{template.mode}</span>
                    </div>
                    <p className="text-xs text-[#9DA4B5] leading-relaxed">
                      {template.summary}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
