
import React from 'react';
import { X } from 'lucide-react';

interface PdfViewerProps {
  url: string;
  title: string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ url, title }) => {
  return (
    <div className="relative w-full h-full bg-slate-800 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
      <iframe
        src={url}
        title={title}
        className="w-full h-full border-none"
        allowFullScreen
      />
    </div>
  );
};
