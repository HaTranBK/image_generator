// Shared TypeScript interfaces for the Book Illustration AI project

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface Character {
  id: string;
  name: string;
  prompt: string;
}

export interface Portrait {
  characterId: string;
  localPath: string; // relative path under /uploads/
  geminiFileUri: string; // uploaded to Gemini File API for step 5 input
}

export interface Chapter {
  id: string;
  name: string;
  prompt: string;
}

export interface Illustration {
  chapterId: string;
  localPath: string;
}

export type StepState = 'idle' | 'running' | 'failed';
export type CurrentStep = 0 | 1 | 2 | 3 | 4 | 5;

export interface Project {
  id: string;
  userId: string;
  title: string;

  // Book storage
  bookText: string;
  bookFilePath: string;

  // Gemini context (persist all 5 IDs)
  bookFileUri: string | null;
  bookInteractionId: string | null;
  styleInteractionId: string | null;
  charactersInteractionId: string | null;
  chaptersInteractionId: string | null; // persisted but NOT used as previousInteractionId for image chain

  // Step results
  style: string | null;
  characters: Character[];
  chapters: Chapter[];
  portraits: Portrait[];
  illustrations: Illustration[];

  // State machine
  currentStep: CurrentStep;
  stepState: StepState;
  stuckAt: Date | null;
  errorMessage: string | null;

  // Meta
  createdAt: Date;
  updatedAt: Date;
}

export interface JwtPayload {
  sub: string; // user id
  email: string;
}
