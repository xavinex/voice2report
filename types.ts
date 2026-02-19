
export type AppState = 'idle' | 'recording' | 'transcribing' | 'ready' | 'generating' | 'error';

export interface ReportSection {
  title: string;
  content: string;
  items?: string[];
}

export interface StructuredReport {
  title: string;
  date: string;
  sections: ReportSection[];
}

export enum ReportType {
  BUSINESS = 'BUSINESS',
  MEETING = 'MEETING',
  NOTES = 'NOTES'
}

export interface SpeechServiceOptions {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (error: string) => void;
  onStateChange: (state: boolean) => void;
}
