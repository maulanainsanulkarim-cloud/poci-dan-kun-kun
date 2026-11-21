import React from 'react';
import { Clapperboard } from 'lucide-react';

export type StudioTabId = 'script' | 'dubbing' | 'visual' | 'ai';

interface TopBarProps {
  activeTab: StudioTabId;
  onSelectTab: (tab: StudioTabId) => void;
  onOpenExport: () => void;
  isExporting: boolean;
}

const NAV_TABS: Array<{ id: StudioTabId; label: string }> = [
  { id: 'script', label: 'Episode & Naskah' },
  { id: 'dubbing', label: 'Dubbing Audio' },
  { id: 'visual', label: 'Karakter & Latar' },
  { id: 'ai', label: 'Sutradara AI' },
];

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenExport,
  isExporting,
}) => {
  return (
    <header className="h-14 border-b border-zinc-800 bg-[#09090B] px-5 flex items-center justify-between gap-8 shrink-0">
      {/* Zone 1: Single-line Brand Wordmark */}
      <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
        <Clapperboard className="w-5 h-5 text-amber-500" aria-hidden="true" />
        <span className="font-display text-base font-bold tracking-tight text-zinc-100">
          Indis Studio 2D
        </span>
      </div>

      {/* Zone 2: Navigation Tab Links */}
      <nav className="hidden md:flex items-center gap-6" aria-label="Workspace navigation">
        {NAV_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`py-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
                isActive
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1 Primary CTA */}
      <div className="shrink-0">
        <button
          type="button"
          onClick={onOpenExport}
          disabled={isExporting}
          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-zinc-950 font-semibold text-xs tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {isExporting ? 'Merender Video...' : 'Export Video 9:16'}
        </button>
      </div>
    </header>
  );
};
