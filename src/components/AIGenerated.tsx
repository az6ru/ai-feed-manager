import React, { ReactNode } from 'react';
import { Check } from 'lucide-react';

interface AIGeneratedProps {
  title?: string;
  content: string | ReactNode;
  onApply: () => void;
  isMultiline?: boolean;
}

const AIGenerated = ({ title, content, onApply, isMultiline = false }: AIGeneratedProps) => {
  return (
    <div className="mt-2 p-3 bg-blue-50 rounded-md border border-blue-100 text-sm text-gray-700">
      {title && <p className="font-medium mb-1">{title}</p>}
      
      {isMultiline ? (
        <div className="bg-white p-2 rounded border border-blue-100 mb-2 max-h-40 overflow-y-auto">
          {typeof content === 'string' ? (
            content.split('\n').map((line, i) => (
              <p key={i} className={i > 0 ? 'mt-1' : ''}>{line}</p>
            ))
          ) : (
            content
          )}
        </div>
      ) : (
        <p className="mb-2">{content}</p>
      )}
      
      <button
        type="button"
        onClick={onApply}
        className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 border border-transparent rounded-md transition-colors"
      >
        <Check className="w-3 h-3 mr-1" />
        Применить
      </button>
    </div>
  );
};

export default AIGenerated; 