'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { getProject } from '../../../lib/projects.api';

export default function ProjectDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id),
    enabled: !!id,
  });

  const getStepName = (step: number) => {
    const steps = [
      'Upload Book',
      'Analyze Style',
      'Generate Characters',
      'Generate Portraits',
      'Extract Chapters',
      'Generate Illustrations',
    ];
    return steps[step] || 'Unknown';
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center shadow-xl">
          <h2 className="text-xl font-bold text-red-400 mb-2">Error Loading Project</h2>
          <p className="text-zinc-400 text-sm mb-6">
            {error instanceof Error ? error.message : 'The project you are looking for does not exist.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold hover:bg-violet-500 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      {/* Header / Navbar */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Dashboard
            </button>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-violet-400 to-fuchsia-500 bg-clip-text text-transparent">
              Project Pipeline
            </span>
            <div className="w-24" /> {/* Spacer */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-8 backdrop-blur-md relative overflow-hidden shadow-xl">
          {/* Accent glow */}
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-violet-600/5 blur-3xl" />

          {/* Project Header Info */}
          <div className="border-b border-zinc-800/60 pb-6 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-400 mb-2">
                Project Detail
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight">{project.title}</h1>
              <p className="text-zinc-500 text-xs mt-1">
                Created: {new Date(project.createdAt).toLocaleString()} | ID: {project.id}
              </p>
            </div>
            
            <div className="flex flex-col items-start md:items-end">
              <span className="text-xs text-zinc-500">Style Preference</span>
              <span className="text-lg font-bold text-zinc-200">{project.style || 'None Specified'}</span>
            </div>
          </div>

          {/* Progress / Pipeline Steps */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Pipeline Progress</h2>
            
            <div className="relative flex items-start justify-between w-full">
              {[1, 2, 3, 4, 5].map((stepNum, idx) => {
                const isCompleted = project.currentStep > stepNum;
                const isCurrent = project.currentStep === stepNum;
                const isPending = project.currentStep < stepNum;
                
                return (
                  <div key={stepNum} className="flex-1 flex flex-col items-center relative text-center min-w-[70px] sm:min-w-[90px]">
                    {/* Line Connector behind circle */}
                    {idx < 4 && (
                      <div
                        className={`absolute left-[50%] right-[-50%] top-[18px] h-[2px] transition-colors ${
                          isCompleted ? 'bg-violet-600' : 'bg-zinc-800'
                        }`}
                      />
                    )}
                    
                    {/* Step Indicator Ball */}
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center border font-bold text-sm shrink-0 transition z-10 ${
                        isCompleted
                          ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-600/30'
                          : isCurrent
                          ? 'bg-zinc-950 border-violet-500 text-violet-400 shadow-lg shadow-violet-500/10'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-600'
                      }`}
                    >
                      {isCompleted ? (
                        <svg
                          xmlns="http://www.w3.org/2005/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        stepNum
                      )}
                    </div>

                    {/* Step Details */}
                    <div className="mt-2.5 px-1">
                      <h3
                        className={`font-semibold text-xs md:text-sm transition-colors break-words max-w-[80px] sm:max-w-[120px] ${
                          isCurrent ? 'text-violet-400 font-bold' : isPending ? 'text-zinc-600' : 'text-zinc-300'
                        }`}
                      >
                        {getStepName(stepNum)}
                      </h3>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Button Section */}
          <div className="mt-12 pt-6 border-t border-zinc-850 flex items-center justify-between">
            <div>
              {project.stepState === 'failed' && (
                <span className="text-red-400 text-xs flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Execution Failed
                </span>
              )}
              {project.stepState === 'running' && (
                <span className="text-yellow-500 text-xs flex items-center gap-1.5 animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                  Running Pipeline Step
                </span>
              )}
            </div>

            <button
              onClick={() => {
                // This is a placeholder for resuming the next steps in the pipeline
                alert(`Running Next Step: ${getStepName(project.currentStep)}`);
              }}
              disabled={project.stepState === 'running' || project.currentStep > 5}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-600/10"
            >
              {project.currentStep > 5 ? 'Pipeline Completed' : `Run ${getStepName(project.currentStep)}`}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
