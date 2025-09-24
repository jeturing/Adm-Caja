import { Auth0User, Auth0Role, User, MASTER_ACCOUNT_EMAIL } from '../types/permissions';

/**
 * Servicio temporal Mock para Auth0 Management API
 * Usado mientras configuramos la aplicación Machine to Machine
 */
export class MockAuth0ManagementService {
  
  /**
   * Obtiene usuarios mock de Auth0
   */
  async getUsers(): Promise<Auth0User[]> {
    // Simulamos datos de usuarios mock
    return [
      {
        user_id: 'auth0|master001',
        email: MASTER_ACCOUNT_EMAIL,
        name: 'Super Admin',
        nickname: 'admin',
        picture: 'https://via.placeholder.com/64',
        email_verified: true,
        identities: [
          {
            provider: 'auth0',
            user_id: 'master001',
            connection: 'Username-Password-Authentication',
            isSocial: false
          }
        ],
        passkeys: [],
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        logins_count: 100,
        user_metadata: {},
        app_metadata: {
          roles: ['admin'],
          permissions: {
            dashboard: { create: true, read: true, update: true, delete: true },
            'auth-debug': { create: true, read: true, update: true, delete: true },
            'video-management': { create: true, read: true, update: true, delete: true },
            analytics: { create: true, read: true, update: true, delete: true },
            'content-management': { create: true, read: true, update: true, delete: true },
            'user-management': { create: true, read: true, update: true, delete: true },
            'playlist-management': { create: true, read: true, update: true, delete: true },
            'live-streaming': { create: true, read: true, update: true, delete: true },
            settings: { create: true, read: true, update: true, delete: true },
            security: { create: true, read: true, update: true, delete: true }
          }
        }
      },
      {
        user_id: 'auth0|editor001',
        email: 'editor@example.com',
        name: 'Content Editor',
        nickname: 'editor',
        picture: 'https://via.placeholder.com/64',
        email_verified: true,
        identities: [
          {
            provider: 'auth0',
            user_id: 'editor001',
            connection: 'Username-Password-Authentication',
            isSocial: false
          }
        ],
        passkey: [],
        created_at: '2023-06-01T00:00:00.000Z',
        updated_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        logins_count: 45,
        user_metadata: {},
        app_metadata: {
          roles: ['editor'],
          permissions: {
            dashboard: { create: false, read: true, update: false, delete: false },
            'video-management': { create: true, read: true, update: true, delete: false },
            'content-management': { create: true, read: true, update: true, delete: false },
            'playlist-management': { create: true, read: true, update: true, delete: false }
          }
        }
      },
      {
        user_id: 'auth0|viewer001',
        email: 'viewer@example.com',
        name: 'Content Viewer',
        nickname: 'viewer',
        picture: 'https://via.placeholder.com/64',
        email_verified: true,
        identities: [
          {
            provider: 'auth0',
            user_id: 'viewer001',
            connection: 'Username-Password-Authentication',
            isSocial: false
          }
        ],
        passkey: [],
        created_at: '2023-09-01T00:00:00.000Z',
        updated_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        logins_count: 12,
        user_metadata: {},
        app_metadata: {
          roles: ['viewer'],
          permissions: {
            dashboard: { create: false, read: true, update: false, delete: false },
            'video-management': { create: false, read: true, update: false, delete: false },
            analytics: { create: false, read: true, update: false, delete: false }
          }
        }
      }
    ];
  }

  /**
   * Obtiene roles mock de Auth0
   */
  async getRoles(): Promise<Auth0Role[]> {
    return [
      {
        id: 'rol_admin123',
        name: 'admin',
        description: 'Administrador con acceso completo al sistema'
      },
      {
        id: 'rol_editor456',
        name: 'editor',
        description: 'Editor de contenido con permisos de creación y edición'
      },
      {
        id: 'rol_manager789',
        name: 'manager',
        description: 'Gerente con permisos de supervisión y reportes'
      },
      {
        id: 'rol_viewer012',
        name: 'viewer',
        description: 'Visualizador con acceso de solo lectura'
      }
    ];
  }

  /**
   * Obtiene todos los usuarios sincronizados (mock)
   */
  async getAllSyncedUsers(): Promise<User[]> {
    const auth0Users = await this.getUsers();
    return auth0Users.map(auth0User => ({
      id: auth0User.user_id,
      email: auth0User.email,
      name: auth0User.name || auth0User.nickname || auth0User.email,
      roles: auth0User.app_metadata?.roles || [],
      permissions: auth0User.app_metadata?.permissions || {},
      lastLogin: auth0User.last_login || null,
      isActive: true,
      createdAt: auth0User.created_at,
      isMaster: auth0User.email === MASTER_ACCOUNT_EMAIL
    }));
  }

  /**
   * Asigna roles a un usuario (mock - solo simula la operación)
   */
  async assignRolesToUser(userId: string, roleIds: string[]): Promise<void> {
    console.log(`🔧 [MOCK] Asignando roles ${roleIds.join(', ')} al usuario ${userId}`);
    // En un entorno real, esto haría la llamada a la API de Auth0
    await new Promise(resolve => setTimeout(resolve, 500)); // Simular delay de red
  }

  /**
   * Remueve roles de un usuario (mock - solo simula la operación)
   */
  async removeRolesFromUser(userId: string, roleIds: string[]): Promise<void> {
    console.log(`🔧 [MOCK] Removiendo roles ${roleIds.join(', ')} del usuario ${userId}`);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simular delay de red
  }

  /**
   * Actualiza metadatos de usuario (mock - solo simula la operación)
   */
  async updateUserMetadata(userId: string, metadata: any): Promise<void> {
    console.log(`🔧 [MOCK] Actualizando metadatos del usuario ${userId}:`, metadata);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simular delay de red
  }

  /**
   * Sincroniza un usuario con el sistema local (mock)
   */
  async syncUserWithLocal(auth0User: Auth0User): Promise<User> {
    return {
      id: auth0User.user_id,
      email: auth0User.email,
      name: auth0User.name || auth0User.nickname || auth0User.email,
      roles: auth0User.app_metadata?.roles || [],
      permissions: auth0User.app_metadata?.permissions || {},
      lastLogin: auth0User.last_login || null,
      isActive: true,
      createdAt: auth0User.created_at,
      isMaster: auth0User.email === MASTER_ACCOUNT_EMAIL
    };
  }
}

// Instancia exportada del servicio mock
export const mockAuth0ManagementService = new MockAuth0ManagementService();
