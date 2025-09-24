export interface Permission {
  id: string;
  name: string;
  description: string;
  type: 'crud' | 'view' | 'admin';
}

// Tipos para Auth0
export interface Auth0User {
  user_id: string;
  email: string;
  name: string;
  nickname?: string;
  picture?: string;
  email_verified: boolean;
  phone_number?: string;
  phone_verified?: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
  last_ip?: string;
  logins_count: number;
  blocked_for: string[];
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
  identities?: Array<{
    connection: string;
    provider: string;
    user_id: string;
    isSocial: boolean;
  }>;
  passkeys?: Array<{
    id: string;
    type: string;
    confirmed: boolean;
  }>;
  // Información adicional de Auth0
  given_name?: string;
  family_name?: string;
  locale?: string;
  multifactor?: string[];
  last_password_reset?: string;
  username?: string;
  // Información de seguridad
  login_data?: {
    ip: string;
    user_agent: string;
    country?: string;
    city?: string;
    device?: string;
    browser?: string;
  };
}

export interface Auth0Role {
  id: string;
  name: string;
  description?: string;
}

export interface CrudPermissions {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export interface MenuPermission {
  menuId: string;
  menuName: string;
  path: string;
  icon: string;
  allowed: boolean;
  crudPermissions?: CrudPermissions;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  level: 'admin' | 'editor' | 'viewer' | 'guest';
  permissions: string[];
  menuPermissions: MenuPermission[];
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  auth0Id: string;
  email: string;
  name: string;
  picture?: string;
  roles: string[];
  customPermissions: MenuPermission[];
  isActive: boolean;
  isMasterAccount: boolean;
  auth0Data?: Auth0User;
  auth0Roles?: Auth0Role[];
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Cuenta master que no se puede modificar
export const MASTER_ACCOUNT_EMAIL = 'soc@jeturing.com';

export interface PermissionMatrix {
  [userId: string]: {
    user: User;
    effectivePermissions: MenuPermission[];
    roleBasedPermissions: MenuPermission[];
    customPermissions: MenuPermission[];
  };
}

// Definición de todos los menús del sidebar
export const SIDEBAR_MENUS: Omit<MenuPermission, 'allowed' | 'crudPermissions'>[] = [
  // Dashboard
  { menuId: 'dashboard', menuName: 'Dashboard', path: '/dashboard', icon: 'GridIcon' },
  
  // Usuarios
  { menuId: 'users', menuName: 'Lista de Usuarios', path: '/users', icon: 'UserCircleIcon' },
  { menuId: 'signup', menuName: 'Registrar Usuario', path: '/signup', icon: 'UserCircleIcon' },
  { menuId: 'signin', menuName: 'Iniciar Sesión', path: '/signin', icon: 'UserCircleIcon' },
  
  // Contenido
  { menuId: 'videos', menuName: 'Videos', path: '/videos', icon: 'FolderIcon' },
  { menuId: 'video-viewer', menuName: 'Ver Videos Reales', path: '/video-viewer', icon: 'FolderIcon' },
  { menuId: 'videos-config', menuName: 'Configurar JWPlayer', path: '/videos-config', icon: 'FolderIcon' },
  { menuId: 'api-content', menuName: 'API Real', path: '/api-content', icon: 'FolderIcon' },
  { menuId: 'playlists', menuName: 'Playlists', path: '/playlists', icon: 'FolderIcon' },
  { menuId: 'seasons', menuName: 'Temporadas', path: '/seasons', icon: 'FolderIcon' },
  { menuId: 'segments', menuName: 'Segmentos', path: '/segments', icon: 'FolderIcon' },
  { menuId: 'carousel', menuName: 'Carousel', path: '/carousel', icon: 'FolderIcon' },
  
  // Analytics
  { menuId: 'analytics', menuName: 'Dashboard Analytics', path: '/analytics', icon: 'PieChartIcon' },
  { menuId: 'reports', menuName: 'Reportes', path: '/reports', icon: 'PieChartIcon' },
  { menuId: 'stats', menuName: 'Estadísticas', path: '/stats', icon: 'PieChartIcon' },
  
  // Herramientas
  { menuId: 'api-test', menuName: 'Integración API', path: '/api-test', icon: 'PlugInIcon' },
  { menuId: 'jwplayer-test', menuName: 'Test JWPlayer CDN', path: '/jwplayer-test', icon: 'PlugInIcon' },
  { menuId: 'security', menuName: 'Configuración de Seguridad', path: '/security', icon: 'LockIcon' },
  { menuId: 'calendar', menuName: 'Calendario', path: '/calendar', icon: 'CalenderIcon' },
  { menuId: 'basic-tables', menuName: 'Tablas Básicas', path: '/basic-tables', icon: 'TableIcon' },
  { menuId: 'data-tables', menuName: 'Tablas de Datos', path: '/data-tables', icon: 'TableIcon' },
  { menuId: 'form-elements', menuName: 'Elementos de Forma', path: '/form-elements', icon: 'ListIcon' },
  { menuId: 'form-layout', menuName: 'Layout de Forma', path: '/form-layout', icon: 'ListIcon' },
  
  // Soporte
  { menuId: 'chat', menuName: 'Chat', path: '/chat', icon: 'ChatIcon' },
  { menuId: 'inbox', menuName: 'Bandeja de Entrada', path: '/inbox', icon: 'MailIcon' },
  { menuId: 'inbox-details', menuName: 'Detalles Email', path: '/inbox-details', icon: 'MailIcon' },
  { menuId: 'docs', menuName: 'API Docs', path: '/docs', icon: 'DocsIcon' },
  { menuId: 'user-guide', menuName: 'Guía de Usuario', path: '/user-guide', icon: 'DocsIcon' },
  { menuId: 'pricing-tables', menuName: 'Tabla de Precios', path: '/pricing-tables', icon: 'PageIcon' },
  { menuId: 'faq', menuName: 'FAQ', path: '/faq', icon: 'PageIcon' },
  { menuId: 'blank', menuName: 'Página en Blanco', path: '/blank', icon: 'PageIcon' },
];

// Roles predefinidos
export const DEFAULT_ROLES: Role[] = [
  {
    id: 'admin',
    name: 'Administrador',
    description: 'Acceso completo a todas las funcionalidades del sistema',
    level: 'admin',
    permissions: ['*'],
    menuPermissions: SIDEBAR_MENUS.map(menu => ({
      ...menu,
      allowed: true,
      crudPermissions: { create: true, read: true, update: true, delete: true }
    })),
    color: '#ef4444',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'editor',
    name: 'Editor',
    description: 'Puede gestionar contenido pero no usuarios ni configuraciones críticas',
    level: 'editor',
    permissions: ['content.*', 'analytics.read'],
    menuPermissions: SIDEBAR_MENUS.map(menu => {
      const isContentMenu = ['videos', 'playlists', 'seasons', 'segments', 'carousel'].includes(menu.menuId);
      const isAnalyticsMenu = menu.menuId === 'analytics';
      const isDashboard = menu.menuId === 'dashboard';
      
      return {
        ...menu,
        allowed: isContentMenu || isAnalyticsMenu || isDashboard,
        crudPermissions: isContentMenu ? 
          { create: true, read: true, update: true, delete: true } :
          { create: false, read: true, update: false, delete: false }
      };
    }),
    color: '#3b82f6',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'viewer',
    name: 'Visualizador',
    description: 'Solo puede ver contenido, no puede modificar nada',
    level: 'viewer',
    permissions: ['*.read'],
    menuPermissions: SIDEBAR_MENUS.map(menu => ({
      ...menu,
      allowed: !['security', 'api-test', 'users'].includes(menu.menuId),
      crudPermissions: { create: false, read: true, update: false, delete: false }
    })),
    color: '#10b981',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'guest',
    name: 'Invitado',
    description: 'Acceso muy limitado, solo dashboard y documentación',
    level: 'guest',
    permissions: ['dashboard.read', 'docs.read'],
    menuPermissions: SIDEBAR_MENUS.map(menu => ({
      ...menu,
      allowed: ['dashboard', 'docs', 'user-guide'].includes(menu.menuId),
      crudPermissions: { create: false, read: true, update: false, delete: false }
    })),
    color: '#6b7280',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];
