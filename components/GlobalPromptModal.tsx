import React, { useState, useEffect } from 'react';

interface GlobalPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: string) => void;
  currentTemplate: string;
}

export const GlobalPromptModal: React.FC<GlobalPromptModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentTemplate
}) => {
  const [template, setTemplate] = useState(currentTemplate);
  const [showPresets, setShowPresets] = useState(true);

  // Sync state when opening
  useEffect(() => {
    if (isOpen) {
        setTemplate(currentTemplate);
    }
  }, [isOpen, currentTemplate]);

  // Replace template with text
  const replaceTemplate = (text: string) => {
    setTemplate(text);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-full max-w-2xl overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-700 bg-gray-850 shrink-0">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
            기본 프롬프트 양식 수정
          </h3>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            기본 프롬프트 양식
          </label>
          <textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={6}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none mb-4"
            placeholder="프롬프트를 입력하세요..."
          />
          
          <div className="flex items-center justify-between mb-2">
             <span className="text-sm font-bold text-gray-400">Presets</span>
             <button 
                onClick={() => setShowPresets(!showPresets)}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
                {showPresets ? "▲ 프리셋 닫기" : "▼ 프리셋 열기"}
            </button>
          </div>

          {/* Preset Buttons Group */}
          {showPresets && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
             <div className="flex gap-2 overflow-x-auto pb-1">
                <button 
                onClick={() => replaceTemplate("일본어를 한국어 {filename} 으로 번역.\n원본의 글씨체, 느낌 따라하기.\n글씨 끝이 뾰족하게. 글씨의 크기와 기울기가 서로 일정하지 않게. 글자 삐뚤빼뚤.\n압도적으로, 절대적으로 글씨의 그림자 절대 생성 금지. 글자 입체화 금지.\n원본 글씨의 텍스처 느낌과 색과 색의 그라데이션, 테두리 색 최대한 재현.\n이중 테두리 금지.")}
                className="whitespace-nowrap px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded shadow transition-colors"
                >
                ✨ 기술 일본어 원본 한글화
                </button>
             </div>

             {/* Border Removal Group */}
             <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">테두리 제거 (Border Removal)</label>
                <div className="flex flex-wrap gap-2">
                    <button 
                        onClick={() => replaceTemplate("remove dark navy border lines of letters. keep the original image.")}
                        className="px-2 py-1 bg-cyan-900/40 hover:bg-cyan-800 border border-cyan-700/50 text-cyan-200 text-xs rounded transition-colors"
                    >
                        풍속성 (Dark Navy)
                    </button>
                    <button 
                        onClick={() => replaceTemplate("remove dark green border lines of letters. keep the original image.")}
                        className="px-2 py-1 bg-green-900/40 hover:bg-green-800 border border-green-700/50 text-green-200 text-xs rounded transition-colors"
                    >
                        림속성 (Dark Green)
                    </button>
                    <button 
                        onClick={() => replaceTemplate("remove dark brown border lines of letters. keep the original image.")}
                        className="px-2 py-1 bg-orange-900/40 hover:bg-orange-800 border border-orange-700/50 text-orange-200 text-xs rounded transition-colors"
                    >
                        화속성 (Dark Brown)
                    </button>
                    <button 
                        onClick={() => replaceTemplate("remove dark brown border lines of letters. keep the original image.")}
                        className="px-2 py-1 bg-yellow-900/40 hover:bg-yellow-800 border border-yellow-700/50 text-yellow-200 text-xs rounded transition-colors"
                    >
                        산속성 (Dark Brown)
                    </button>
                    <button 
                        onClick={() => replaceTemplate("remove black border lines of letters. keep the original image.")}
                        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 border border-gray-500 text-gray-200 text-xs rounded transition-colors"
                    >
                        검은색 (Black)
                    </button>
                </div>
             </div>

             {/* Border Color Change Group */}
             <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">테두리 색상 변경 (Change Border Color)</label>
                <div className="flex flex-wrap gap-2">
                    <button 
                        onClick={() => replaceTemplate("change colors of border lines to #a4fefa")}
                        className="px-2 py-1 bg-cyan-900/40 hover:bg-cyan-800 border border-cyan-700/50 text-cyan-200 text-xs rounded transition-colors"
                    >
                        풍속성 (#a4fefa)
                    </button>
                    <button 
                        onClick={() => replaceTemplate("change colors of border lines to #f5ffa5")}
                        className="px-2 py-1 bg-green-900/40 hover:bg-green-800 border border-green-700/50 text-green-200 text-xs rounded transition-colors"
                    >
                        림속성 (#f5ffa5)
                    </button>
                    <button 
                        onClick={() => replaceTemplate("change colors of border lines to #fad075")}
                        className="px-2 py-1 bg-orange-900/40 hover:bg-orange-800 border border-orange-700/50 text-orange-200 text-xs rounded transition-colors"
                    >
                        화속성 (#fad075)
                    </button>
                    <button 
                        onClick={() => replaceTemplate("change colors of border lines to #fff1b5")}
                        className="px-2 py-1 bg-yellow-900/40 hover:bg-yellow-800 border border-yellow-700/50 text-yellow-200 text-xs rounded transition-colors"
                    >
                        산속성 (#fff1b5)
                    </button>
                </div>
             </div>

             {/* Texture & Effects Group */}
             <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">특수 효과 및 기타 (Effects & Misc)</label>
                <div className="flex flex-wrap gap-2">
                    <button 
                        onClick={() => replaceTemplate("'대상기술명'의 글자 안에 다른 이미지의 텍스처를 그대로 재현.")}
                        className="px-2 py-1 bg-purple-900/40 hover:bg-purple-800 border border-purple-700/50 text-purple-200 text-xs rounded transition-colors"
                    >
                        (이중 이미지) 글자 내부 텍스처 치환
                    </button>
                    <button 
                        onClick={() => replaceTemplate("remove shadow.")}
                        className="px-2 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 text-xs rounded transition-colors"
                    >
                        그림자 제거
                    </button>
                    <button 
                        onClick={() => replaceTemplate("remove outglow only. keep the original image.")}
                        className="px-2 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 text-xs rounded transition-colors"
                    >
                        outglow 제거
                    </button>
                </div>
             </div>
          </div>
          )}

          <p className="text-xs text-gray-500 mt-4">
            {'{filename}'}을 사용하여 파일명(확장자 제외)을 삽입할 수 있습니다.
          </p>
        </div>

        <div className="p-4 bg-gray-900/50 border-t border-gray-700 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
          >
            취소
          </button>
          <button
            onClick={() => {
                onSave(template);
                onClose();
            }}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition-all"
          >
            양식 저장
          </button>
        </div>
      </div>
    </div>
  );
};