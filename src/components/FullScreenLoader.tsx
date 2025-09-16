import React from 'react';

export default function FullScreenLoader() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white" />
      <p className="text-white mt-4">Loading...</p>
    </div>
  );
}
