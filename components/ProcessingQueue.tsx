import React from 'react';
import { ImageFile, ProcessingStatus } from '../types';

interface ProcessingQueueProps {
  files: ImageFile[];
  onRegenerate: (id: string) => void;
  onRemove: (id: string) => void;
  onEditPrompt: (file: ImageFile) => void;
  onViewImage: (url: string) => void;
  onUseResultAsInput: (file: ImageFile) => void; // New callback
}

export const ProcessingQueue: React.FC<ProcessingQueueProps> = ({ 
    files, 
    onRegenerate, 
    onRemove, 
    onEditPrompt, 
    onViewImage,
    onUseResultAsInput 
}) => {
  if (files.length === 0) return null;

  const handleDownloadSingle = (file: ImageFile) => {
    if (file.resultBlob && window.saveAs) {
        window.saveAs(file.resultBlob, file.file.name);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-8 w-full max-w-7xl">
      {files.map((file) => (
        <div 
          key={file.id} 
          className={`relative bg-gray-800 rounded-lg overflow-hidden border ${
            file.status === ProcessingStatus.COMPLETED 
                ? (file.isRetry ? 'border-cyan-500/50' : 'border-green-500/50') 
            : file.status === ProcessingStatus.FAILED ? 'border-red-500/50' 
            : 'border-gray-700'
          } shadow-lg transition-all group`}
        >
          <div className="h-48 bg-gray-900 relative">
             {file.status === ProcessingStatus.COMPLETED && file.resultUrl ? (
                // Result View
                <img 
                    src={file.resultUrl} 
                    alt="Result" 
                    className="w-full h-full object-contain cursor-zoom-in"
                    onClick={() => file.resultUrl && onViewImage(file.resultUrl)}
                />
             ) : (
                // Input Preview View
                <div className={`w-full h-full ${file.secondaryFile ? 'grid grid-cols-2 divide-x divide-gray-700' : ''}`}>
                    <div className="relative w-full h-full overflow-hidden">
                        <img 
                            src={file.previewUrl} 
                            alt={file.file.name} 
                            className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity cursor-zoom-in"
                            onClick={() => onViewImage(file.previewUrl)}
                        />
                         {file.secondaryFile && <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 px-1 rounded text-white">Img 1</span>}
                    </div>
                    
                    {file.secondaryFile && file.secondaryPreviewUrl && (
                        <div className="relative w-full h-full overflow-hidden">
                            <img 
                                src={file.secondaryPreviewUrl} 
                                alt={file.secondaryFile.name} 
                                className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity cursor-zoom-in"
                                onClick={() => file.secondaryPreviewUrl && onViewImage(file.secondaryPreviewUrl)}
                            />
                            <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 px-1 rounded text-white">Img 2</span>
                        </div>
                    )}
                </div>
             )}
            
            {/* Badges and Actions overlay */}
            {file.status === ProcessingStatus.COMPLETED && (
              <div className="absolute top-2 left-2 pointer-events-none flex flex-col gap-1">
                {file.isRetry ? (
                    <span className="text-white font-bold text-[10px] bg-cyan-600/90 px-2 py-0.5 rounded shadow-sm w-fit">재생성 완료</span>
                ) : (
                    <span className="text-white font-bold text-[10px] bg-green-600/90 px-2 py-0.5 rounded shadow-sm w-fit">생성 완료</span>
                )}
              </div>
            )}
            
            {file.secondaryFile && (
                 <div className="absolute top-2 left-2 pointer-events-none mt-5">
                    <span className="text-white font-bold text-[10px] bg-purple-600/90 px-2 py-0.5 rounded shadow-sm">2장 합침</span>
                 </div>
            )}
            
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove(file.id);
                }}
                className="absolute top-2 right-2 bg-gray-900/60 hover:bg-red-600 text-gray-400 hover:text-white rounded-full p-1 transition-colors z-10"
                title="목록에서 제거"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          
          <div className="p-3">
            <div className="flex justify-between items-start mb-2">
                <h3 className="text-xs font-mono text-gray-400 truncate flex-1 pr-2" title={file.file.name}>
                {file.file.name} {file.secondaryFile ? `+ ${file.secondaryFile.name}` : ''}
                </h3>
                {file.customPrompt && (
                    <span className="shrink-0 w-2 h-2 rounded-full bg-blue-500" title="개별 프롬프트 적용됨"></span>
                )}
            </div>
            
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold px-2 py-1 rounded ${
                file.status === ProcessingStatus.IDLE ? 'bg-gray-700 text-gray-300' :
                file.status === ProcessingStatus.PENDING ? 'bg-yellow-900/50 text-yellow-300' :
                file.status === ProcessingStatus.PROCESSING ? 'bg-blue-900/50 text-blue-300 animate-pulse' :
                file.status === ProcessingStatus.COMPLETED ? (file.isRetry ? 'bg-cyan-900/50 text-cyan-300' : 'bg-green-900/50 text-green-300') :
                'bg-red-900/50 text-red-300'
              }`}>
                {file.status === ProcessingStatus.IDLE ? '대기' :
                 file.status === ProcessingStatus.PENDING ? '대기중' :
                 file.status === ProcessingStatus.PROCESSING ? '작업중' :
                 file.status === ProcessingStatus.COMPLETED ? '성공' : '실패'}
              </span>

              <div className="flex gap-1">
                {/* Custom Prompt Button */}
                <button
                    onClick={() => onEditPrompt(file)}
                    className={`flex items-center justify-center w-6 h-6 rounded border transition-colors ${file.customPrompt ? 'bg-blue-900/40 border-blue-600 text-blue-400 hover:bg-blue-800 hover:text-white' : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600 hover:text-gray-200'}`}
                    title="개별 프롬프트 수정"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>

                {file.status === ProcessingStatus.COMPLETED && file.resultBlob && (
                   <>
                   {/* Use Result As Input Button */}
                   <button
                     onClick={() => onUseResultAsInput(file)}
                     className="flex items-center justify-center w-6 h-6 bg-purple-900/40 hover:bg-purple-800 text-purple-200 rounded border border-purple-800/50 transition-colors"
                     title="이 결과를 입력 이미지로 사용하여 새 작업 생성"
                   >
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                   </button>
                   
                   {/* Download Button */}
                   <button
                     onClick={() => handleDownloadSingle(file)}
                     className="flex items-center gap-1 text-[10px] bg-blue-900/40 hover:bg-blue-800 text-blue-200 px-2 py-1 rounded border border-blue-800/50 transition-colors"
                     title="이미지 다운로드"
                   >
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                   </button>
                   </>
                )}

                {/* Always show Regenerate button to allow cloning/parallel runs */}
                <button 
                onClick={(e) => {
                    e.currentTarget.blur();
                    onRegenerate(file.id);
                }}
                className="flex items-center gap-1 text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 px-2 py-1 rounded border border-gray-600 transition-colors"
                title="재생성"
                >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                재생성
                </button>
              </div>
            </div>
            {file.error && (
               <p className="text-red-400 text-[10px] mt-1 truncate" title={file.error}>{file.error}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};