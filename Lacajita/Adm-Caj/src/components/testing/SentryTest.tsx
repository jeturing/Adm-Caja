import React from 'react';
import * as Sentry from '@sentry/react';

const SentryTest: React.FC = () => {
  const throwError = () => {
    throw new Error("Este es un error de prueba para Sentry!");
  };

  const captureException = () => {
    try {
      throw new Error("Error capturado manualmente");
    } catch (error) {
      Sentry.captureException(error);
      console.log("Error enviado a Sentry:", error);
    }
  };

  const captureMessage = () => {
    Sentry.captureMessage("Mensaje de prueba enviado a Sentry", "info");
    console.log("Mensaje enviado a Sentry");
  };

  return (
    <div className="p-6 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        🔍 Sentry Testing Panel
      </h3>
      
      <div className="space-y-3">
        <button
          onClick={throwError}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          🚨 Lanzar Error (Break the World)
        </button>
        
        <button
          onClick={captureException}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
        >
          📤 Capturar Excepción
        </button>
        
        <button
          onClick={captureMessage}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          💬 Enviar Mensaje
        </button>
      </div>
      
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
        <strong>Nota:</strong> Estos botones están diseñados para probar la integración con Sentry.
        Los errores aparecerán en tu dashboard de Sentry.
      </div>
    </div>
  );
};

export default SentryTest;
