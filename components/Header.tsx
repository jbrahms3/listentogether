"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

const NAV_ITEMS = ["Listening Room", "Upcoming", "Library"];

export default function Header({ listenerCount }: { listenerCount: number }) {
  return (
    <header className="grid grid-cols-2 items-center gap-4 border-b border-line px-6 py-6 sm:px-10 md:grid-cols-3">
      <div className="flex items-center gap-3">
        <svg width="24" height="16" viewBox="0 0 22 16" fill="none" aria-hidden>
          <path
            d="M1 8c2-4 4-6 6-6s4 6 6 6 4-6 6-6 2 2 2 2"
            stroke="#1a1a1a"
            strokeWidth="1.3"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <span className="font-serif text-lg tracking-[0.28em]">LISTEN TOGETHER</span>
      </div>

      <nav className="hidden items-center justify-center gap-10 md:flex">
        {NAV_ITEMS.map((item, i) => (
          <span
            key={item}
            className={`font-serif text-[17px] ${
              i === 0 ? "border-b border-ink pb-1 text-ink" : "text-muted"
            }`}
          >
            {item}
          </span>
        ))}
      </nav>

      <div className="flex items-center justify-end gap-6">
        <div className="flex items-center gap-2 text-[15px] text-muted">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M3.5 19c1-3.5 3.5-5 5.5-5s4.5 1.5 5.5 5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <circle cx="17" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.3" />
            <path
              d="M15 19c.6-2.6 2.2-3.7 3.7-3.7 1.6 0 3.2 1.3 3.8 3.7"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
          <span>{listenerCount}</span>
        </div>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal">
            <button className="flex h-9 w-9 items-center justify-center rounded-full border border-line hover:border-ink/40">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="8" r="3.4" stroke="#1a1a1a" strokeWidth="1.3" />
                <path
                  d="M4.5 20c1.4-4 4.2-6 7.5-6s6.1 2 7.5 6"
                  stroke="#1a1a1a"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </SignInButton>
        </SignedOut>
      </div>
    </header>
  );
}
