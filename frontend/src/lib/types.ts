// Shared frontend types matching backend models

/** Standard API response envelope from backend */
export interface BaseResponse<T> {
  code: number;
  message: string;
  payload: T;
}
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
