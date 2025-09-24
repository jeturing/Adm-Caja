import React, { useState } from 'react';
import { User, Auth0Role } from '../../types/permissions';

interface ExportConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  roles: Auth0Role[];
}

const ExportConfigModal: React.FC<ExportConfigModalProps> = ({
  isOpen,
  onClose,
  users,
  roles
}) => {
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [exportType, setExportType] = useState<'users' | 'roles' | 'both'>('both');
  const [includeDetails, setIncludeDetails] = useState(true);

  const generateExportData = () => {
    const timestamp = new Date().toISOString();
    const data: any = {
      exportedAt: timestamp,
      version: '1.0',
      metadata: {
        totalUsers: users.length,
        totalRoles: roles.length,
        includeDetails
      }
    };

    if (exportType === 'users' || exportType === 'both') {
      data.users = users.map(user => ({
        id: user.id,
        auth0Id: user.auth0Id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        isMasterAccount: user.isMasterAccount,
        roles: user.roles,
        lastLogin: user.lastLogin,
        picture: user.picture,
        ...(includeDetails && {
          auth0Data: {
            email_verified: user.auth0Data?.email_verified,
            logins_count: user.auth0Data?.logins_count,
            created_at: user.auth0Data?.created_at,
            updated_at: user.auth0Data?.updated_at,
            last_login: user.auth0Data?.last_login,
            last_ip: user.auth0Data?.last_ip
          }
        })
      }));
    }

    if (exportType === 'roles' || exportType === 'both') {
      data.roles = roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description?.split(' - Custom Permissions:')[0] || '',
        ...(includeDetails && {
          customPermissions: extractCustomPermissions(role.description || '')
        })
      }));
    }

    return data;
  };

  const extractCustomPermissions = (description: string) => {
    try {
      const match = description.match(/Custom Permissions: ({.*})/);
      if (match && match[1]) {
        return JSON.parse(match[1]);
      }
    } catch (error) {
      console.error('Error parsing custom permissions:', error);
    }
    return null;
  };

  const downloadJSON = () => {
    const data = generateExportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lacajita-security-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    let csvContent = '';
    
    if (exportType === 'users' || exportType === 'both') {
      csvContent += 'USUARIOS\n';
      csvContent += 'ID,Auth0 ID,Nombre,Email,Activo,Master,Roles,Último Login,Email Verificado,Total Logins\n';
      
      users.forEach(user => {
        csvContent += [
          user.id,
          user.auth0Id || '',
          `"${user.name}"`,
          user.email,
          user.isActive ? 'Sí' : 'No',
          user.isMasterAccount ? 'Sí' : 'No',
          `"${user.roles.join(', ')}"`,
          user.lastLogin || '',
          user.auth0Data?.email_verified ? 'Sí' : 'No',
          user.auth0Data?.logins_count || 0
        ].join(',') + '\n';
      });
      
      csvContent += '\n';
    }

    if (exportType === 'roles' || exportType === 'both') {
      csvContent += 'ROLES\n';
      csvContent += 'ID,Nombre,Descripción,Permisos Personalizados\n';
      
      roles.forEach(role => {
        const customPerms = extractCustomPermissions(role.description || '');
        csvContent += [
          role.id,
          `"${role.name}"`,
          `"${role.description?.split(' - Custom Permissions:')[0] || ''}"`,
          customPerms ? 'Sí' : 'No'
        ].join(',') + '\n';
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lacajita-security-config-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    if (exportFormat === 'json') {
      downloadJSON();
    } else {
      downloadCSV();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-800">
            📤 Exportar Configuración
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Tipo de exportación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              ¿Qué quieres exportar?
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="both"
                  checked={exportType === 'both'}
                  onChange={(e) => setExportType(e.target.value as any)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">👥🔰 Usuarios y Roles</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="users"
                  checked={exportType === 'users'}
                  onChange={(e) => setExportType(e.target.value as any)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">👥 Solo Usuarios</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="roles"
                  checked={exportType === 'roles'}
                  onChange={(e) => setExportType(e.target.value as any)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">🔰 Solo Roles</span>
              </label>
            </div>
          </div>

          {/* Formato de exportación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Formato de archivo
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="json"
                  checked={exportFormat === 'json'}
                  onChange={(e) => setExportFormat(e.target.value as any)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">📄 JSON (recomendado para respaldo completo)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="csv"
                  checked={exportFormat === 'csv'}
                  onChange={(e) => setExportFormat(e.target.value as any)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">📊 CSV (para análisis en Excel)</span>
              </label>
            </div>
          </div>

          {/* Opciones adicionales */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeDetails}
                onChange={(e) => setIncludeDetails(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Incluir detalles adicionales</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Incluye metadatos de Auth0, permisos personalizados, estadísticas de login, etc.
            </p>
          </div>

          {/* Vista previa */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <h4 className="font-medium text-gray-800 text-sm mb-2">Vista previa:</h4>
            <div className="text-xs text-gray-600 space-y-1">
              {exportType === 'users' || exportType === 'both' ? (
                <div>• {users.length} usuarios</div>
              ) : null}
              {exportType === 'roles' || exportType === 'both' ? (
                <div>• {roles.length} roles</div>
              ) : null}
              <div>• Formato: {exportFormat.toUpperCase()}</div>
              <div>• Detalles: {includeDetails ? 'Incluidos' : 'Básicos'}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            📤 Exportar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportConfigModal;
