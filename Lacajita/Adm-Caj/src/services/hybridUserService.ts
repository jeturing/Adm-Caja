import { apiService } from './apiService';
import { localDB, LocalUser } from './localDB';

export interface SignUpData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  acceptTerms: boolean;
}

export interface UserProfile {
  localId: string;
  emailPrefix: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  isApiUser: boolean;
  createdAt: string;
}

class HybridUserService {
  async registerUser(data: SignUpData): Promise<UserProfile> {
    try {
      // 1. Generar ID local único
      const localId = localDB.generateLocalId();
      const emailPrefix = localDB.extractEmailPrefix(data.email);

      // 2. Intentar crear usuario en la API (datos sensibles)
      let isApiUser = false;

      try {
        await apiService.createAuth0User(data.email, data.password);
        isApiUser = true;
        console.log('✅ Usuario creado exitosamente en Auth0');
      } catch (error) {
        console.warn('⚠️ No se pudo crear usuario en Auth0, se guardará solo localmente:', error);
      }

      // 3. Guardar datos no sensibles localmente
      const localUser: LocalUser = {
        id: localId,
        firstName: data.firstName,
        lastName: data.lastName,
        emailPrefix: emailPrefix,
        phone: data.phone,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await localDB.saveUser(localUser);
      console.log('✅ Datos del usuario guardados localmente');

      // 4. Retornar perfil completo
      const userProfile: UserProfile = {
        localId,
        emailPrefix,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        isApiUser,
        createdAt: localUser.createdAt,
      };

      return userProfile;

    } catch (error) {
      console.error('❌ Error durante el registro:', error);
      throw new Error(`Error en el registro: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  async getUserProfile(email: string): Promise<UserProfile | null> {
    try {
      const emailPrefix = localDB.extractEmailPrefix(email);
      const localUser = await localDB.getUserByEmailPrefix(emailPrefix);

      if (!localUser) {
        return null;
      }

      // Intentar hacer login para verificar si existe en la API
      let isApiUser = false;
      try {
        // No intentamos login aquí, solo marcamos si existe localmente
        // El login se hará por separado
        isApiUser = true; // Asumimos que existe si se registró
      } catch (error) {
        isApiUser = false;
      }

      return {
        localId: localUser.id,
        emailPrefix: localUser.emailPrefix,
        firstName: localUser.firstName,
        lastName: localUser.lastName,
        email: `${localUser.emailPrefix}@${email.split('@')[1]}`, // Reconstruir email
        phone: localUser.phone,
        isApiUser,
        createdAt: localUser.createdAt,
      };

    } catch (error) {
      console.error('Error obteniendo perfil de usuario:', error);
      return null;
    }
  }

  async updateLocalProfile(localId: string, updates: Partial<LocalUser>): Promise<void> {
    try {
      const existingUser = await localDB.getUserById(localId);
      if (!existingUser) {
        throw new Error('Usuario no encontrado');
      }

      const updatedUser: LocalUser = {
        ...existingUser,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await localDB.saveUser(updatedUser);
    } catch (error) {
      console.error('Error actualizando perfil local:', error);
      throw error;
    }
  }

  async syncUserData(): Promise<void> {
    // TODO: Implementar sincronización entre datos locales y API
    // Esto se puede usar para intentar re-sincronizar usuarios que no se pudieron crear en la API
    console.log('🔄 Sincronización de datos (pendiente de implementar)');
  }
}

export const hybridUserService = new HybridUserService();
