export enum ProcessingStatus {
  IDLE = 'IDLE',
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface ImageFile {
  id: string;
  file: File;
  previewUrl: string;
  status: ProcessingStatus;
  
  // Dual Image Support
  secondaryFile?: File;
  secondaryPreviewUrl?: string;

  resultUrl?: string;
  resultBlob?: Blob;
  error?: string;
  retryTimestamp?: number; // Kept for legacy compatibility if needed, but primary sort is now lastActivityTimestamp
  
  // New fields for requested features
  customPrompt?: string;       // Individual prompt override
  isRetry?: boolean;           // To track if the result is a retry (for blue badge)
  lastActivityTimestamp: number; // To handle "Recent Activity" sorting
}

// Global declaration for the libraries loaded via CDN in index.html
declare global {
  interface Window {
    JSZip: any;
    saveAs: any;
    // aistudio is already defined in the global scope with type AIStudio
  }
}