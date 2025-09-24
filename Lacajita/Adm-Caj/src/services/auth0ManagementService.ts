import { Auth0User, Auth0Role, User, MASTER_ACCOUNT_EMAIL } from '../types/permissions';
import { ENV } from '../config/env';

export class Auth0ManagementService {
  private baseUrl: string;
  private domain: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.domain = ENV.AUTH0_DOMAIN;
    this.clientId = ENV.AUTH0_M2M_CLIENT_ID;
    this.clientSecret = ENV.AUTH0_M2M_CLIENT_SECRET;
    this.baseUrl = `https://${this.domain}/api/v2`;
  }

  /**
   * Obtiene un token de acceso para la API de Auth0 Management
   */
  private async getManagementToken(): Promise<string> {
  // In browser apps we must not request M2M tokens directly. Delegate to backend.
  throw new Error('getManagementToken should not be called from the browser; use backend endpoints under /api/auth0');
  }

  /**
   * Realiza una petición autenticada a la API de Auth0 Management
   */
  private async makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    // Delegate to backend proxy endpoints prefixed with /api/auth0
    return fetch(`/api/auth0${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  }

  /**
   * Obtiene todos los usuarios de Auth0
   */
  async getUsers(page = 0, perPage = 50): Promise<Auth0User[]> {
    try {
      const response = await this.makeAuthenticatedRequest(
        `/users?page=${page}&per_page=${perPage}&include_totals=true&sort=created_at:-1`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }

      const data = await response.json();
      return data.users || [];
    } catch (error) {
      console.error('Error fetching Auth0 users:', error);
      throw error;
    }
  }

  /**
   * Obtiene un usuario específico por ID
   */
  async getUser(userId: string): Promise<Auth0User> {
    try {
  const response = await this.makeAuthenticatedRequest(`/users/${encodeURIComponent(userId)}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch user: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Auth0 user:', error);
      throw error;
    }
  }

  /**
   * Obtiene todos los roles disponibles en Auth0
   */
  async getRoles(): Promise<Auth0Role[]> {
    try {
  const response = await this.makeAuthenticatedRequest('/roles');

      if (!response.ok) {
        throw new Error(`Failed to fetch roles: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Auth0 roles:', error);
      throw error;
    }
  }

  /**
   * Obtiene los roles asignados a un usuario específico
   */
  async getUserRoles(userId: string): Promise<Auth0Role[]> {
    try {
  const response = await this.makeAuthenticatedRequest(`/users/${encodeURIComponent(userId)}/roles`);

      if (!response.ok) {
        throw new Error(`Failed to get user roles: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting user roles:', error);
      throw error;
    }
  }

  /**
   * Asigna roles a un usuario
   */
  async assignRolesToUser(userId: string, roleIds: string[]): Promise<void> {
    // No permitir modificar la cuenta master
    const user = await this.getUser(userId);
    if (user.email === MASTER_ACCOUNT_EMAIL) {
      throw new Error('No se puede modificar la cuenta master');
    }

    try {
      const response = await this.makeAuthenticatedRequest(`/users/${encodeURIComponent(userId)}/roles`, {
        method: 'POST',
        body: JSON.stringify({ roles: roleIds }),
      });

      if (!response.ok) {
        throw new Error(`Failed to assign roles: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error assigning roles to user:', error);
      throw error;
    }
  }

  /**
   * Remueve roles de un usuario
   */
  async removeRolesFromUser(userId: string, roleIds: string[]): Promise<void> {
    // No permitir modificar la cuenta master
    const user = await this.getUser(userId);
    if (user.email === MASTER_ACCOUNT_EMAIL) {
      throw new Error('No se puede modificar la cuenta master');
    }

    try {
      const response = await this.makeAuthenticatedRequest(`/users/${encodeURIComponent(userId)}/roles`, {
        method: 'DELETE',
        body: JSON.stringify({ roles: roleIds }),
      });

      if (!response.ok) {
        throw new Error(`Failed to remove roles: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error removing roles from user:', error);
      throw error;
    }
  }

  /**
   * Actualiza el metadata de un usuario en Auth0
   */
  async updateUserMetadata(userId: string, appMetadata: Record<string, any>, userMetadata: Record<string, any> = {}): Promise<void> {
    // No permitir modificar la cuenta master
    const user = await this.getUser(userId);
    if (user.email === MASTER_ACCOUNT_EMAIL) {
      throw new Error('No se puede modificar la cuenta master');
    }

    try {
      const response = await this.makeAuthenticatedRequest(`/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          app_metadata: appMetadata,
          user_metadata: userMetadata,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update user metadata: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating user metadata:', error);
      throw error;
    }
  }

  /**
   * Crea un nuevo rol en Auth0
   */
  async createRole(name: string, description: string): Promise<Auth0Role> {
    try {
      const response = await this.makeAuthenticatedRequest('/roles', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create role: ${response.statusText} - ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating Auth0 role:', error);
      throw error;
    }
  }

  /**
   * Actualiza un rol existente en Auth0
   */
  async updateRole(roleId: string, name: string, description: string): Promise<Auth0Role> {
    try {
      const response = await this.makeAuthenticatedRequest(`/roles/${encodeURIComponent(roleId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          description,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to update role: ${response.statusText} - ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating Auth0 role:', error);
      throw error;
    }
  }

  /**
   * Elimina un rol de Auth0
   */
  async deleteRole(roleId: string): Promise<void> {
    try {
      const response = await this.makeAuthenticatedRequest(`/roles/${encodeURIComponent(roleId)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to delete role: ${response.statusText} - ${error}`);
      }
    } catch (error) {
      console.error('Error deleting Auth0 role:', error);
      throw error;
    }
  }

  /**
   * Obtiene los permisos de un rol específico
   */
  async getRolePermissions(roleId: string): Promise<any[]> {
    try {
      const response = await this.makeAuthenticatedRequest(`/roles/${encodeURIComponent(roleId)}/permissions`);

      if (!response.ok) {
        throw new Error(`Failed to get role permissions: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting role permissions:', error);
      throw error;
    }
  }

  /**
   * Asigna permisos a un rol
   */
  async assignPermissionsToRole(roleId: string, permissions: Array<{permission_name: string, resource_server_identifier: string}>): Promise<void> {
    try {
      const response = await this.makeAuthenticatedRequest(`/roles/${encodeURIComponent(roleId)}/permissions`, {
        method: 'POST',
        body: JSON.stringify({ permissions }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to assign permissions to role: ${response.statusText} - ${error}`);
      }
    } catch (error) {
      console.error('Error assigning permissions to role:', error);
      throw error;
    }
  }

  /**
   * Remueve permisos de un rol
   */
  async removePermissionsFromRole(roleId: string, permissions: Array<{permission_name: string, resource_server_identifier: string}>): Promise<void> {
    try {
      const response = await this.makeAuthenticatedRequest(`/roles/${encodeURIComponent(roleId)}/permissions`, {
        method: 'DELETE',
        body: JSON.stringify({ permissions }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to remove permissions from role: ${response.statusText} - ${error}`);
      }
    } catch (error) {
      console.error('Error removing permissions from role:', error);
      throw error;
    }
  }

  /**
   * Obtiene todas las APIs de recursos disponibles
   */
  async getResourceServers(): Promise<any[]> {
    try {
      const response = await this.makeAuthenticatedRequest('/resource-servers');

      if (!response.ok) {
        throw new Error(`Failed to get resource servers: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting resource servers:', error);
      throw error;
    }
  }

  /**
   * Crea permisos personalizados para la gestión de menús del sidebar
   */
  async createCustomMenuPermissions(roleId: string, menuPermissions: Record<string, {view: boolean, create: boolean, read: boolean, update: boolean, delete: boolean}>): Promise<void> {
    try {
      // Actualizar el metadata del rol con permisos personalizados
      const role = await this.getRole(roleId);
      
      const response = await this.makeAuthenticatedRequest(`/roles/${encodeURIComponent(roleId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: role.name,
          // Auth0 no tiene metadata para roles, pero podemos usar el description para almacenar info
          description: `${role.description || ''} - Custom Permissions: ${JSON.stringify(menuPermissions)}`
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update role with custom permissions: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error creating custom menu permissions:', error);
      throw error;
    }
  }

  /**
   * Obtiene un rol específico por ID
   */
  async getRole(roleId: string): Promise<Auth0Role> {
    try {
      const response = await this.makeAuthenticatedRequest(`/roles/${encodeURIComponent(roleId)}`);

      if (!response.ok) {
        throw new Error(`Failed to get role: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting role:', error);
      throw error;
    }
  }

  /**
   * Verifica si el usuario current es la cuenta master
   */
  isMasterAccount(email: string): boolean {
    return email === MASTER_ACCOUNT_EMAIL;
  }

  /**
   * Sincroniza un usuario de Auth0 con el sistema local
   */
  async syncUserWithLocal(auth0User: Auth0User): Promise<User> {
    const auth0Roles = await this.getUserRoles(auth0User.user_id);
    
    return {
      id: auth0User.user_id,
      auth0Id: auth0User.user_id,
      email: auth0User.email,
      name: auth0User.name,
      picture: auth0User.picture,
      roles: auth0Roles.map(role => role.id),
      customPermissions: [],
      isActive: !auth0User.blocked_for?.length,
      isMasterAccount: this.isMasterAccount(auth0User.email),
      auth0Data: auth0User,
      auth0Roles: auth0Roles,
      lastLogin: auth0User.last_login ? new Date(auth0User.last_login) : undefined,
      createdAt: new Date(auth0User.created_at),
      updatedAt: new Date(auth0User.updated_at)
    };
  }

  /**
   * Obtiene todos los usuarios sincronizados con sus datos de Auth0
   */
  async getAllSyncedUsers(): Promise<User[]> {
    try {
      const auth0Users = await this.getUsers();
      const syncedUsers: User[] = [];

      for (const auth0User of auth0Users) {
        try {
          const syncedUser = await this.syncUserWithLocal(auth0User);
          syncedUsers.push(syncedUser);
        } catch (error) {
          console.error(`Error syncing user ${auth0User.email}:`, error);
        }
      }

      return syncedUsers;
    } catch (error) {
      console.error('Error getting all synced users:', error);
      throw error;
    }
  }

  /**
   * Crea un nuevo usuario en Auth0
   */
  async createUser(userData: {
    email: string;
    password?: string;
    name?: string;
    nickname?: string;
    picture?: string;
    email_verified?: boolean;
    phone_number?: string;
    user_metadata?: Record<string, any>;
    app_metadata?: Record<string, any>;
    connection?: string;
  }): Promise<Auth0User> {
    try {
      const payload = {
        connection: userData.connection || 'Username-Password-Authentication',
        email: userData.email,
        password: userData.password || this.generateRandomPassword(),
        name: userData.name || userData.email.split('@')[0],
        nickname: userData.nickname,
        picture: userData.picture,
        email_verified: userData.email_verified || false,
        phone_number: userData.phone_number,
        user_metadata: userData.user_metadata || {},
        app_metadata: userData.app_metadata || {},
      };

      const response = await this.makeAuthenticatedRequest('/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create user: ${error.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating Auth0 user:', error);
      throw error;
    }
  }

  /**
   * Actualiza un usuario existente en Auth0
   */
  async updateUser(userId: string, updates: Partial<Auth0User>): Promise<Auth0User> {
    try {
      // Filtrar solo los campos permitidos para actualización
      const allowedFields = [
        'name', 'nickname', 'picture', 'email_verified', 'phone_number', 
        'phone_verified', 'user_metadata', 'app_metadata', 'blocked'
      ];
      
      const payload = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key as keyof Auth0User];
          return obj;
        }, {} as any);

      const response = await this.makeAuthenticatedRequest(`/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to update user: ${error.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating Auth0 user:', error);
      throw error;
    }
  }

  /**
   * Elimina un usuario de Auth0
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      // Verificar que no sea la cuenta master
      if (userId.includes(MASTER_ACCOUNT_EMAIL)) {
        throw new Error('No se puede eliminar la cuenta master');
      }

      const response = await this.makeAuthenticatedRequest(`/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to delete user: ${error.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting Auth0 user:', error);
      throw error;
    }
  }

  /**
   * Obtiene los logs de login de un usuario específico
   */
  async getUserLogs(userId: string): Promise<any[]> {
    try {
      const response = await this.makeAuthenticatedRequest(
        `/logs?q=user_id:"${userId}" AND type:(s OR slo)&sort=date:-1&per_page=10`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch user logs: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching user logs:', error);
      return [];
    }
  }

  /**
   * Obtiene información detallada del último login incluyendo IP
   */
  async getUserLastLoginInfo(userId: string): Promise<{
    last_login?: string;
    last_ip?: string;
    location?: string;
    device?: string;
    browser?: string;
  }> {
    try {
      const logs = await this.getUserLogs(userId);
      const lastLogin = logs.find(log => log.type === 's'); // Successful login
      
      if (lastLogin) {
        return {
          last_login: lastLogin.date,
          last_ip: lastLogin.ip,
          location: lastLogin.location_info ? 
            `${lastLogin.location_info.city_name}, ${lastLogin.location_info.country_name}` : 
            undefined,
          device: lastLogin.user_agent,
          browser: this.extractBrowserInfo(lastLogin.user_agent),
        };
      }
      
      return {};
    } catch (error) {
      console.error('Error fetching user last login info:', error);
      return {};
    }
  }

  /**
   * Extrae información del navegador del user agent
   */
  private extractBrowserInfo(userAgent: string): string {
    if (!userAgent) return 'Desconocido';
    
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    
    return 'Otro';
  }

  /**
   * Genera una contraseña aleatoria segura
   */
  private generateRandomPassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }

  /**
   * Envía email de verificación a un usuario
   */
  async sendVerificationEmail(userId: string): Promise<void> {
    try {
      const response = await this.makeAuthenticatedRequest(`/jobs/verification-email`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to send verification email: ${error.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw error;
    }
  }

  /**
   * Bloquea o desbloquea un usuario
   */
  async setUserBlockedStatus(userId: string, blocked: boolean): Promise<Auth0User> {
    try {
      // Verificar que no sea la cuenta master
      if (userId.includes(MASTER_ACCOUNT_EMAIL) && blocked) {
        throw new Error('No se puede bloquear la cuenta master');
      }

      return await this.updateUser(userId, { blocked } as any);
    } catch (error) {
      console.error('Error updating user blocked status:', error);
      throw error;
    }
  }
}

// Instancia singleton del servicio
export const auth0ManagementService = new Auth0ManagementService();
