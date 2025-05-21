import React from 'react';
import { Loader, CheckCircle } from 'lucide-react';
import Modal from './layout/Modal';

interface ImportFeedProgressModalProps {
  step: 'loading' | 'saving' | 'done';
  progress?: number;
  showProgress?: boolean;
}

const stepText: Record<string, string> = {
  loading: 'Загрузка файла...',
  saving: 'Сохранение товаров...',
  done: 'Импорт завершён!'
};

const stepIcon: Record<string, React.ReactNode> = {
  loading: <Loader className="animate-spin w-10 h-10 text-blue-500" />,
  saving: <Loader className="animate-spin w-10 h-10 text-green-500" />,
  done: <CheckCircle className="w-10 h-10 text-green-600" />
};

export default function ImportFeedProgressModal({ step, progress, showProgress }: ImportFeedProgressModalProps) {
  return (
    <Modal isOpen={true} onClose={() => {}} title="Импорт фида" size="sm">
      <div className="flex flex-col items-center gap-4 py-6 min-w-[260px]">
        {stepIcon[step]}
        <div className="text-lg font-medium text-center">{stepText[step]}</div>
        {showProgress && typeof progress === 'number' && (
          <div className="w-full mt-2">
            <div className="flex justify-between text-xs mb-1">
              <span>Прогресс</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
} 