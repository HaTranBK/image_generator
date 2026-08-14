"use client";

import React from "react";
import { useAuth } from "../providers/AuthProvider";
import { GRADION_LOGO_BASE64 } from "@/lib/logo";

interface HeaderLayoutProps {
  children: React.ReactNode;
}

export default function Header({ children }: HeaderLayoutProps) {
  const { user, logoutFn } = useAuth();

  return (
    <div className="min-h-screen bg-[#fafaf8] text-stone-800 font-sans">
      {/* Unified Navbar */}
      <header className="border-b border-orange-100 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left side Logo */}
            <div className="flex items-center gap-3">
              {/* GRADION IG Logo Icon */}
              <div
                className="cursor-pointer"
                onClick={() => (window.location.hash = "#/projects")}
              >
                <img
                  src={GRADION_LOGO_BASE64}
                  alt="GRADION Logo"
                  className="h-7 w-auto object-contain"
                />
              </div>
            </div>

            {/* Right side Profile & Logout */}
            <div className="flex items-center gap-4">
              {user && (
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-stone-800">
                    {user.name}
                  </p>
                  <p className="text-xs text-stone-400">{user.email}</p>
                </div>
              )}

              {user && (
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-300 flex items-center justify-center text-white font-bold text-sm shadow-sm hidden sm:flex">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </div>
              )}

              <button
                onClick={() => logoutFn()}
                className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600 transition hover:bg-orange-100 hover:border-orange-300 hover:text-orange-700"
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
