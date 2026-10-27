import React, { useEffect, useRef, useState } from 'react';
import { Search, RotateCcw, CheckCircle2, ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { AppTab, FeedStatus } from '../types';
import { auth } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';
import { useEscapeKey } from '../lib/useEscapeKey';

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
  const feedPopoverRef = useRef<HTMLDivElement>(null);
  const { user, canExitDemo, setDemoMode } = useAuth();

  // The feed popover closes on Escape or a click outside it
  useEscapeKey(() => setShowFeedPopover(false), showFeedPopover);
  useEffect(() => {
    if (!showFeedPopover) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!feedPopoverRef.current?.contains(e.target as Node)) setShowFeedPopover(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [showFeedPopover]);

  const handleSignOut = async () => {
    if (canExitDemo) {
      setDemoMode(false);
      return;
    }
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
    <header className="sticky top-0 z-40 w-full border-b border-[var(--color-border)] bg-[var(--color-background)] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Left: Brand logo & live pulse */}
        <div className="flex items-center gap-8">
          <button
            type="button"
            onClick={() => onTabChange('pulse')}
            aria-label="Nazar — go to overview"
            className="flex items-center gap-2.5 cursor-pointer text-left"
          >
            <img src="/nazar-favicon.png" alt="" className="w-8 h-8 object-contain" />
            <span className="text-[22px] font-semibold tracking-tight text-[var(--color-ink)]">Nazar</span>
          </button>

          {/* Editorial Navigation tabs */}
          <nav className="hidden md:flex items-center gap-7 text-[15px] font-medium text-[var(--color-ink-soft)]">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`transition-colors ${
                    active ? 'text-[var(--color-green)]' : 'hover:text-[var(--color-ink)]'
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
            title="Search (Ctrl+K)"
            aria-label="Search stocks"
            className="flex items-center gap-3 h-10 w-10 lg:w-[300px] justify-center lg:justify-start lg:px-3.5 rounded-md bg-[var(--color-background)] border border-[var(--color-border)] hover:border-[#dddee1] text-[var(--color-faint)] transition-colors shrink-0"
          >
            <Search className="w-4 h-4 text-[var(--color-muted)] shrink-0" />
            <span className="hidden lg:inline text-sm flex-1 text-left">Search stocks…</span>
            <kbd className="hidden lg:inline text-xs font-sans text-[var(--color-faint)]">Ctrl+K</kbd>
          </button>

          {/* Editorial Session Time Display & Simulator Trigger */}
          <button
            type="button"
            onClick={onOpenTimeTravel}
            title="Simulate time away to test Nazar calculation"
            className="cursor-pointer group text-right hidden lg:block shrink-0"
          >
            <span className="block text-xs text-[var(--color-muted)] whitespace-nowrap">Away for</span>
            <span className="text-sm font-mono font-medium text-[var(--color-ink)] flex items-center justify-end gap-1.5 whitespace-nowrap">
              <span>{awayFormatted}</span>
              <span className="text-xs font-medium text-[var(--color-green)] group-hover:underline">Simulate</span>
            </span>
          </button>

          {/* Feed state indicator with glowing dot & tooltip popover */}
          <div ref={feedPopoverRef} className="relative shrink-0">
            <button
              onClick={() => setShowFeedPopover(!showFeedPopover)}
              aria-expanded={showFeedPopover}
              aria-haspopup="dialog"
              className="flex items-center gap-2 bg-[var(--color-background)] hover:bg-[var(--color-panel)] h-10 px-3.5 rounded-md border border-[var(--color-border)] transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-amber)] shrink-0" aria-hidden />
              <span className="hidden sm:inline text-sm text-[var(--color-ink-soft)] whitespace-nowrap">
                {feedStatus?.label ?? 'Market data'}
              </span>
              <ChevronDown className="w-3 h-3 text-[var(--color-faint)] shrink-0" />
            </button>

            {showFeedPopover && (
              <div className="absolute right-0 mt-2 w-80 p-4 glass-panel rounded-lg z-50 text-sm space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                  <span className="font-medium text-[var(--color-ink)]">Market data</span>
                  <span className="px-2 py-0.5 rounded bg-[var(--color-panel)] text-[var(--color-muted)] text-xs font-medium">
                    {feedStatus?.mode || 'UNKNOWN'}
                  </span>
                </div>
                <p className="text-[var(--color-muted)] leading-relaxed">
                  {feedStatus?.detail || 'Feed status unavailable.'}
                </p>
                <div className="flex items-center justify-between text-xs text-[var(--color-faint)] font-mono">
                  <span>Loaded at</span>
                  <span>{feedStatus?.lastUpdated || 'Active'}</span>
                </div>
                <div className="pt-3 border-t border-[var(--color-border)] flex gap-2">
                  <button
                    onClick={() => {
                      onSyncNow();
                      setShowFeedPopover(false);
                    }}
                    disabled={isSyncing}
                    className="w-full flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-[var(--color-green)] hover:bg-[var(--color-green-hover)] text-white text-sm font-medium transition-colors disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-4 h-4" />
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
            aria-label="Replay intro"
            className="p-2 rounded-full hover:bg-[var(--color-panel)] text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors hidden md:block"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* User Profile / Auth Actions */}
          <div className="flex items-center gap-2 pl-4 border-l border-[var(--color-border)]">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--color-green-soft)] text-[var(--color-green)]"
              title={user?.email ?? 'Demo mode'}
              aria-label={user?.email ? `Signed in as ${user.email}` : 'Demo mode'}
            >
              <UserIcon className="w-4 h-4" />
            </div>
            {/* Signed-in users sign out; "Skip for now" users can return to sign-in; forced demo mode has neither */}
            {(user || canExitDemo) && (
              <button
                onClick={handleSignOut}
                title={user ? 'Sign Out' : 'Exit demo'}
                aria-label={user ? 'Sign out' : 'Exit demo mode and return to sign-in'}
                className="p-2 rounded-full hover:bg-[var(--color-red-soft)] text-[var(--color-muted)] hover:text-[var(--color-red)] transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile navigation tab bar */}
      <div className="md:hidden flex items-center justify-around border-t border-[var(--color-border-soft)] py-2 bg-[var(--color-background)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            className={`px-3 py-1.5 text-sm font-medium border-b-2 ${
              activeTab === tab.id
                ? 'text-[var(--color-green)] border-[var(--color-green)]'
                : 'text-[var(--color-muted)] border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </header>
  );
};
