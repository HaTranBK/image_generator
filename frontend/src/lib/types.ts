// Shared frontend types matching backend models
export interface Character {
  id: string;
  name: string;
  prompt: string;
}

export interface Portrait {
  characterId: string;
  localPath: string;
  geminiFileUri: string;
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
