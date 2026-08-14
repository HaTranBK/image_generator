"use client";

import React from "react";
import NewProjectForm from "./NewProjectForm";

interface NewProjectViewProps {
  onSubmit: (data: {
    title: string;
    style?: string;
    bookText: string;
    file: File | null;
  }) => void;
  isSubmitting: boolean;
  generalError?: string;
  onCancel: () => void;
}

export default function NewProjectView({
  onSubmit,
  isSubmitting,
  generalError,
  onCancel,
}: NewProjectViewProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50/30 to-white text-stone-800 font-sans flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-orange-200/25 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-amber-200/20 blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl bg-white border border-orange-100 rounded-3xl p-8 shadow-xl shadow-orange-100/50 relative overflow-hidden z-10">
        {/* Top accent gradient bar */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-gradient-to-r from-orange-500 via-amber-400 to-orange-400" />

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-stone-900">
              Create New Project
            </h1>
            <p className="mt-1.5 text-sm text-stone-400">
              Provide book text via upload or direct pasting, then set
              illustration style.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-stone-400 transition hover:bg-orange-50 hover:text-orange-500 hover:border-orange-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {generalError && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
            {generalError}
          </div>
        )}

        <NewProjectForm
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          generalError={generalError}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
}
