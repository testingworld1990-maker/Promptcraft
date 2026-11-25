import { Bookmark, SlidersHorizontal } from 'lucide-react';
import { AppTab } from '../types/prompt';

interface BottomNavProps {
  activeTab: AppTab;
  savedCount: number;
  onChangeTab: (tab: AppTab) => void;
}

export function BottomNav({
  activeTab,
  savedCount,
  onChangeTab,
}: BottomNavProps) {
  return (
    <nav
      aria-label="Primary navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#10131B]/95 backdrop-blur-md border-t border-white/[0.08] pb-safe"
    >
      <div className="max-w-lg mx-auto grid grid-cols-2 h-16">
        <button
          type="button"
          onClick={() => onChangeTab('builder')}
          aria-current={activeTab === 'builder' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400/60 ${
            activeTab === 'builder'
              ? 'text-[#FF8E75]'
              : 'text-[#8B92A5] hover:text-[#E5E7EB]'
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span className="text-[11px] font-medium tracking-tight leading-none whitespace-nowrap">
            Builder
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChangeTab('saved')}
          aria-current={activeTab === 'saved' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400/60 ${
            activeTab === 'saved'
              ? 'text-sky-300'
              : 'text-[#8B92A5] hover:text-[#E5E7EB]'
          }`}
        >
          <Bookmark
            className="w-5 h-5"
            fill={activeTab === 'saved' ? 'currentColor' : 'none'}
          />
          <span className="text-[11px] font-medium tracking-tight leading-none whitespace-nowrap">
            Saved Prompts
            {savedCount > 0 && (
              <span className="ml-1 font-mono tabular-nums opacity-80">
                ({savedCount})
              </span>
            )}
          </span>
        </button>
      </div>
    </nav>
  );
}
