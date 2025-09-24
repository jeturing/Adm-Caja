import { auth0ManagementService } from '../services/auth0ManagementService';
import { SIDEBAR_MENUS } from '../types/permissions';

/**
 * Script para inicializar la estructura básica de roles
 * Se ejecuta una sola vez para configurar el sistema
 */

// Definición de roles básicos con sus permisos
const BASIC_ROLES = [
  {
    name: 'Super_Admin',
    description: 'Administrador con acceso completo al sistema',
    permissions: {
      // Admin tiene todos los permisos
      ...Object.fromEntries(
        SIDEBAR_MENUS.map(menu => [
          menu.menuId,
          { view: true, create: true, read: true, update: true, delete: true }
        ])
      )
    }
  },
  {
    name: 'Content_Manager',
    description: 'Gestor de contenido con permisos de edición',
    permissions: {
      dashboard: { view: true, create: false, read: true, update: false, delete: false },
      analytics: { view: true, create: false, read: true, update: false, delete: false },
      ecommerce: { view: true, create: true, read: true, update: true, delete: false },
      calendar: { view: true, create: true, read: true, update: true, delete: false },
      profile: { view: true, create: false, read: true, update: true, delete: false },
      forms: { view: true, create: true, read: true, update: true, delete: true },
      tables: { view: true, create: true, read: true, update: true, delete: false },
      settings: { view: false, create: false, read: false, update: false, delete: false },
      authentication: { view: false, create: false, read: false, update: false, delete: false },
      // Agregar todos los demás menús con permisos limitados
      ...Object.fromEntries(
        SIDEBAR_MENUS.filter(menu => 
          !['dashboard', 'analytics', 'ecommerce', 'calendar', 'profile', 'forms', 'tables', 'settings', 'authentication'].includes(menu.menuId)
        ).map(menu => [
          menu.menuId,
          { view: true, create: false, read: true, update: false, delete: false }
        ])
      )
    }
  },
  {
    name: 'Editor',
    description: 'Editor con permisos de modificación limitados',
    permissions: {
      dashboard: { view: true, create: false, read: true, update: false, delete: false },
      analytics: { view: true, create: false, read: true, update: false, delete: false },
      ecommerce: { view: true, create: false, read: true, update: true, delete: false },
      calendar: { view: true, create: true, read: true, update: true, delete: false },
      profile: { view: true, create: false, read: true, update: true, delete: false },
      forms: { view: true, create: false, read: true, update: true, delete: false },
      tables: { view: true, create: false, read: true, update: false, delete: false },
      settings: { view: false, create: false, read: false, update: false, delete: false },
      authentication: { view: false, create: false, read: false, update: false, delete: false },
      // Resto con solo lectura
      ...Object.fromEntries(
        SIDEBAR_MENUS.filter(menu => 
          !['dashboard', 'analytics', 'ecommerce', 'calendar', 'profile', 'forms', 'tables', 'settings', 'authentication'].includes(menu.menuId)
        ).map(menu => [
          menu.menuId,
          { view: true, create: false, read: true, update: false, delete: false }
        ])
      )
    }
  },
  {
    name: 'Viewer',
    description: 'Visualizador con acceso solo de lectura',
    permissions: {
      dashboard: { view: true, create: false, read: true, update: false, delete: false },
      analytics: { view: true, create: false, read: true, update: false, delete: false },
      profile: { view: true, create: false, read: true, update: true, delete: false },
      // Resto solo lectura básica
      ...Object.fromEntries(
        SIDEBAR_MENUS.filter(menu => 
          !['dashboard', 'analytics', 'profile', 'settings', 'authentication'].includes(menu.menuId)
        ).map(menu => [
          menu.menuId,
          { view: true, create: false, read: true, update: false, delete: false }
        ])
      ),
      settings: { view: false, create: false, read: false, update: false, delete: false },
      authentication: { view: false, create: false, read: false, update: false, delete: false }
    }
  },
  {
    name: 'Guest',
    description: 'Invitado con acceso muy limitado',
    permissions: {
      dashboard: { view: true, create: false, read: false, update: false, delete: false },
      profile: { view: true, create: false, read: true, update: true, delete: false },
      // Resto sin acceso
      ...Object.fromEntries(
        SIDEBAR_MENUS.filter(menu => 
          !['dashboard', 'profile'].includes(menu.menuId)
        ).map(menu => [
          menu.menuId,
          { view: false, create: false, read: false, update: false, delete: false }
        ])
      )
    }
  }
];

/**
 * Función para inicializar roles básicos
 */
export const initializeBasicRoles = async (): Promise<void> => {
  console.log('🔰 Iniciando creación de roles básicos...');
  
  try {
    // Verificar conexión con Auth0
    const existingRoles = await auth0ManagementService.getRoles();
    console.log(`📋 Roles existentes encontrados: ${existingRoles.length}`);

    // Crear cada rol básico
    for (const roleData of BASIC_ROLES) {
      try {
        // Verificar si el rol ya existe
        const existingRole = existingRoles.find(r => r.name === roleData.name);
        
        if (existingRole) {
          console.log(`⚠️ Rol '${roleData.name}' ya existe, actualizando permisos...`);
          
          // Actualizar permisos del rol existente
          await auth0ManagementService.createCustomMenuPermissions(
            existingRole.id, 
            roleData.permissions
          );
          
          console.log(`✅ Rol '${roleData.name}' actualizado correctamente`);
        } else {
          console.log(`🔄 Creando rol '${roleData.name}'...`);
          
          // Crear nuevo rol
          const newRole = await auth0ManagementService.createRole(
            roleData.name,
            roleData.description
          );
          
          // Asignar permisos personalizados
          await auth0ManagementService.createCustomMenuPermissions(
            newRole.id,
            roleData.permissions
          );
          
          console.log(`✅ Rol '${roleData.name}' creado correctamente`);
        }
        
        // Esperar un poco entre creaciones para no sobrecargar la API
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Error procesando rol '${roleData.name}':`, error);
      }
    }

    console.log('🎉 Inicialización de roles completada');
    
  } catch (error) {
    console.error('❌ Error durante la inicialización de roles:', error);
    throw error;
  }
};

/**
 * Función para verificar la estructura de roles
 */
export const verifyRoleStructure = async (): Promise<boolean> => {
  try {
    const roles = await auth0ManagementService.getRoles();
    const basicRoleNames = BASIC_ROLES.map(r => r.name);
    
    const missingRoles = basicRoleNames.filter(name => 
      !roles.some(role => role.name === name)
    );
    
    if (missingRoles.length > 0) {
      console.log(`⚠️ Roles faltantes: ${missingRoles.join(', ')}`);
      return false;
    }
    
    console.log('✅ Estructura de roles verificada correctamente');
    return true;
    
  } catch (error) {
    console.error('❌ Error verificando estructura de roles:', error);
    return false;
  }
};

/**
 * Exportar información de roles para referencia
 */
export const ROLE_DESCRIPTIONS = {
  Super_Admin: 'Acceso completo al sistema. Puede gestionar usuarios, roles, configuraciones y todos los módulos.',
  Content_Manager: 'Gestiona contenido y funcionalidades principales. Acceso limitado a configuraciones de seguridad.',
  Editor: 'Edita contenido existente con permisos limitados. No puede crear o eliminar elementos importantes.',
  Viewer: 'Solo visualización y lectura. Puede ver dashboards y reportes pero no modificar nada.',
  Guest: 'Acceso muy limitado para invitados temporales. Solo perfil y dashboard básico.'
};

// Configuración de permisos por defecto para nuevos usuarios
export const DEFAULT_USER_ROLE = 'Viewer';
