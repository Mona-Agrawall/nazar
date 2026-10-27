import React, { useState } from 'react';
import { Search, RotateCcw, CheckCircle2, ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { AppTab, FeedStatus } from '../types';
import { auth } from '../lib/auth';

interface HeaderProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  feedStatus: FeedStatus | null;
  awayFormatted: string;
  onOpenSearch: () => void;
  onOpenTimeTravel: () => void;
  onReplayIntro: () => void;
  onSyncNow: () => void;
  isSyncing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  feedStatus,
  awayFormatted,
  onOpenSearch,
  onOpenTimeTravel,
  onReplayIntro,
  onSyncNow,
  isSyncing,
}) => {
  const [showFeedPopover, setShowFeedPopover] = useState(false);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const tabs: { id: AppTab; label: string }[] = [
    { id: 'pulse', label: 'Nazar' },
    { id: 'watchlist', label: 'Watchlist' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'indices', label: 'Indices' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--color-border)] bg-[var(--color-background)]/85 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Left: Brand logo & live pulse */}
        <div className="flex items-center gap-8">
          <div onClick={() => onTabChange('pulse')} className="flex items-center gap-3 cursor-pointer group">
            <div className="relative flex items-center justify-center transition-colors">
              <img src="/nazar-favicon.png" alt="Nazar Icon" className="w-8 h-8 object-contain" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-green)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-green)]"></span>
              </span>
            </div>
            <div>
              <span className="text-lg sm:text-xl font-medium text-[var(--color-ink)] block">NAZAR</span>
            </div>
          </div>

          {/* Editorial Navigation tabs */}
          <nav className="hidden md:flex items-center gap-6 text-sm uppercase tracking-normal font-semibold text-[var(--color-ink-soft)]">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`pb-1 transition-colors ${
                    active
                      ? 'text-[var(--color-ink)] border-b border-[var(--color-ink)]'
                      : 'hover:text-[var(--color-ink)]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Center/Right: Actions & status controls */}
        <div className="flex items-center gap-2 sm:gap-4 ml-auto">
          {/* Quick Command search trigger */}
          <button
            onClick={onOpenSearch}
            title="Search (⌘K)"
            className="p-2 rounded-full bg-[var(--color-background)] hover:bg-[var(--color-panel)] border border-[var(--color-border)] shadow-sm hover:shadow-md inner-highlight hover:-translate-y-[0.5px] transition-all group shrink-0"
          >
            <Search className="w-4 h-4 text-[var(--color-ink-soft)] group-hover:text-[var(--color-ink)]" />
          </button>

          {/* Editorial Session Time Display & Simulator Trigger */}
          <div
            onClick={onOpenTimeTravel}
            title="Simulate time away to test Nazar calculation"
            className="cursor-pointer group text-right hidden lg:block shrink-0"
          >
            <div className="text-[10px] uppercase font-medium text-[var(--color-faint)] group-hover:text-[var(--color-muted)] transition-colors whitespace-nowrap">
              Session Time
            </div>
            <div className="text-xs font-mono font-semibold text-[var(--color-ink)] flex items-center justify-end gap-1 whitespace-nowrap">
              <span>{awayFormatted} away</span>
              <span className="text-[9px] text-[var(--color-green)] underline underline-offset-2 decoration-[var(--color-border)] group-hover:decoration-[var(--color-green)]">
                Simulate
              </span>
            </div>
          </div>

          {/* Feed state indicator with glowing dot & tooltip popover */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowFeedPopover(!showFeedPopover)}
              className="flex items-center gap-2 sm:gap-3 bg-[var(--color-background)] hover:bg-[var(--color-panel)] px-3 sm:px-4 py-1.5 rounded-full border border-[var(--color-border)] shadow-sm hover:shadow-md inner-highlight hover:-translate-y-[0.5px] transition-all"
            >
              <div className="w-2 h-2 rounded-full bg-[var(--color-green)] shadow-[0_0_8px_var(--color-green-soft)] shrink-0" />
              <span className="text-[9px] sm:text-[10px] uppercase text-[var(--color-ink-soft)] font-semibold font-mono whitespace-nowrap">
                {feedStatus?.label ?? 'Market data'}
              </span>
              <ChevronDown className="w-3 h-3 text-[var(--color-faint)] shrink-0" />
            </button>

            {showFeedPopover && (
              <div className="absolute right-0 mt-3 w-72 p-4 glass-panel rounded-2xl shadow-[0_12px_48px_rgba(0,0,0,0.05)] z-50 text-xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] pb-2">
                  <span className="font-semibold text-[var(--color-ink)] ">Market Feed Status</span>
                  <span className="px-2 py-0.5 rounded bg-[var(--color-green-soft)] text-[var(--color-green)] text-[10px] font-mono uppercase ">
                    {feedStatus?.mode || 'UNKNOWN'}
                  </span>
                </div>
                <p className="text-[var(--color-muted)] leading-relaxed text-[11px]">
                  {feedStatus?.detail || 'Feed status unavailable.'}
                </p>
                <div className="flex items-center justify-between text-[10px] text-[var(--color-faint)] pt-1 font-mono">
                  <span>Last Engine Tick</span>
                  <span>{feedStatus?.lastUpdated || 'Active'}</span>
                </div>
                <div className="pt-2 border-t border-[var(--color-border-soft)] flex gap-2">
                  <button
                    onClick={() => {
                      onSyncNow();
                      setShowFeedPopover(false);
                    }}
                    disabled={isSyncing}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-[var(--color-panel)] hover:bg-[var(--color-border-soft)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] text-[11px] transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-green)]" />
                    <span>{isSyncing ? 'Syncing...' : 'Mark Session as Read'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Replay intro */}
          <button
            onClick={onReplayIntro}
            title="Replay cinematic first-open experience"
            className="p-1.5 rounded-full bg-[var(--color-panel)] hover:bg-[var(--color-border-soft)] text-[var(--color-faint)] hover:text-[var(--color-ink)] transition-colors hidden md:block"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* User Profile / Auth Actions */}
          <div className="flex items-center gap-3 pl-4 ml-2 border-l border-[var(--color-border-soft)]">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--color-panel)] border border-[var(--color-border-soft)] shadow-sm">
              <UserIcon className="w-4 h-4 text-[var(--color-ink-soft)]" />
            </div>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1.5 rounded-full hover:bg-[var(--color-red-soft)] text-[var(--color-faint)] hover:text-[var(--color-red)] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation tab bar */}
      <div className="md:hidden flex items-center justify-around border-t border-[var(--color-border-soft)] py-2 bg-[var(--color-background)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-3 py-1 text-[11px] uppercase font-medium ${
              activeTab === tab.id
                ? 'text-[var(--color-ink)] border-b border-[var(--color-ink)]'
                : 'text-[var(--color-muted)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </header>
  );
};
