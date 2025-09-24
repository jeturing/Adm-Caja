/**
 * Página de testing para JWPlayer CDN
 */

import React from 'react';
import JWPlayerDiagnostic from '../../components/testing/JWPlayerDiagnostic';

const JWPlayerTestPage: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          🧪 Testing JWPlayer CDN
        </h1>
        <p className="text-gray-600">
          Herramientas de diagnóstico para verificar la integración con JWPlayer CDN
        </p>
      </div>
      
      <JWPlayerDiagnostic />
    </div>
  );
};

export default JWPlayerTestPage;
