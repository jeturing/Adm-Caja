import { User, Role, MenuPermission, PermissionMatrix, DEFAULT_ROLES, SIDEBAR_MENUS } from '../types/permissions';

class PermissionsService {
  private users: User[] = [];
  private roles: Role[] = [...DEFAULT_ROLES];
  private storageKey = 'lacajita_permissions';

  constructor() {
    this.loadFromStorage();
  }

  // Almacenamiento local
  private saveToStorage() {
    try {
      const data = {
        users: this.users,
        roles: this.roles,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving permissions to storage:', error);
    }
  }

  private loadFromStorage() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        this.users = parsed.users || [];
        this.roles = parsed.roles || [...DEFAULT_ROLES];
      }
    } catch (error) {
      console.error('Error loading permissions from storage:', error);
      this.roles = [...DEFAULT_ROLES];
    }
  }

  // Gestión de usuarios
  async getUsers(): Promise<User[]> {
    return this.users;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.find(user => user.id === id) || null;
  }

  async getUserByAuth0Id(auth0Id: string): Promise<User | null> {
    return this.users.find(user => user.auth0Id === auth0Id) || null;
  }

  async createUser(userData: Partial<User>): Promise<User> {
    const newUser: User = {
      id: `user_${Date.now()}`,
      auth0Id: userData.auth0Id || '',
      email: userData.email || '',
      name: userData.name || '',
      picture: userData.picture,
      roles: userData.roles || ['guest'],
      customPermissions: userData.customPermissions || [],
      isActive: userData.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.users.push(newUser);
    this.saveToStorage();
    return newUser;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) return null;

    this.users[userIndex] = {
      ...this.users[userIndex],
      ...updates,
      updatedAt: new Date()
    };

    this.saveToStorage();
    return this.users[userIndex];
  }

  async deleteUser(id: string): Promise<boolean> {
    const initialLength = this.users.length;
    this.users = this.users.filter(user => user.id !== id);
    
    if (this.users.length < initialLength) {
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Gestión de roles
  async getRoles(): Promise<Role[]> {
    return this.roles;
  }

  async getRoleById(id: string): Promise<Role | null> {
    return this.roles.find(role => role.id === id) || null;
  }

  async createRole(roleData: Partial<Role>): Promise<Role> {
    const newRole: Role = {
      id: `role_${Date.now()}`,
      name: roleData.name || '',
      description: roleData.description || '',
      level: roleData.level || 'guest',
      permissions: roleData.permissions || [],
      menuPermissions: roleData.menuPermissions || SIDEBAR_MENUS.map(menu => ({
        ...menu,
        allowed: false,
        crudPermissions: { create: false, read: false, update: false, delete: false }
      })),
      color: roleData.color || '#6b7280',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.roles.push(newRole);
    this.saveToStorage();
    return newRole;
  }

  async updateRole(id: string, updates: Partial<Role>): Promise<Role | null> {
    const roleIndex = this.roles.findIndex(role => role.id === id);
    if (roleIndex === -1) return null;

    this.roles[roleIndex] = {
      ...this.roles[roleIndex],
      ...updates,
      updatedAt: new Date()
    };

    this.saveToStorage();
    return this.roles[roleIndex];
  }

  async deleteRole(id: string): Promise<boolean> {
    // No permitir eliminar roles predefinidos
    if (['admin', 'editor', 'viewer', 'guest'].includes(id)) {
      return false;
    }

    const initialLength = this.roles.length;
    this.roles = this.roles.filter(role => role.id !== id);
    
    // Remover el rol de todos los usuarios que lo tengan
    this.users.forEach(user => {
      user.roles = user.roles.filter(roleId => roleId !== id);
    });

    if (this.roles.length < initialLength) {
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Cálculo de permisos efectivos
  async getUserEffectivePermissions(userId: string): Promise<MenuPermission[]> {
    const user = await this.getUserById(userId);
    if (!user) return [];

    const rolePermissions: MenuPermission[] = [];
    
    // Obtener permisos de todos los roles del usuario
    for (const roleId of user.roles) {
      const role = await this.getRoleById(roleId);
      if (role) {
        rolePermissions.push(...role.menuPermissions);
      }
    }

    // Combinar permisos de roles con permisos personalizados
    const effectivePermissions = SIDEBAR_MENUS.map(menu => {
      // Buscar en permisos de roles
      const rolePermission = rolePermissions.find(p => p.menuId === menu.menuId);
      
      // Buscar en permisos personalizados
      const customPermission = user.customPermissions.find(p => p.menuId === menu.menuId);
      
      // Los permisos personalizados sobrescriben los de rol
      if (customPermission) {
        return customPermission;
      }
      
      // Si hay permisos de rol, usar esos
      if (rolePermission) {
        return rolePermission;
      }
      
      // Por defecto, sin acceso
      return {
        ...menu,
        allowed: false,
        crudPermissions: { create: false, read: false, update: false, delete: false }
      };
    });

    return effectivePermissions;
  }

  // Obtener matriz completa de permisos
  async getPermissionMatrix(): Promise<PermissionMatrix> {
    const matrix: PermissionMatrix = {};

    for (const user of this.users) {
      const effectivePermissions = await this.getUserEffectivePermissions(user.id);
      
      // Calcular permisos basados en roles
      const roleBasedPermissions: MenuPermission[] = [];
      for (const roleId of user.roles) {
        const role = await this.getRoleById(roleId);
        if (role) {
          roleBasedPermissions.push(...role.menuPermissions);
        }
      }

      matrix[user.id] = {
        user,
        effectivePermissions,
        roleBasedPermissions,
        customPermissions: user.customPermissions
      };
    }

    return matrix;
  }

  // Verificar permisos específicos
  async hasPermission(userId: string, menuId: string, action: 'create' | 'read' | 'update' | 'delete' = 'read'): Promise<boolean> {
    const permissions = await this.getUserEffectivePermissions(userId);
    const menuPermission = permissions.find(p => p.menuId === menuId);
    
    if (!menuPermission || !menuPermission.allowed) {
      return false;
    }

    if (!menuPermission.crudPermissions) {
      return menuPermission.allowed; // Solo verificar acceso general
    }

    return menuPermission.crudPermissions[action];
  }

  // Sincronizar con Auth0
  async syncWithAuth0User(auth0User: any): Promise<User> {
    let user = await this.getUserByAuth0Id(auth0User.sub);
    
    if (!user) {
      // Crear nuevo usuario si no existe
      user = await this.createUser({
        auth0Id: auth0User.sub,
        email: auth0User.email,
        name: auth0User.name,
        picture: auth0User.picture,
        roles: ['guest'], // Rol por defecto
        lastLogin: new Date()
      });
    } else {
      // Actualizar información del usuario existente
      await this.updateUser(user.id, {
        email: auth0User.email,
        name: auth0User.name,
        picture: auth0User.picture,
        lastLogin: new Date()
      });
    }

    return user;
  }

  // Exportar/Importar configuración
  exportConfiguration(): string {
    const config = {
      users: this.users,
      roles: this.roles,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
    return JSON.stringify(config, null, 2);
  }

  async importConfiguration(configJson: string): Promise<boolean> {
    try {
      const config = JSON.parse(configJson);
      
      if (config.users && config.roles) {
        this.users = config.users;
        this.roles = config.roles;
        this.saveToStorage();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error importing configuration:', error);
      return false;
    }
  }

  // Resetear a configuración por defecto
  resetToDefaults(): void {
    this.users = [];
    this.roles = [...DEFAULT_ROLES];
    this.saveToStorage();
  }
}

export const permissionsService = new PermissionsService();
