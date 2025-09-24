import React, { useState } from 'react';
import { auth0ManagementService } from '../../services/auth0ManagementService';
import { Auth0User } from '../../types/permissions';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: (user: Auth0User) => void;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onUserCreated }) => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
    phone_number: '',
    sendVerificationEmail: true,
    generateRandomPassword: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validaciones
      if (!formData.email || !formData.name) {
        throw new Error('Email y nombre son requeridos');
      }

      if (!formData.generateRandomPassword) {
        if (!formData.password || formData.password.length < 8) {
          throw new Error('La contraseña debe tener al menos 8 caracteres');
        }
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Las contraseñas no coinciden');
        }
      }

      // Crear usuario
      const userData = {
        email: formData.email,
        name: formData.name,
        password: formData.generateRandomPassword ? undefined : formData.password,
        phone_number: formData.phone_number || undefined,
        email_verified: false,
        user_metadata: {
          created_by: 'admin_panel',
          created_at: new Date().toISOString(),
        },
        app_metadata: {
          roles: ['viewer'], // Rol por defecto
          permissions: {},
        },
      };

      const newUser = await auth0ManagementService.createUser(userData);

      // Enviar email de verificación si está habilitado
      if (formData.sendVerificationEmail) {
        try {
          await auth0ManagementService.sendVerificationEmail(newUser.user_id);
        } catch (emailError) {
          console.warn('Error enviando email de verificación:', emailError);
        }
      }

      onUserCreated(newUser);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      email: '',
      name: '',
      password: '',
      confirmPassword: '',
      phone_number: '',
      sendVerificationEmail: true,
      generateRandomPassword: false,
    });
    setError(null);
    onClose();
  };

  const generateRandomPassword = () => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData(prev => ({ 
      ...prev, 
      password, 
      confirmPassword: password 
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              👤 Crear Nuevo Usuario
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="usuario@ejemplo.com"
                required
              />
            </div>

            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Juan Pérez"
                required
              />
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+1234567890"
              />
            </div>

            {/* Opción de contraseña automática */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="generateRandomPassword"
                checked={formData.generateRandomPassword}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  generateRandomPassword: e.target.checked,
                  password: e.target.checked ? '' : prev.password,
                  confirmPassword: e.target.checked ? '' : prev.confirmPassword
                }))}
                className="mr-2"
              />
              <label htmlFor="generateRandomPassword" className="text-sm text-gray-700">
                Generar contraseña automáticamente
              </label>
            </div>

            {/* Campos de contraseña */}
            {!formData.generateRandomPassword && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña *
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Mínimo 8 caracteres"
                    minLength={8}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar Contraseña *
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Repetir contraseña"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    🎲 Generar Contraseña
                  </button>
                </div>
              </>
            )}

            {/* Email de verificación */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="sendVerificationEmail"
                checked={formData.sendVerificationEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, sendVerificationEmail: e.target.checked }))}
                className="mr-2"
              />
              <label htmlFor="sendVerificationEmail" className="text-sm text-gray-700">
                Enviar email de verificación
              </label>
            </div>

            {/* Información adicional */}
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-700">
              <p><strong>ℹ️ Información:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>El usuario se creará con rol "Visualizador" por defecto</li>
                <li>Podrás asignar roles y permisos después de la creación</li>
                {formData.generateRandomPassword && (
                  <li>Se generará una contraseña segura automáticamente</li>
                )}
              </ul>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400"
                disabled={loading}
              >
                {loading ? '⏳ Creando...' : '✅ Crear Usuario'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateUserModal;
