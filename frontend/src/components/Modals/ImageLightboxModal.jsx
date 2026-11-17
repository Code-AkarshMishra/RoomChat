import React from 'react';
import { X, Download } from 'lucide-react';

export default function ImageLightboxModal({ imageUrl, onClose }) {
  if (!imageUrl) return null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl max-h-[90vh] flex flex-col items-center cursor-default"
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <img
          src={imageUrl}
          alt="Enlarged shared media"
          className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
        />

        <div className="mt-3 flex items-center gap-3">
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4" /> Open Full Resolution
          </a>
        </div>
      </div>
    </div>
  );
}

