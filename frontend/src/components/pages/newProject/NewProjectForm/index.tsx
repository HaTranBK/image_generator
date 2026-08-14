"use client";

import React, { useState } from "react";

const PRESET_STYLES = ["Anime", "Realistic", "Cartoon", "Oil Painting"];

interface NewProjectFormProps {
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

export default function NewProjectForm({
  onSubmit,
  isSubmitting,
  generalError,
  onCancel,
}: NewProjectFormProps) {
  const [title, setTitle] = useState("");
  const [stylePreference, setStylePreference] = useState("Anime");
  const [customStyle, setCustomStyle] = useState("");
  const [bookText, setBookText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [errors, setErrors] = useState<{
    title?: string;
    file?: string;
    bookText?: string;
  }>({});
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleFileContent = (selectedFile: File) => {
    setErrors((prev) => ({ ...prev, file: undefined }));
    if (!selectedFile.name.endsWith(".txt")) {
      setErrors((prev) => ({ ...prev, file: "Only .txt files are allowed" }));
      setFile(null);
      return;
    }
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setBookText(text);
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileContent(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileContent(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { title?: string; bookText?: string } = {};

    if (!title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!bookText.trim() && !file) {
      newErrors.bookText = "Book file is required (paste it or upload a file)";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const finalStyle =
      stylePreference === "Custom" ? customStyle.trim() : stylePreference;

    onSubmit({
      title: title.trim(),
      style: finalStyle || undefined,
      bookText: bookText.trim(),
      file,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Project Title */}
      <div>
        <label
          htmlFor="title-input"
          className="block text-sm font-semibold text-stone-700 mb-2"
        >
          Project Title
        </label>
        <input
          id="title-input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., The Wind in the Willows"
          className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder-stone-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20 focus:bg-white transition"
          disabled={isSubmitting}
        />
        {errors.title && (
          <p className="mt-1 text-xs text-red-500">{errors.title}</p>
        )}
      </div>

      {/* Style Preference */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="style-select"
            className="block text-sm font-semibold text-stone-700 mb-2"
          >
            Art Style Preference
          </label>
          <select
            id="style-select"
            value={stylePreference}
            onChange={(e) => setStylePreference(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-800 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20 focus:bg-white transition"
            disabled={isSubmitting}
          >
            {PRESET_STYLES.map((style) => (
              <option key={style} value={style} className="bg-white">
                {style}
              </option>
            ))}
            <option value="Custom" className="bg-white">
              Custom Style...
            </option>
          </select>
        </div>

        {stylePreference === "Custom" && (
          <div>
            <label
              htmlFor="custom-style-input"
              className="block text-sm font-semibold text-stone-700 mb-2"
            >
              Custom Art Style
            </label>
            <input
              id="custom-style-input"
              type="text"
              value={customStyle}
              onChange={(e) => setCustomStyle(e.target.value)}
              placeholder="e.g., Watercolor, Cyberpunk, Pencil Sketch"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder-stone-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20 focus:bg-white transition"
              disabled={isSubmitting}
            />
          </div>
        )}
      </div>

      {/* Book Text Field with both drag&drop and direct paste */}
      <div>
        <span className="block text-sm font-semibold text-stone-700 mb-2">
          Book text
        </span>

        {/* File Upload Zone */}
        <div
          data-testid="file-dropzone"
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center transition-all ${
            isDragActive
              ? "border-orange-400 bg-orange-50"
              : file
                ? "border-green-300 bg-green-50/50"
                : "border-stone-200 bg-stone-50 hover:border-orange-300 hover:bg-orange-50/30"
          }`}
        >
          <input
            id="file-upload-input"
            data-testid="file-input"
            type="file"
            accept=".txt"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isSubmitting}
          />

          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-8 w-8 mb-2 transition-colors ${
              file
                ? "text-green-500"
                : isDragActive
                  ? "text-orange-500"
                  : "text-stone-400"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>

          {file ? (
            <div className="text-center">
              <p className="text-sm font-bold text-green-600">
                ✓ <span>{file.name}</span> loaded
              </p>
              <p className="text-xs text-stone-400 mt-0.5">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm font-medium text-stone-600">
                <span className="text-orange-500 font-bold">
                  Click to choose a .txt file
                </span>{" "}
                or drag & drop
              </p>
              <p className="text-xs text-stone-400 mt-1">
                Plain text only · used once as context for every step
              </p>
            </div>
          )}
        </div>

        {errors.file && (
          <p className="mt-1.5 text-xs text-red-500">{errors.file}</p>
        )}

        <div className="flex items-center my-4 text-xs text-stone-400 uppercase tracking-widest before:flex-1 before:border-t before:border-stone-200 before:mr-3 after:flex-1 after:border-t after:border-stone-200 after:ml-3">
          or paste text
        </div>

        {/* Paste text area */}
        <textarea
          id="book-textarea"
          rows={6}
          value={bookText}
          onChange={(e) => {
            setBookText(e.target.value);
            setErrors((prev) => ({ ...prev, bookText: undefined }));
          }}
          placeholder="Once upon a time, in a small burrow by the river..."
          className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder-stone-400 focus:border-orange-400/20 focus:outline-none focus:ring-2 focus:ring-orange-400/20 focus:bg-white transition resize-y"
          disabled={isSubmitting}
        />

        {errors.bookText && (
          <p className="mt-1.5 text-xs text-red-500">{errors.bookText}</p>
        )}
      </div>

      {/* Form Actions */}
      <div className="pt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-stone-200 bg-stone-50 px-5 py-2.5 text-sm font-semibold text-stone-600 transition hover:bg-stone-100 hover:text-stone-800"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-300/40 transition hover:from-orange-600 hover:to-amber-600 hover:shadow-orange-400/50 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Creating...
            </>
          ) : (
            "Create Project →"
          )}
        </button>
      </div>
    </form>
  );
}
