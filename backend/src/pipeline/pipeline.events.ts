// WebSocket event types for real-time pipeline progress

export interface WsStepStartEvent {
  type: 'step:start';
  step: number;
  stepName: string;
  totalItems?: number;
}

export interface WsItemDoneEvent {
  type: 'item:done';
  step: number;
  itemId: string;
  imageUrl: string;
}

export interface WsStepDoneEvent {
  type: 'step:done';
  step: number;
  stepName: string;
}

export interface WsStepFailedEvent {
  type: 'step:failed';
  step: number;
  stepName: string;
  error: string;
}

export interface WsStateSyncEvent {
  type: 'state:sync';
  project: object;
}

export type PipelineWsEvent =
  | WsStepStartEvent
  | WsItemDoneEvent
  | WsStepDoneEvent
  | WsStepFailedEvent
  | WsStateSyncEvent;

export const STEP_NAMES: Record<number, string> = {
  0: 'Upload Book',
  1: 'Generate Style',
  2: 'Extract Characters',
  3: 'Generate Portraits',
  4: 'Generate Chapter Prompts',
  5: 'Generate Illustrations',
};
