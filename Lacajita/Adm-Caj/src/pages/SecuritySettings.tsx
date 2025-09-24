import React from 'react';
import SecurityConfigurationMenu from '../components/security/SecurityConfigurationMenu';

const SecuritySettings: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <SecurityConfigurationMenu />
    </div>
  );
};

export default SecuritySettings;
