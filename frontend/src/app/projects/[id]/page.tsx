"use client";

import React, { useEffect, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import {
  getProject,
  runStep,
  resetStep,
  Project,
} from "../../../lib/projects.api";
import { useAuth } from "../../../providers/AuthProvider";
import Header from "../../../components/Header";

export default function ProjectDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [wsError, setWsError] = useState<string | null>(null);
  const [localRunningTime, setLocalRunningTime] = useState<number>(0);
  const [customStyle, setCustomStyle] = useState<string>("");
  const [isStyleSubmitting, setIsStyleSubmitting] = useState<boolean>(false);
  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial State Fetch with TanStack Query (refetch on mount, staleTime 30s)
  const {
    data: project,
    isLoading,
    error,
  } = useQuery<Project>({
    queryKey: ["project", id],
    queryFn: () => getProject(id),
    enabled: !!id,
    refetchOnMount: true,
    staleTime: 30_000,
  });

  // Calculate if the project step is running and manage a local timer for Force Retry
  const isRunning = project?.stepState === "running";

  useEffect(() => {
    if (isRunning) {
      // Calculate how long it has been running using stuckAt (if provided)
      let initialSeconds = 0;
      if (project?.stuckAt) {
        initialSeconds = Math.max(
          0,
          Math.floor((Date.now() - new Date(project.stuckAt).getTime()) / 1000),
        );
      }
      setTimeout(() => {
        setLocalRunningTime(initialSeconds);
      }, 0);

      timerRef.current = setInterval(() => {
        setLocalRunningTime((prev) => prev + 1);
      }, 1000);
    } else {
      setTimeout(() => {
        setLocalRunningTime(0);
      }, 0);
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, project?.stuckAt]);

  // 2. Real-time WebSocket connection
  useEffect(() => {
    if (!id || !user) return;

    const token = user.token || localStorage.getItem("token") || "";
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

    // Connect with token and projectId query params
    const socket = io(apiUrl, {
      query: { token, projectId: id },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setWsError(null);
      console.log("WS: Connected to server");
    });

    socket.on("connect_error", (err) => {
      console.error("WS Connection error:", err.message);
      setWsError("Real-time connection failed. Updates might be delayed.");
    });

    // Handle real-time pipeline events
    socket.on(
      "message",
      (event: {
        type: string;
        project?: Project;
        step?: number;
        itemId?: string;
        imageUrl?: string;
      }) => {
        console.log("WS Message received:", event);

        if (event.type === "state:sync") {
          // Full project sync on load or reconnect
          queryClient.setQueryData(["project", id], event.project);
        } else if (event.type === "step:start") {
          queryClient.setQueryData(
            ["project", id],
            (prev: Project | undefined) => {
              if (!prev) return prev;
              return {
                ...prev,
                stepState: "running",
                stuckAt: new Date().toISOString(),
                errorMessage: null,
              };
            },
          );
        } else if (event.type === "item:done") {
          // Per-item reveal: patch portraits or illustrations arrays in cache immediately
          queryClient.setQueryData(
            ["project", id],
            (prev: Project | undefined) => {
              if (!prev) return prev;

              if (event.step === 3) {
                const portraits = [...prev.portraits];
                const idx = portraits.findIndex(
                  (p) => p.characterId === event.itemId,
                );
                const newItem = {
                  characterId: event.itemId || "",
                  localPath: event.imageUrl || "",
                  geminiFileUri: "",
                };
                if (idx > -1) portraits[idx] = newItem;
                else portraits.push(newItem);

                return { ...prev, portraits };
              } else if (event.step === 5) {
                const illustrations = [...prev.illustrations];
                const idx = illustrations.findIndex(
                  (i) => i.chapterId === event.itemId,
                );
                const newItem = {
                  chapterId: event.itemId || "",
                  localPath: event.imageUrl || "",
                };
                if (idx > -1) illustrations[idx] = newItem;
                else illustrations.push(newItem);

                return { ...prev, illustrations };
              }
              return prev;
            },
          );
        } else if (event.type === "step:done" || event.type === "step:failed") {
          // Refetch project details fully to ensure we are aligned with DB status
          queryClient.invalidateQueries({ queryKey: ["project", id] });
          queryClient.invalidateQueries({ queryKey: ["projects"] });
        }
      },
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [id, queryClient, user]);

  const getStepName = (step: number) => {
    const steps = [
      "Upload Book",
      "Analyze Style",
      "Generate Characters",
      "Generate Portraits",
      "Extract Chapters",
      "Generate Illustrations",
    ];
    return steps[step] || "Unknown";
  };

  const handleRunNextStep = async () => {
    if (!project) return;
    setIsStyleSubmitting(true);
    try {
      const stylePayload =
        project.currentStep === 0 && customStyle.trim()
          ? customStyle.trim()
          : undefined;
      await runStep(id, { style: stylePayload });
      // WS starts automatically, local query state gets patched on 'step:start'
    } catch (err) {
      const errorResponse = err as {
        response?: { data?: { message?: string } };
      };
      alert(
        errorResponse.response?.data?.message ||
          "Failed to trigger step execution.",
      );
    } finally {
      setIsStyleSubmitting(false);
    }
  };

  const handleResetStep = async () => {
    try {
      await resetStep(id);
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    } catch (err) {
      const errorResponse = err as {
        response?: { data?: { message?: string } };
      };
      alert(errorResponse.response?.data?.message || "Failed to reset step.");
    }
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
          <h2 className="text-xl font-bold text-red-400 mb-2">
            Error Loading Project
          </h2>
          <p className="text-zinc-400 text-sm mb-6">
            {error instanceof Error
              ? error.message
              : "The project you are looking for does not exist."}
          </p>
          <button
            onClick={() => router.push("/")}
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold hover:bg-violet-500 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Next step calculation
  const isFinished = project.currentStep >= 5;

  // Show stuck force-retry button after 60s
  const showForceRetry = isRunning && localRunningTime >= 60;

  return (
    <Header>
      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Back Button */}
        <div className="flex justify-start">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Dashboard
          </button>
        </div>

        {wsError && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-500 rounded-xl">
            {wsError}
          </div>
        )}

        <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md relative overflow-hidden shadow-xl">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-violet-600/5 blur-3xl" />

          {/* Project Header Info */}
          <div className="border-b border-zinc-800/60 pb-6 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-400 mb-2">
                Pipeline Control
              </span>
              <div className="flex items-center gap-3 flex-wrap mt-2">
                <h1 className="text-3xl font-extrabold tracking-tight">
                  {project.title}
                </h1>
                {project.status === "Done" ? (
                  <span className="inline-flex items-center rounded-full bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 text-xs font-semibold text-green-400">
                    Done
                  </span>
                ) : project.status === "In Progress" ? (
                  <span className="inline-flex items-center rounded-full bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 text-xs font-semibold text-violet-400">
                    In Progress
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-zinc-800 border border-zinc-700 px-2.5 py-0.5 text-xs font-semibold text-zinc-400">
                    Draft
                  </span>
                )}
              </div>
              <p className="text-zinc-500 text-xs mt-1.5">
                Project ID: {project.id}
              </p>
            </div>
          </div>

          {/* Progress / Pipeline Steps */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Pipeline Progress</h2>

            <div className="relative flex items-start justify-between w-full overflow-x-auto pb-4">
              {[1, 2, 3, 4, 5].map((stepNum, idx) => {
                const isCompleted = project.currentStep >= stepNum;
                const isCurrent = project.currentStep === stepNum - 1;
                const isPending = project.currentStep < stepNum - 1;

                return (
                  <div
                    key={stepNum}
                    className="flex-1 flex flex-col items-center relative text-center min-w-[90px] sm:min-w-[120px]"
                  >
                    {idx < 4 && (
                      <div
                        className={`absolute left-[50%] right-[-50%] top-[18px] h-[2px] transition-colors ${
                          isCompleted ? "bg-violet-600" : "bg-zinc-800"
                        }`}
                      />
                    )}

                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center border font-bold text-sm shrink-0 transition z-10 ${
                        isCompleted
                          ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-600/30"
                          : isCurrent
                            ? "bg-zinc-950 border-violet-500 text-violet-400 shadow-lg shadow-violet-500/10 animate-pulse"
                            : "bg-zinc-950 border-zinc-800 text-zinc-600"
                      }`}
                    >
                      {isCompleted ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
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

                    <div className="mt-2.5 px-1">
                      <h3
                        className={`font-semibold text-xs md:text-sm transition-colors break-words max-w-[85px] sm:max-w-[120px] ${
                          isCurrent
                            ? "text-violet-400 font-bold"
                            : isPending
                              ? "text-zinc-600"
                              : "text-zinc-300"
                        }`}
                      >
                        {getStepName(stepNum)}
                      </h3>
                      {isCurrent && project.stepState === "running" && (
                        <span className="text-[10px] text-yellow-500 block animate-pulse mt-0.5">
                          Running...
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Button Section */}
          <div className="mt-12 pt-6 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              {project.stepState === "failed" && (
                <div className="text-red-400 text-sm flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                    Execution Failed
                  </span>
                  <span className="text-xs text-zinc-400 max-w-md">
                    {project.errorMessage}
                  </span>
                </div>
              )}
              {project.stepState === "running" && (
                <span className="text-yellow-500 text-sm flex items-center gap-2 font-medium">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent" />
                  Running Step {project.currentStep + 1} ({localRunningTime}s
                  elapsed)
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              {/* Optional Custom Style Input on Step 1 (Upload book step is step 0, style is step 1) */}
              {project.currentStep === 0 && project.stepState === "idle" && (
                <div className="flex flex-col gap-1.5 mr-2">
                  <input
                    type="text"
                    placeholder="Custom Art Style (optional)..."
                    value={customStyle}
                    onChange={(e) => setCustomStyle(e.target.value)}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs placeholder-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                    disabled={isStyleSubmitting}
                  />
                </div>
              )}

              {/* Force Retry / Reset Step button */}
              {(project.stepState === "failed" || showForceRetry) && (
                <button
                  onClick={handleResetStep}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-5 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 shadow-lg shadow-red-500/5"
                >
                  Force Stop & Retry
                </button>
              )}

              {!isFinished ? (
                <button
                  onClick={handleRunNextStep}
                  disabled={
                    project.stepState === "running" || isStyleSubmitting
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-600/10"
                >
                  {isStyleSubmitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Triggering...
                    </>
                  ) : (
                    `Run Step ${project.currentStep + 1}: ${getStepName(project.currentStep + 1)}`
                  )}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-green-500/10 border border-green-500/20 px-6 py-2.5 text-sm font-semibold text-green-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4.5 w-4.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Pipeline Completed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bento Grid layout for Pipeline Step Results */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Section: Art Style Analysis */}
          {(project.currentStep >= 1 ||
            (project.currentStep === 0 && project.stepState === "running")) && (
            <div className="bg-zinc-900/20 border border-zinc-800/80 rounded-2xl p-6 space-y-3 relative overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-md text-zinc-300">
                  1. Art Style
                </h3>
                {project.currentStep >= 1 ? (
                  <span className="text-[10px] uppercase font-semibold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
                    Completed
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-semibold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full animate-pulse">
                    Running
                  </span>
                )}
              </div>
              {project.style ? (
                <p className="text-sm text-zinc-400 italic bg-zinc-950/40 p-4 border border-zinc-800/40 rounded-xl leading-relaxed">
                  &ldquo;{project.style}&rdquo;
                </p>
              ) : (
                <div className="flex flex-col items-center justify-center p-4 space-y-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                  <p className="text-xs text-zinc-500 italic">
                    Analyzing style from text...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Section: Extracted Characters */}
          {(project.currentStep >= 2 ||
            (project.currentStep === 1 && project.stepState === "running")) && (
            <div className="bg-zinc-900/20 border border-zinc-800/80 rounded-2xl p-6 space-y-3 relative overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-md text-zinc-300">
                  2. Characters Identities
                </h3>
                {project.currentStep >= 2 ? (
                  <span className="text-[10px] uppercase font-semibold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
                    Completed
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-semibold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full animate-pulse">
                    Running
                  </span>
                )}
              </div>

              {project.characters && project.characters.length > 0 ? (
                <div className="space-y-3">
                  {project.characters.map((char) => (
                    <div
                      key={char.id}
                      className="p-3 bg-zinc-950/30 border border-zinc-800/40 rounded-xl space-y-1"
                    >
                      <span className="font-bold text-sm text-zinc-200 block">
                        {char.name}
                      </span>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        {char.prompt}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 space-y-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                  <p className="text-xs text-zinc-500 italic">
                    Identifying characters...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Section: Character Portraits */}
          {(project.currentStep >= 3 ||
            (project.currentStep === 2 && project.stepState === "running")) && (
            <div className="bg-zinc-900/20 border border-zinc-800/80 rounded-2xl p-6 space-y-3 md:col-span-2 transition-all duration-500 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-md text-zinc-300">
                  3. Character Portraits
                </h3>
                {project.currentStep >= 3 ? (
                  <span className="text-[10px] uppercase font-semibold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
                    Completed
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-semibold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full animate-pulse">
                    Running
                  </span>
                )}
              </div>

              {project.characters && project.characters.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {project.characters.map((char) => {
                    const portrait = project.portraits.find(
                      (p) => p.characterId === char.id,
                    );
                    const isImageLoading =
                      project.stepState === "running" &&
                      project.currentStep === 2 &&
                      !portrait;

                    return (
                      <div
                        key={char.id}
                        className="flex gap-4 p-4 bg-zinc-950/40 border border-zinc-800/50 rounded-2xl items-center"
                      >
                        <div className="h-24 w-24 rounded-xl border border-zinc-800 bg-zinc-950 shrink-0 overflow-hidden relative flex items-center justify-center">
                          {portrait ? (
                            <img
                              src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}${portrait.localPath}`}
                              alt={char.name}
                              className="h-full w-full object-cover transition duration-300 hover:scale-105"
                            />
                          ) : isImageLoading ? (
                            <div className="flex flex-col items-center justify-center space-y-2">
                              <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                              <span className="text-[9px] text-zinc-500">
                                Generating...
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-700">
                              Pending
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <span className="text-sm font-bold text-zinc-200">
                            {char.name}
                          </span>
                          <p className="text-xs text-zinc-500 line-clamp-3">
                            {char.prompt}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-zinc-650 italic">
                  Portraits generation starting...
                </p>
              )}
            </div>
          )}

          {/* Section: Extracted Chapters */}
          {(project.currentStep >= 4 ||
            (project.currentStep === 3 && project.stepState === "running")) && (
            <div className="bg-zinc-900/20 border border-zinc-800/80 rounded-2xl p-6 space-y-3 relative overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-md text-zinc-300">
                  4. Scene Prompts
                </h3>
                {project.currentStep >= 4 ? (
                  <span className="text-[10px] uppercase font-semibold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
                    Completed
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-semibold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full animate-pulse">
                    Running
                  </span>
                )}
              </div>

              {project.chapters && project.chapters.length > 0 ? (
                <div className="space-y-3">
                  {project.chapters.map((chap) => (
                    <div
                      key={chap.id}
                      className="p-3 bg-zinc-950/30 border border-zinc-800/40 rounded-xl space-y-1"
                    >
                      <span className="font-bold text-sm text-zinc-200 block">
                        {chap.name}
                      </span>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        {chap.prompt}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 space-y-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                  <p className="text-xs text-zinc-500 italic">
                    Extracting scene prompts...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Section: Illustrations */}
          {(project.currentStep >= 5 ||
            (project.currentStep === 4 && project.stepState === "running")) && (
            <div className="bg-zinc-900/20 border border-zinc-800/80 rounded-2xl p-6 space-y-3 relative overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-md text-zinc-300">
                  5. Scene Illustrations
                </h3>
                {project.currentStep >= 5 ? (
                  <span className="text-[10px] uppercase font-semibold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
                    Completed
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-semibold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full animate-pulse">
                    Running
                  </span>
                )}
              </div>

              {project.chapters && project.chapters.length > 0 ? (
                <div className="space-y-4">
                  {project.chapters.map((chap) => {
                    const illustration = project.illustrations.find(
                      (i) => i.chapterId === chap.id,
                    );
                    const isImageLoading =
                      project.stepState === "running" &&
                      project.currentStep === 4 &&
                      !illustration;

                    return (
                      <div key={chap.id} className="space-y-3">
                        <div className="aspect-video w-full rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden relative flex items-center justify-center">
                          {illustration ? (
                            <img
                              src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}${illustration.localPath}`}
                              alt={chap.name}
                              className="h-full w-full object-cover transition duration-300 hover:scale-[1.02]"
                            />
                          ) : isImageLoading ? (
                            <div className="flex flex-col items-center justify-center space-y-2">
                              <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                              <span className="text-xs text-zinc-500">
                                Generating Illustration...
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-700">
                              Not generated yet
                            </span>
                          )}
                        </div>
                        <div className="p-3 bg-zinc-950/30 border border-zinc-800/40 rounded-xl space-y-1">
                          <span className="text-xs font-bold text-zinc-400">
                            Scene Name
                          </span>
                          <span className="font-bold text-sm text-zinc-200 block">
                            {chap.name}
                          </span>
                          <p className="text-xs text-zinc-500 leading-relaxed mt-1">
                            {chap.prompt}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-zinc-655 italic">
                  Scene illustration generation starting...
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </Header>
  );
}
