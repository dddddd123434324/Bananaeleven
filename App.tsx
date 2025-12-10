import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ApiKeyChecker } from './components/ApiKeyChecker';
import { ProcessingQueue } from './components/ProcessingQueue';
import { PromptModal } from './components/PromptModal';
import { GlobalPromptModal } from './components/GlobalPromptModal';
import { ImageFile, ProcessingStatus } from './types';
import { translateImageWithGemini } from './services/geminiService';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customPromptTemplate, setCustomPromptTemplate] = useState("{filename}");
  const [temperature, setTemperature] = useState(1.0);
  const [autoRetry, setAutoRetry] = useState(false);
  const [autoSort, setAutoSort] = useState(true);
  const [enableDelay, setEnableDelay] = useState(false);
  const [enableConcurrency, setEnableConcurrency] = useState(true);
  const [maxConcurrency, setMaxConcurrency] = useState(2);
  const [isDragging, setIsDragging] = useState(false);
  const [isDualDragging, setIsDualDragging] = useState(false);
  const [showPresets, setShowPresets] = useState(true);

  // Modal State
  const [editingFile, setEditingFile] = useState<ImageFile | null>(null);
  const [isGlobalPromptModalOpen, setIsGlobalPromptModalOpen] = useState(false);
  // Image Viewer State
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  
  // Refs to ensure the async worker always reads the LATEST state
  const abortControllerRef = useRef<boolean>(false);
  const filesRef = useRef<ImageFile[]>(files);
  const customPromptTemplateRef = useRef(customPromptTemplate);
  const temperatureRef = useRef(temperature);
  const autoRetryRef = useRef(autoRetry);
  const enableDelayRef = useRef(enableDelay);
  const enableConcurrencyRef = useRef(enableConcurrency);
  const maxConcurrencyRef = useRef(maxConcurrency);
  const apiKeyRef = useRef(apiKey);

  useEffect(() => {
    apiKeyRef.current = apiKey;
  }, [apiKey]);

  // Sync refs with state
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    customPromptTemplateRef.current = customPromptTemplate;
  }, [customPromptTemplate]);

  useEffect(() => {
    temperatureRef.current = temperature;
  }, [temperature]);

  useEffect(() => {
    autoRetryRef.current = autoRetry;
  }, [autoRetry]);

  useEffect(() => {
    enableDelayRef.current = enableDelay;
  }, [enableDelay]);

  useEffect(() => {
    enableConcurrencyRef.current = enableConcurrency;
  }, [enableConcurrency]);

  useEffect(() => {
    maxConcurrencyRef.current = maxConcurrency;
  }, [maxConcurrency]);

  // Shared helper to add files
  const addFilesToQueue = (incomingFiles: File[]) => {
    const timestamp = Date.now();
    const newFiles: ImageFile[] = incomingFiles
      .filter((f: File) => f.type.startsWith('image/'))
      .map((f: File) => ({
        id: crypto.randomUUID(),
        file: f,
        previewUrl: URL.createObjectURL(f),
        status: ProcessingStatus.IDLE,
        lastActivityTimestamp: timestamp, // Initial timestamp
        isRetry: false
      }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const addDualFilesToQueue = (incomingFiles: File[]) => {
    const imageFiles = incomingFiles.filter(f => f.type.startsWith('image/'));
    const timestamp = Date.now();
    const newQueueItems: ImageFile[] = [];

    // Process in pairs of 2
    for (let i = 0; i < imageFiles.length; i += 2) {
        // If we have a pair, create a dual item
        if (i + 1 < imageFiles.length) {
            const primary = imageFiles[i];
            const secondary = imageFiles[i + 1];
            
            newQueueItems.push({
                id: crypto.randomUUID(),
                file: primary,
                previewUrl: URL.createObjectURL(primary),
                secondaryFile: secondary,
                secondaryPreviewUrl: URL.createObjectURL(secondary),
                status: ProcessingStatus.IDLE,
                lastActivityTimestamp: timestamp,
                isRetry: false
            });
        } 
        // If we have an odd one left over at the end
        else {
            const single = imageFiles[i];
            newQueueItems.push({
                id: crypto.randomUUID(),
                file: single,
                previewUrl: URL.createObjectURL(single),
                status: ProcessingStatus.IDLE,
                lastActivityTimestamp: timestamp,
                isRetry: false
            });
        }
    }
    setFiles(prev => [...prev, ...newQueueItems]);
  };

  // File Input Handler (Single/Batch Standard)
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      addFilesToQueue(Array.from(event.target.files));
      // Reset input
      event.target.value = '';
    }
  };

  // File Input Handler (Dual/Pair Batch)
  const handleDualFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      addDualFilesToQueue(Array.from(event.target.files));
      // Reset input
      event.target.value = '';
    }
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(Array.from(e.dataTransfer.files) as File[]);
    }
  };

  // Dual Drag Handlers
  const handleDualDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDualDragging(true);
  };

  const handleDualDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDualDragging(false);
  };

  const handleDualDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDualDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Cast Array.from result to File[] to ensure proper typing
      const droppedFiles = (Array.from(e.dataTransfer.files) as File[]).filter(f => f.type.startsWith('image/'));
      
      if (droppedFiles.length === 2) {
        addDualFilesToQueue(droppedFiles);
      } else {
        alert("2장 합치기 기능은 정확히 2장의 이미지만 드래그해야 합니다.");
      }
    }
  };

  const handleRemove = (id: string) => {
    setFiles(prev => {
        const fileToRemove = prev.find(f => f.id === id);
        if (fileToRemove) {
            URL.revokeObjectURL(fileToRemove.previewUrl);
            if (fileToRemove.secondaryPreviewUrl) URL.revokeObjectURL(fileToRemove.secondaryPreviewUrl);
            if (fileToRemove.resultUrl) URL.revokeObjectURL(fileToRemove.resultUrl);
        }
        return prev.filter(f => f.id !== id);
    });
  };

  // Prompt Editing
  const handleEditPrompt = (file: ImageFile) => {
    setEditingFile(file);
  };

  const handleSavePrompt = (newPrompt: string) => {
    if (!editingFile) return;
    
    setFiles(prev => prev.map(f => 
        f.id === editingFile.id 
        ? { ...f, customPrompt: newPrompt } 
        : f
    ));
    setEditingFile(null);
  };

  // Helper to process a single file (Logic only, no state updates for the list)
  const processSingleFile = async (fileItem: ImageFile): Promise<ImageFile> => {
    // ALWAYS use the current value from Ref to avoid stale settings in long running loops
    const currentTemp = temperatureRef.current;
    const currentAutoRetry = autoRetryRef.current;
    const currentApiKey = apiKeyRef.current;

    if (!currentApiKey) {
        throw new Error("API Key is missing");
    }
    
    // Determine prompt: specific override OR global template
    let finalPrompt = "";
    if (fileItem.customPrompt) {
        finalPrompt = fileItem.customPrompt;
    } else {
        const fileNameWithoutExt = fileItem.file.name.replace(/\.[^/.]+$/, "");
        finalPrompt = customPromptTemplateRef.current.replace('{filename}', fileNameWithoutExt);
    }
    
    const maxAttempts = currentAutoRetry ? 3 : 1;
    let attempts = 0;
    let lastError: any;

    // Prepare inputs
    const filesToProcess = [fileItem.file];
    if (fileItem.secondaryFile) {
        filesToProcess.push(fileItem.secondaryFile);
    }

    while (attempts < maxAttempts) {
      if (abortControllerRef.current) break;
      attempts++;
      
      try {
        const resultBase64 = await translateImageWithGemini(filesToProcess, finalPrompt, currentTemp, currentApiKey);
        
        // Convert base64 result to Blob for zipping later
        const res = await fetch(resultBase64);
        const blob = await res.blob();

        return {
          ...fileItem,
          status: ProcessingStatus.COMPLETED,
          resultUrl: resultBase64,
          resultBlob: blob,
          error: undefined
        };
      } catch (error: any) {
        lastError = error;
        console.warn(`Attempt ${attempts} failed for ${fileItem.file.name}:`, error);
        // Small delay before retry if not last attempt
        if (attempts < maxAttempts && !abortControllerRef.current) {
           await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
    }

    throw lastError || new Error("Processing failed");
  };

  // Wrapper to handle background execution and state updates for a single file
  const processFileBackground = async (fileItem: ImageFile) => {
    try {
        const updatedFile = await processSingleFile(fileItem);
        // Only update if not aborted (or maybe we update anyway to show success? Let's update.)
        setFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
    } catch (error: any) {
        setFiles(prev => prev.map(f => f.id === fileItem.id ? {
            ...f,
            status: ProcessingStatus.FAILED,
            error: error.message || "Unknown error"
        } : f));
    }
  };

  // The Queue Manager: Manages concurrent workers
  const processQueue = async () => {
    if (isProcessing) return; 
    
    setIsProcessing(true);
    abortControllerRef.current = false;

    while (true) {
      if (abortControllerRef.current) break;

      const currentFiles = filesRef.current;
      
      // Find all PENDING files
      const pendingFiles = currentFiles
        .filter(f => f.status === ProcessingStatus.PENDING)
        .sort((a, b) => b.lastActivityTimestamp - a.lastActivityTimestamp);

      // Find all currently PROCESSING files
      const processingFiles = currentFiles.filter(f => f.status === ProcessingStatus.PROCESSING);

      // Exit condition: No pending items and no active workers
      if (pendingFiles.length === 0 && processingFiles.length === 0) {
        break;
      }

      // Concurrency Control logic
      const isConcurrent = enableConcurrencyRef.current;
      const limit = maxConcurrencyRef.current;
      const MAX_CONCURRENCY = isConcurrent ? limit : 1;

      if (processingFiles.length < MAX_CONCURRENCY && pendingFiles.length > 0) {
          const fileToProcess = pendingFiles[0];

          // 1. Mark as PROCESSING immediately to prevent re-picking
          setFiles(prev => prev.map(f => f.id === fileToProcess.id ? { ...f, status: ProcessingStatus.PROCESSING, error: undefined } : f));
          
          // 2. Spawn worker (Fire and forget, do not await completion here)
          processFileBackground(fileToProcess);

          // 3. Delay Logic
          if (enableDelayRef.current) {
              // If delay is enabled, wait 10s before picking the NEXT task
              // Note: With concurrency, this acts as a stagger (wait 10s between STARTS)
              await new Promise(resolve => setTimeout(resolve, 10000));
          } else {
              // Small debounce to allow state to settle
              await new Promise(resolve => setTimeout(resolve, 100));
          }
      } else {
          // Buffer full or no pending items, wait before polling again
          await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setIsProcessing(false);
  };

  const startProcessing = async () => {
    if (files.length === 0) return;
    
    // Mark IDLE or FAILED items as PENDING
    setFiles(prev => prev.map(f => 
      f.status === ProcessingStatus.IDLE || f.status === ProcessingStatus.FAILED 
        ? { ...f, status: ProcessingStatus.PENDING, error: undefined } 
        : f
    ));

    setTimeout(() => processQueue(), 0);
  };

  const handleRegenerate = async (id: string) => {
    // Reverted logic: Reset the EXISTING item to PENDING. 
    // Do NOT clone it. This satisfies "Remove the feature where that image is created 1 more time".
    setFiles(prev => prev.map(f => {
        if (f.id === id) {
            return {
                ...f,
                status: ProcessingStatus.PENDING,
                resultUrl: undefined,
                resultBlob: undefined,
                error: undefined,
                isRetry: true,
                lastActivityTimestamp: Date.now() // Move to top of process queue
            };
        }
        return f;
    }));
    
    // Trigger queue manager
    setTimeout(() => processQueue(), 0);
  };

  // Feature: Create new task from previous result
  const handleUseResultAsInput = (item: ImageFile) => {
    if (!item.resultBlob) return;
    
    const timestamp = Date.now();
    // Create a new File object from the blob
    const newFileName = `regen_${timestamp}_${item.file.name}`;
    const newFile = new File([item.resultBlob], newFileName, { type: item.resultBlob.type });

    const newQueueItem: ImageFile = {
        id: crypto.randomUUID(),
        file: newFile,
        previewUrl: URL.createObjectURL(newFile),
        status: ProcessingStatus.IDLE,
        lastActivityTimestamp: timestamp,
        isRetry: false,
        customPrompt: item.customPrompt 
    };
    
    // Add to top of queue
    setFiles(prev => [...prev, newQueueItem]);
  };

  const stopProcessing = () => {
    abortControllerRef.current = true;
  };

  const downloadZip = async () => {
    const validFiles = files.filter(f => f.resultBlob);
    if (validFiles.length === 0) return;

    const zip = new window.JSZip();
    const folder = zip.folder("translated_images");

    validFiles.forEach(f => {
      if (f.resultBlob && folder) {
        folder.file(f.file.name, f.resultBlob);
      }
    });

    const content = await zip.generateAsync({ type: "blob" });
    window.saveAs(content, "translated_batch.zip");
  };

  const clearAll = () => {
    if (isProcessing) return;
    files.forEach(f => {
        URL.revokeObjectURL(f.previewUrl);
        if(f.secondaryPreviewUrl) URL.revokeObjectURL(f.secondaryPreviewUrl);
        if(f.resultUrl) URL.revokeObjectURL(f.resultUrl);
    });
    setFiles([]);
  };

  const handleLogout = () => {
      localStorage.removeItem('gemini_api_key');
      setApiKey(null);
      window.location.reload();
  };

  // Sort Logic for Display
  const sortedFiles = useMemo(() => {
    if (!autoSort) return files; // User can disable to see original add order

    // New "Auto-sort" logic: Sort by Recent Activity.
    // This groups recently added OR recently retried items at the top.
    return [...files].sort((a, b) => b.lastActivityTimestamp - a.lastActivityTimestamp);
  }, [files, autoSort]);

  if (!apiKey) {
    return <ApiKeyChecker onReady={(key) => setApiKey(key)} />;
  }

  const completedCount = files.filter(f => f.status === ProcessingStatus.COMPLETED).length;
  const hasResultCount = files.filter(f => f.resultBlob).length;
  
  const progress = files.length > 0 ? (completedCount / files.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             {/* Logo Removed */}
             <div>
               <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">나노바나나 프로 이미지체인저 UI</h1>
               <p className="text-xs text-gray-500">Powered by Google Ai Studio</p>
             </div>
          </div>
          <div className="flex gap-2">
             <button
                onClick={handleLogout}
                className="px-3 py-2 rounded-lg font-medium text-xs bg-gray-800 text-gray-400 hover:text-white border border-gray-700 hover:bg-gray-700 transition-colors"
             >
                API Key 재설정
             </button>
             {files.length > 0 && (
                <button 
                  onClick={downloadZip}
                  disabled={hasResultCount === 0}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${hasResultCount > 0 ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  ZIP 다운로드 ({hasResultCount})
                </button>
             )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 flex flex-col items-center">
        
        {/* Controls Section */}
        <div className="w-full bg-gray-800 rounded-xl p-6 shadow-xl border border-gray-700 mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            
            {/* Left: Input & Config */}
            <div className="flex-1 space-y-6">
              
              {/* Prompt Section */}
              <div>
                <div className="flex justify-between items-end mb-2">
                    <label className="block text-sm font-medium text-gray-400">기본 프롬프트 양식</label>
                    <button 
                        onClick={() => setShowPresets(!showPresets)}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        {showPresets ? "▲ 프리셋 닫기" : "▼ 프리셋 열기"}
                    </button>
                </div>
                <div className="relative">
                    <textarea 
                      value={customPromptTemplate}
                      onChange={(e) => setCustomPromptTemplate(e.target.value)}
                      rows={5}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-200 resize-none leading-relaxed"
                      placeholder="프롬프트를 입력하세요 (예: 한국어로 번역해줘...)"
                    />
                    <div className="absolute right-3 bottom-3">
                        <span className="text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded border border-gray-600">
                          {'{filename}'} = 파일 이름(확장자 제외)
                        </span>
                    </div>
                </div>

                {/* Preset Buttons for Global Prompt */}
                {showPresets && (
                <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                     <div className="flex gap-2 overflow-x-auto pb-1">
                        <button 
                            onClick={() => setCustomPromptTemplate("일본어를 한국어 {filename} 으로 번역.\n원본의 글씨체, 느낌 따라하기.\n글씨 끝이 뾰족하게. 글씨의 크기와 기울기가 서로 일정하지 않게. 글자 삐뚤빼뚤.\n압도적으로, 절대적으로 글씨의 그림자 절대 생성 금지. 글자 입체화 금지.\n원본 글씨의 텍스처 느낌과 색과 색의 그라데이션, 테두리 색 최대한 재현.\n이중 테두리 금지.")}
                            className="whitespace-nowrap px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded shadow transition-colors"
                        >
                            ✨ 기술 일본어 원본 한글화
                        </button>
                     </div>

                     {/* Border Removal Group */}
                     <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">테두리 제거</label>
                        <div className="flex flex-wrap gap-2">
                            <button 
                                onClick={() => setCustomPromptTemplate("remove dark navy border lines of letters. keep the original image.")}
                                className="px-2 py-1 bg-cyan-900/40 hover:bg-cyan-800 border border-cyan-700/50 text-cyan-200 text-xs rounded transition-colors"
                            >
                                풍속성 (Dark Navy)
                            </button>
                            <button 
                                onClick={() => setCustomPromptTemplate("remove dark green border lines of letters. keep the original image.")}
                                className="px-2 py-1 bg-green-900/40 hover:bg-green-800 border border-green-700/50 text-green-200 text-xs rounded transition-colors"
                            >
                                림속성 (Dark Green)
                            </button>
                            <button 
                                onClick={() => setCustomPromptTemplate("remove dark brown border lines of letters. keep the original image.")}
                                className="px-2 py-1 bg-orange-900/40 hover:bg-orange-800 border border-orange-700/50 text-orange-200 text-xs rounded transition-colors"
                            >
                                화속성 (Dark Brown)
                            </button>
                            <button 
                                onClick={() => setCustomPromptTemplate("remove dark brown border lines of letters. keep the original image.")}
                                className="px-2 py-1 bg-yellow-900/40 hover:bg-yellow-800 border border-yellow-700/50 text-yellow-200 text-xs rounded transition-colors"
                            >
                                산속성 (Dark Brown)
                            </button>
                            <button 
                                onClick={() => setCustomPromptTemplate("remove black border lines of letters. keep the original image.")}
                                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 border border-gray-500 text-gray-200 text-xs rounded transition-colors"
                            >
                                검은색 (Black)
                            </button>
                        </div>
                     </div>

                     {/* Border Color Change Group */}
                     <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">테두리 색상 변경</label>
                        <div className="flex flex-wrap gap-2">
                            <button 
                                onClick={() => setCustomPromptTemplate("change colors of border lines to #a4fefa")}
                                className="px-2 py-1 bg-cyan-900/40 hover:bg-cyan-800 border border-cyan-700/50 text-cyan-200 text-xs rounded transition-colors"
                            >
                                풍속성 (#a4fefa)
                            </button>
                            <button 
                                onClick={() => setCustomPromptTemplate("change colors of border lines to #f5ffa5")}
                                className="px-2 py-1 bg-green-900/40 hover:bg-green-800 border border-green-700/50 text-green-200 text-xs rounded transition-colors"
                            >
                                림속성 (#f5ffa5)
                            </button>
                            <button 
                                onClick={() => setCustomPromptTemplate("change colors of border lines to #fad075")}
                                className="px-2 py-1 bg-orange-900/40 hover:bg-orange-800 border border-orange-700/50 text-orange-200 text-xs rounded transition-colors"
                            >
                                화속성 (#fad075)
                            </button>
                            <button 
                                onClick={() => setCustomPromptTemplate("change colors of border lines to #fff1b5")}
                                className="px-2 py-1 bg-yellow-900/40 hover:bg-yellow-800 border border-yellow-700/50 text-yellow-200 text-xs rounded transition-colors"
                            >
                                산속성 (#fff1b5)
                            </button>
                        </div>
                     </div>

                     {/* Texture & Effects Group */}
                     <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">특수 효과 및 기타</label>
                        <div className="flex flex-wrap gap-2">
                            <button 
                                onClick={() => setCustomPromptTemplate("'대상기술명'의 글자 안에 다른 이미지의 텍스처를 그대로 재현.")}
                                className="px-2 py-1 bg-purple-900/40 hover:bg-purple-800 border border-purple-700/50 text-purple-200 text-xs rounded transition-colors"
                            >
                                (이중 이미지) 글자 내부 텍스처 치환
                            </button>
                            <button 
                                onClick={() => setCustomPromptTemplate("remove shadow.")}
                                className="px-2 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 text-xs rounded transition-colors"
                            >
                                그림자 제거
                            </button>
                            <button 
                                onClick={() => setCustomPromptTemplate("remove outglow only. keep the original image.")}
                                className="px-2 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 text-xs rounded transition-colors"
                            >
                                outglow 제거
                            </button>
                        </div>
                     </div>
                </div>
                )}
              </div>

              {/* Temperature Slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-400">온도(1.0에서 낮을수록 창의력 감소)</label>
                  <span className="text-sm font-bold text-blue-400 bg-blue-900/30 px-2 py-1 rounded">{temperature.toFixed(1)}</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Options & Actions */}
              <div className="flex flex-col gap-4">
                 <div className="flex flex-wrap gap-4 items-center">
                     {/* Auto Sort Checkbox */}
                     <label className="flex items-center gap-2 cursor-pointer w-fit select-none">
                        <input 
                          type="checkbox" 
                          checked={autoSort}
                          onChange={(e) => setAutoSort(e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-600 ring-offset-gray-800"
                        />
                        <span className="text-sm text-gray-300">생성순 정렬</span>
                     </label>

                     {/* Auto Retry Checkbox */}
                     <label className="flex items-center gap-2 cursor-pointer w-fit select-none">
                        <input 
                          type="checkbox" 
                          checked={autoRetry}
                          onChange={(e) => setAutoRetry(e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-600 ring-offset-gray-800"
                        />
                        <span className="text-sm text-gray-300">실패시 재생성(3회)</span>
                     </label>

                     {/* Delay Checkbox */}
                     <label className="flex items-center gap-2 cursor-pointer w-fit select-none">
                        <input 
                          type="checkbox" 
                          checked={enableDelay}
                          onChange={(e) => setEnableDelay(e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-600 ring-offset-gray-800"
                        />
                        <span className="text-sm text-gray-300">10초 간격</span>
                     </label>

                     {/* Concurrent Generation Control */}
                     <div className="flex items-center gap-2 border-l border-gray-700 pl-4 ml-2">
                        <label className="flex items-center gap-2 cursor-pointer w-fit select-none">
                            <input 
                                type="checkbox" 
                                checked={enableConcurrency}
                                onChange={(e) => setEnableConcurrency(e.target.checked)}
                                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-600 ring-offset-gray-800"
                            />
                            <span className="text-sm text-gray-300">동시 생성</span>
                        </label>
                        
                        {enableConcurrency && (
                            <div className="flex items-center gap-1 animate-in fade-in slide-in-from-left-2 duration-200">
                                <input 
                                    type="number" 
                                    min="1" 
                                    max="10"
                                    value={maxConcurrency}
                                    onChange={(e) => setMaxConcurrency(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-12 h-6 bg-gray-700 border border-gray-600 rounded px-1 text-center text-sm text-gray-200 focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                                <span className="text-xs text-gray-500">개</span>
                            </div>
                        )}
                     </div>
                 </div>

                 {/* File Selection & Main Buttons */}
                 <div className="flex flex-col gap-3 pt-2">
                    {/* Standard Single Image Upload (Drag & Drop) */}
                    <div className="flex items-center gap-4">
                        <label 
                            className={`flex-1 cursor-pointer group transition-all rounded-lg overflow-hidden ${isDragging ? 'ring-2 ring-blue-500 scale-[1.02]' : ''}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <div className={`h-14 w-full border-2 border-dashed rounded-lg flex items-center justify-center transition-all ${isDragging ? 'border-blue-500 bg-blue-900/30' : 'border-gray-600 bg-gray-900/50 group-hover:border-blue-500 group-hover:bg-gray-800'}`}>
                            <span className={`text-sm flex items-center gap-2 font-medium ${isDragging ? 'text-blue-300' : 'text-gray-400 group-hover:text-blue-400'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                {isDragging ? "여기에 이미지 놓기" : "이미지 선택 혹은 드래그해서 커서 올리기"}
                            </span>
                            <input 
                                type="file" 
                                multiple 
                                accept="image/*"
                                onChange={handleFileSelect} 
                                className="hidden" 
                                />
                            </div>
                        </label>
                        
                        {!isProcessing ? (
                            <button 
                            onClick={startProcessing}
                            disabled={files.length === 0}
                            className={`h-14 px-8 rounded-lg font-bold flex items-center gap-2 transition-all ${files.length > 0 ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 hover:scale-105' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                            >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            구동
                            </button>
                        ) : (
                            <button 
                            onClick={stopProcessing}
                            className="h-14 px-8 rounded-lg font-bold flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20 animate-pulse"
                            >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"></path></svg>
                            중지
                            </button>
                        )}
                    </div>

                    {/* Dual Image Upload Button */}
                    <div className="flex w-full">
                        <label 
                            className={`w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed cursor-pointer transition-all text-sm ${
                                isDualDragging 
                                ? 'border-purple-400 bg-purple-900/40 text-purple-200 ring-2 ring-purple-500 scale-[1.01]' 
                                : 'border-purple-800/50 bg-purple-900/10 hover:bg-purple-900/20 text-purple-300 hover:text-purple-200'
                            }`}
                            onDragOver={handleDualDragOver}
                            onDragLeave={handleDualDragLeave}
                            onDrop={handleDualDrop}
                        >
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                             {isDualDragging ? "2장의 이미지를 여기에 놓으세요" : "2장 합쳐서 생성하기 (2장 드래그 혹은 선택)"}
                             <input 
                                type="file" 
                                multiple 
                                accept="image/*"
                                onChange={handleDualFileSelect} 
                                className="hidden" 
                            />
                        </label>
                    </div>
                 </div>
              </div>
            </div>

            {/* Right: Stats */}
            <div className="w-full md:w-64 bg-gray-900 rounded-lg p-5 border border-gray-700 flex flex-col justify-center shrink-0">
               <h3 className="text-gray-300 font-medium mb-4 flex items-center gap-2">
                 <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                 진행 현황
               </h3>
               
               <div className="text-sm text-gray-400 mb-2 flex justify-between">
                 <span>완성도</span>
                 <span className="text-white font-mono">{Math.round(progress)}%</span>
               </div>
               
               <div className="w-full bg-gray-800 rounded-full h-2.5 mb-6 overflow-hidden border border-gray-700">
                  <div className="bg-blue-500 h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
               </div>
               
               <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 bg-gray-800/50 rounded">
                    <span className="text-gray-400">총 작업</span> 
                    <span className="text-white font-bold">{files.length}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-800/50 rounded">
                    <span className="text-gray-400">대기</span> 
                    <span className="text-yellow-500 font-bold">{files.filter(f => f.status === ProcessingStatus.PENDING || f.status === ProcessingStatus.IDLE).length}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-800/50 rounded">
                    <span className="text-gray-400">성공</span> 
                    <span className="text-green-500 font-bold">{completedCount}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-800/50 rounded">
                    <span className="text-gray-400">실패</span> 
                    <span className="text-red-500 font-bold">{files.filter(f => f.status === ProcessingStatus.FAILED).length}</span>
                  </div>
               </div>
               
               {files.length > 0 && !isProcessing && (
                 <button onClick={clearAll} className="mt-6 w-full py-2 text-xs text-red-400 hover:text-red-300 border border-red-900/30 hover:bg-red-900/20 rounded transition-colors">
                   리스트 초기화
                 </button>
               )}
            </div>

          </div>
        </div>

        {/* Content Grid */}
        <ProcessingQueue 
            files={sortedFiles} 
            onRegenerate={handleRegenerate} 
            onRemove={handleRemove} 
            onEditPrompt={handleEditPrompt}
            onViewImage={setViewingImageUrl}
            onUseResultAsInput={handleUseResultAsInput}
        />
        
        {files.length === 0 && (
           <div className="mt-20 text-center opacity-40">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center border-2 border-gray-700 border-dashed">
                <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              </div>
              <p className="text-xl font-medium text-gray-300">이미지가 선택되지 않았습니다</p>
              <p className="text-sm text-gray-500 mt-1">여러 이미지를 선택하거나 드래그하여 일괄 처리를 시작하세요</p>
           </div>
        )}
        
        {/* Floating Action Button for Global Prompt Edit */}
        <button
            onClick={() => setIsGlobalPromptModalOpen(true)}
            className="fixed bottom-6 right-6 w-12 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg hover:scale-105 transition-all flex items-center justify-center z-[90]"
            title="기본 프롬프트 양식 수정"
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
        </button>

        {/* Prompt Editing Modal */}
        <PromptModal 
            isOpen={!!editingFile}
            onClose={() => setEditingFile(null)}
            onSave={handleSavePrompt}
            initialPrompt={editingFile?.customPrompt || ""}
            fileName={editingFile?.file.name || ""}
            globalTemplate={customPromptTemplate}
        />

        {/* Global Prompt Modal */}
        <GlobalPromptModal
            isOpen={isGlobalPromptModalOpen}
            onClose={() => setIsGlobalPromptModalOpen(false)}
            onSave={(newTemplate) => setCustomPromptTemplate(newTemplate)}
            currentTemplate={customPromptTemplate}
        />

        {/* Image Viewer Overlay */}
        {viewingImageUrl && (
            <div 
                className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200 cursor-zoom-out"
                onClick={() => setViewingImageUrl(null)}
            >
                <img 
                    src={viewingImageUrl} 
                    className="max-w-full max-h-full object-contain rounded shadow-2xl" 
                    alt="Full size view" 
                />
            </div>
        )}

      </main>
    </div>
  );
};

export default App;