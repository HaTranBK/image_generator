"use client";

import React from "react";
import { useAuth } from "../providers/AuthProvider";

interface HeaderLayoutProps {
  children: React.ReactNode;
}

export default function Header({ children }: HeaderLayoutProps) {
  const { user, logoutFn } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      {/* Unified Navbar */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left side Logo */}
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-violet-600 p-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <span className="font-bold text-lg tracking-tight">Studio</span>
            </div>

            {/* Right side Profile & Logout */}
            <div className="flex items-center gap-4">
              {user && (
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-zinc-200">
                    {user.name}
                  </p>
                  <p className="text-xs text-zinc-500">{user.email}</p>
                </div>
              )}

              <button
                onClick={() => logoutFn()}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Page Content wrapper */}
      {children}
    </div>
  );
}
