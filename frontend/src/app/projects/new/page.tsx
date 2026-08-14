"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "../../../lib/projects.api";
import NewProjectView from "@/components/pages/newProject";

export default function NewProjectPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | undefined>(
    undefined,
  );

  const handleSubmit = async (data: {
    title: string;
    style?: string;
    bookText: string;
    file: File | null;
  }) => {
    setIsSubmitting(true);
    setGeneralError(undefined);

    try {
      let payload:
        FormData | { title: string; style?: string; bookText: string };
      if (data.file) {
        payload = new FormData();
        payload.append("title", data.title);
        if (data.style) {
          payload.append("style", data.style);
        }
        payload.append("file", data.file);
      } else {
        payload = {
          title: data.title,
          style: data.style,
          bookText: data.bookText,
        };
      }

      const project = await createProject(payload);
      router.push(`/projects/${project.id}`);
    } catch (err) {
      console.error(err);
      const errorResponse = err as {
        response?: { data?: { message?: string } };
      };
      setGeneralError(
        errorResponse.response?.data?.message ||
          "Failed to create project. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <NewProjectView
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      generalError={generalError}
      onCancel={() => router.push("/")}
    />
  );
}
