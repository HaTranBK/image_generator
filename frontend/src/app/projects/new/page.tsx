'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProject } from '../../../lib/projects.api';

const PRESET_STYLES = ['Anime', 'Realistic', 'Cartoon', 'Oil Painting'];

export default function NewProjectPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [stylePreference, setStylePreference] = useState('Anime');
  const [customStyle, setCustomStyle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  
  // Validation errors
  const [errors, setErrors] = useState<{ title?: string; file?: string; general?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const validateFile = (selectedFile: File): boolean => {
    setErrors((prev) => ({ ...prev, file: undefined }));
    if (!selectedFile.name.endsWith('.txt')) {
      setErrors((prev) => ({ ...prev, file: 'Only .txt files are allowed' }));
      setFile(null);
      return false;
    }
    setFile(selectedFile);
    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { title?: string; file?: string } = {};
    
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!file) {
      newErrors.file = 'Book file is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      
      const finalStyle = stylePreference === 'Custom' ? customStyle.trim() : stylePreference;
      if (finalStyle) {
        formData.append('style', finalStyle);
      }
      
      formData.append('file', file);

      const project = await createProject(formData);
      router.push(`/projects/${project.id}`);
    } catch (err: any) {
      console.error(err);
      setErrors({
        general: err.response?.data?.message || 'Failed to create project. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-violet-600/5 blur-3xl" />

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              Create New Project
            </h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              Upload your book and configure the illustration style.
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-2.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {errors.general && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Title */}
          <div>
            <label htmlFor="title-input" className="block text-sm font-semibold text-zinc-300 mb-2">
              Project Title
            </label>
            <input
              id="title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., The Wind in the Willows"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-sm placeholder-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
              disabled={isSubmitting}
            />
            {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title}</p>}
          </div>

          {/* Style Preference */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="style-select" className="block text-sm font-semibold text-zinc-300 mb-2">
                Art Style Preference
              </label>
              <select
                id="style-select"
                value={stylePreference}
                onChange={(e) => setStylePreference(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition text-zinc-200"
                disabled={isSubmitting}
              >
                {PRESET_STYLES.map((style) => (
                  <option key={style} value={style} className="bg-zinc-950">
                    {style}
                  </option>
                ))}
                <option value="Custom" className="bg-zinc-950">
                  Custom Style...
                </option>
              </select>
            </div>

            {stylePreference === 'Custom' && (
              <div>
                <label htmlFor="custom-style-input" className="block text-sm font-semibold text-zinc-300 mb-2">
                  Custom Art Style
                </label>
                <input
                  id="custom-style-input"
                  type="text"
                  value={customStyle}
                  onChange={(e) => setCustomStyle(e.target.value)}
                  placeholder="e.g., Watercolor, Cyberpunk, Pencil Sketch"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-sm placeholder-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                  disabled={isSubmitting}
                />
              </div>
            )}
          </div>

          {/* File Upload Zone */}
          <div>
            <span className="block text-sm font-semibold text-zinc-300 mb-2">Book File (.txt)</span>
            <div
              data-testid="file-dropzone"
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`relative border border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${
                isDragActive
                  ? 'border-violet-500 bg-violet-600/5'
                  : file
                  ? 'border-zinc-700 bg-zinc-950/20'
                  : 'border-zinc-800 bg-zinc-950/30 hover:border-zinc-700'
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
                className={`h-10 w-10 mb-3 transition-colors ${
                  file ? 'text-violet-400' : 'text-zinc-500'
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
                  <p className="text-sm font-semibold text-zinc-200">{file.name}</p>
                  <p className="text-xs text-zinc-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-300">
                    <span className="text-violet-400 font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">Only .txt files up to 10MB allowed</p>
                </div>
              )}
            </div>
            {errors.file && <p className="mt-1.5 text-xs text-red-400">{errors.file}</p>}
          </div>

          {/* Form Actions */}
          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-850 hover:text-white"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 shadow-lg shadow-violet-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
