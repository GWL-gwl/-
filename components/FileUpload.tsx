import React, { useCallback, useRef, useState } from 'react';
import { Icons } from './Icon';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isProcessing }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  return (
    <div className="w-full">
      <div 
        className={`relative group rounded-[2rem] border-2 border-dashed p-10 transition-all duration-300 ease-out cursor-pointer bg-white overflow-hidden
          ${dragActive ? 'border-[#07C160] bg-green-50/50 scale-[1.02] shadow-xl shadow-green-100' : 'border-gray-200 hover:border-[#07C160]/30 hover:bg-gray-50/50 hover:shadow-lg hover:shadow-gray-100'}
          ${isProcessing ? 'opacity-50 pointer-events-none grayscale' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx" 
          onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
        />
        
        {/* Breathing Animation Background */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-green-50/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

        <div className="flex flex-col items-center justify-center gap-6 z-10 relative">
          <div className="relative">
             <div className="absolute inset-0 bg-[#07C160] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full" />
             <div className="w-20 h-20 rounded-3xl bg-green-50 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
               <Icons.Upload className="w-10 h-10 text-[#07C160]" />
             </div>
          </div>
          
          <div className="space-y-2 text-center">
            <h3 className="font-bold text-gray-900 text-xl tracking-tight">点击上传或拖入文件</h3>
            <p className="text-gray-400 text-sm font-medium">支持 PDF, Word, Excel (最大 20MB)</p>
          </div>

          <div className="flex gap-4 mt-2 opacity-50 grayscale group-hover:grayscale-0 transition-all duration-500">
             {/* File Icons Visualization */}
             {['PDF', 'DOC', 'XLS'].map((ext, i) => (
               <div key={ext} className={`w-10 h-12 border-2 rounded-lg flex flex-col items-center justify-center text-[10px] font-black bg-white shadow-sm transform group-hover:translate-y-0 translate-y-2 transition-transform duration-500 delay-${i*100}
                  ${i === 0 ? 'border-red-100 text-red-500' : i === 1 ? 'border-blue-100 text-blue-500' : 'border-green-100 text-green-500'}
               `}>
                 <span className="mt-auto mb-1.5">{ext}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
      
      {/* Tips */}
      <div className="mt-8 flex gap-4 text-xs text-gray-500 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 items-start">
        <Icons.Sparkles className="w-4 h-4 flex-shrink-0 text-[#07C160] mt-0.5" />
        <p className="leading-relaxed">
           AI 引擎已准备就绪。支持<span className="text-gray-900 font-bold">全量深度解析</span>，无论文档多长，我们都会将其拆解并完整提取每一道题目。
        </p>
      </div>
    </div>
  );
};