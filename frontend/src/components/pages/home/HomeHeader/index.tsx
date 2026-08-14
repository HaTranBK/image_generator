"use client";

import React from "react";

interface HomeHeaderProps {
  onNewProject: () => void;
}

export default function HomeHeader({ onNewProject }: HomeHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-stone-900">
          Your Projects
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Manage and resume your book illustration pipelines
        </p>
      </div>

      <button
        onClick={onNewProject}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-300/40 transition hover:from-orange-600 hover:to-amber-600 hover:shadow-orange-400/50 hover:-translate-y-0.5"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
            clipRule="evenodd"
          />
        </svg>
        New Project
      </button>
    </div>
  );
}
