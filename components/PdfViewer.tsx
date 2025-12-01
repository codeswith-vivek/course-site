import React from 'react';
import { Download, FileText } from 'lucide-react';

interface PdfViewerProps {
  url: string;
  title: string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ url, title }) => {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-2xl w-full h-full flex flex-col relative">
        <div className="flex-1 relative bg-gray-200">
             <iframe 
                src={url} 
                className="w-full h-full" 
                title={title}
            />
        </div>
        <div className="p-4 bg-white border-t border-gray-200 flex justify-between items-center">
            <div className="flex items-center overflow-hidden mr-4">
                <div className="p-2 bg-red-100 rounded-lg mr-3 flex-shrink-0">
                    <FileText className="h-5 w-5 text-red-600" />
                </div>
                <span className="font-bold text-gray-800 truncate">{title}</span>
            </div>
            <a 
                href={url} 
                download 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-sm hover:bg-indigo-100 transition-colors flex-shrink-0"
            >
                <Download className="h-4 w-4 mr-2" /> Save PDF
            </a>
        </div>
    </div>
  );
};
