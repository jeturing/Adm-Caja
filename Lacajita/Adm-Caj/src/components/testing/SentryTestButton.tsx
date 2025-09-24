import React from 'react';
import * as Sentry from '@sentry/react';

const SentryTestButton: React.FC = () => {
  const triggerError = () => {
    console.log('🧪 Triggering intentional error for Sentry testing...');
    throw new Error("This is your first error! Sentry test from La Cajita TV Dashboard");
  };

  const triggerCaptureException = () => {
    console.log('🧪 Triggering captured exception for Sentry testing...');
    try {
      throw new Error("Captured error test from La Cajita TV Dashboard");
    } catch (error) {
      Sentry.captureException(error);
      console.log('✅ Error captured and sent to Sentry');
    }
  };

  const triggerCaptureMessage = () => {
    console.log('🧪 Sending test message to Sentry...');
    Sentry.captureMessage("Test message from La Cajita TV Dashboard", "info");
    console.log('✅ Message sent to Sentry');
  };

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
      <h3 className="text-lg font-semibold text-yellow-800 mb-3">
        🧪 Sentry Testing Panel
      </h3>
      <p className="text-yellow-700 mb-4 text-sm">
        Estos botones están solo para testing. Generan errores intencionales para verificar la integración con Sentry.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={triggerError}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
        >
          💥 Trigger Uncaught Error
        </button>
        <button
          onClick={triggerCaptureException}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-sm"
        >
          🎯 Trigger Captured Exception
        </button>
        <button
          onClick={triggerCaptureMessage}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
        >
          📨 Send Test Message
        </button>
      </div>
    </div>
  );
};

export default SentryTestButton;
