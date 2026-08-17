import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
      <Loader2 className="h-10 w-10 animate-spin text-neutral-800" />
      {message && (
        <p className="mt-4 text-sm font-medium text-neutral-500">
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingScreen;