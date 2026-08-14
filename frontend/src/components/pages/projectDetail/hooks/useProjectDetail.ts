"use client";

import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { Project, runStep, resetStep } from "@/lib/projects.api";

import { AuthUser } from "@/lib/auth.api";

interface UseProjectDetailProps {
  id: string;
  project: Project | undefined;
  user: AuthUser | null;
}

export function useProjectDetail({ id, project, user }: UseProjectDetailProps) {
  const queryClient = useQueryClient();
  const [wsError, setWsError] = useState<string | null>(null);
  const [localRunningTime, setLocalRunningTime] = useState<number>(0);
  const [customStyle, setCustomStyle] = useState<string>("");
  const [isStyleSubmitting, setIsStyleSubmitting] = useState<boolean>(false);
  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isRunning = project?.stepState === "running";

  // Manage Local Timer
  useEffect(() => {
    if (isRunning) {
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

  // Real-time WebSocket connection
  useEffect(() => {
    if (!id || !user) return;

    const token = user.token || localStorage.getItem("token") || "";
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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

  const handleRunNextStep = async () => {
    if (!project) return;
    setIsStyleSubmitting(true);
    try {
      const stylePayload =
        project.currentStep === 0 && customStyle.trim()
          ? customStyle.trim()
          : undefined;
      await runStep(id, { style: stylePayload });
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

  return {
    wsError,
    localRunningTime,
    customStyle,
    setCustomStyle,
    isStyleSubmitting,
    isRunning,
    handleRunNextStep,
    handleResetStep,
  };
}
