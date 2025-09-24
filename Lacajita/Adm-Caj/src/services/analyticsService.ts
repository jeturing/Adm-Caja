import { auth0ManagementService } from './auth0ManagementService';

export interface AnalyticsMetric {
  id: string;
  title: string;
  value: string | number;
  change: string;
  direction: 'up' | 'down' | 'neutral';
  comparisonText: string;
  rawValue?: number;
}

export interface ChartData {
  name: string;
  data: number[];
}

export interface DeviceData {
  name: string;
  value: number;
  percentage: number;
}

export interface PageData {
  page: string;
  visitors: number;
  percentage: number;
}

export interface ChannelData {
  source: string;
  visitors: number;
  percentage: number;
}

export interface DeviceSessionData {
  device: string;
  sessions: number;
  percentage: number;
}

export interface ActiveUsersData {
  current: number;
  daily: number;
  weekly: number;
  monthly: number;
  chartData: {
    name: string;
    data: number[];
  }[];
  categories: string[];
}

export interface RecentOrder {
  id: string;
  product: string;
  category: string;
  country: string;
  value: number;
  status: 'completed' | 'pending' | 'cancelled';
  date: Date;
}

export interface DemographicData {
  country: string;
  value: number;
  coordinates: [number, number];
}

class AnalyticsService {
  private baseApiUrl = '/api'; // Proxy configurado en vite

  // Simular datos en tiempo real basados en datos del sistema
  async getSystemMetrics(): Promise<AnalyticsMetric[]> {
    try {
      // Obtener datos reales de usuarios y roles
      const users = await auth0ManagementService.getUsers();
      const roles = await auth0ManagementService.getRoles();
      
      // Calcular métricas basadas en datos reales
      const totalUsers = users.length;
      const activeUsers = users.filter(user => user.email_verified).length;
      const masterAccounts = users.filter(user => user.email?.includes('jeturing')).length;
      const totalRoles = roles.length;

      // Simular cambios porcentuales basados en datos reales
      const userGrowth = this.calculateGrowthRate(totalUsers);
      const activeRate = totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : '0';
      const roleUtilization = roles.length > 0 ? ((totalUsers / (roles.length * 10)) * 100).toFixed(1) : '0';

      return [
        {
          id: '1',
          title: 'Total de Usuarios',
          value: totalUsers.toString(),
          change: `${userGrowth > 0 ? '+' : ''}${userGrowth}%`,
          direction: userGrowth > 0 ? 'up' : userGrowth < 0 ? 'down' : 'neutral',
          comparisonText: 'Vs mes anterior',
          rawValue: totalUsers
        },
        {
          id: '2',
          title: 'Usuarios Activos',
          value: activeUsers.toString(),
          change: `${activeRate}%`,
          direction: parseFloat(activeRate) > 80 ? 'up' : parseFloat(activeRate) > 60 ? 'neutral' : 'down',
          comparisonText: 'Tasa de activación',
          rawValue: activeUsers
        },
        {
          id: '3',
          title: 'Roles Configurados',
          value: totalRoles.toString(),
          change: totalRoles >= 5 ? '+100%' : '+50%',
          direction: totalRoles >= 5 ? 'up' : 'neutral',
          comparisonText: 'Sistema configurado',
          rawValue: totalRoles
        },
        {
          id: '4',
          title: 'Cuentas Master',
          value: masterAccounts.toString(),
          change: '0%',
          direction: 'neutral',
          comparisonText: 'Cuentas protegidas',
          rawValue: masterAccounts
        }
      ];
    } catch (error) {
      console.error('Error obteniendo métricas del sistema:', error);
      return this.getFallbackMetrics();
    }
  }

  private calculateGrowthRate(currentValue: number): number {
    // Simular crecimiento basado en el valor actual
    if (currentValue <= 1) return 100;
    if (currentValue <= 5) return 25;
    if (currentValue <= 10) return 15;
    return Math.floor(Math.random() * 10) + 2; // 2-12% crecimiento
  }

  private getFallbackMetrics(): AnalyticsMetric[] {
    return [
      {
        id: '1',
        title: 'Total de Usuarios',
        value: '0',
        change: '0%',
        direction: 'neutral',
        comparisonText: 'Sin datos disponibles',
        rawValue: 0
      },
      {
        id: '2',
        title: 'Usuarios Activos',
        value: '0',
        change: '0%',
        direction: 'neutral',
        comparisonText: 'Sin datos disponibles',
        rawValue: 0
      },
      {
        id: '3',
        title: 'Roles Configurados',
        value: '0',
        change: '0%',
        direction: 'neutral',
        comparisonText: 'Sin configurar',
        rawValue: 0
      },
      {
        id: '4',
        title: 'Cuentas Master',
        value: '1',
        change: '0%',
        direction: 'neutral',
        comparisonText: 'Cuenta protegida',
        rawValue: 1
      }
    ];
  }

  // Generar datos de gráfico de barras basados en actividad de usuarios
  async getUserActivityChart(): Promise<ChartData[]> {
    try {
      const users = await auth0ManagementService.getUsers();
      
      // Generar datos de actividad de los últimos 30 días
      const activityData = this.generateActivityData(users.length);
      
      return [
        {
          name: 'Actividad de Usuarios',
          data: activityData
        }
      ];
    } catch (error) {
      console.error('Error obteniendo datos de actividad:', error);
      return [
        {
          name: 'Actividad de Usuarios',
          data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 100))
        }
      ];
    }
  }

  private generateActivityData(userCount: number): number[] {
    const baseActivity = Math.max(userCount * 5, 50); // Actividad base
    return Array.from({ length: 30 }, (_, index) => {
      // Simular variaciones realistas en la actividad
      const dayOfWeek = (index + 1) % 7;
      const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.6 : 1.0;
      const randomVariation = 0.7 + Math.random() * 0.6; // 0.7 - 1.3
      
      return Math.floor(baseActivity * weekendFactor * randomVariation);
    });
  }

  // Obtener datos de dispositivos basados en logs de Auth0
  async getDeviceData(): Promise<DeviceData[]> {
    try {
      // En una implementación real, esto vendría de logs de Auth0
      const deviceDistribution = [
        { name: 'Desktop', value: 65, percentage: 65 },
        { name: 'Mobile', value: 25, percentage: 25 },
        { name: 'Tablet', value: 10, percentage: 10 }
      ];

      return deviceDistribution;
    } catch (error) {
      console.error('Error obteniendo datos de dispositivos:', error);
      return [
        { name: 'Desktop', value: 0, percentage: 0 },
        { name: 'Mobile', value: 0, percentage: 0 },
        { name: 'Tablet', value: 0, percentage: 0 }
      ];
    }
  }

  // Páginas más visitadas basadas en la configuración del sistema
  async getTopPages(): Promise<PageData[]> {
    try {
      const users = await auth0ManagementService.getUsers();
      const totalVisits = users.length * 10; // Simular visitas

      return [
        { page: '/dashboard', visitors: Math.floor(totalVisits * 0.35), percentage: 35 },
        { page: '/analytics', visitors: Math.floor(totalVisits * 0.20), percentage: 20 },
        { page: '/users', visitors: Math.floor(totalVisits * 0.15), percentage: 15 },
        { page: '/security', visitors: Math.floor(totalVisits * 0.12), percentage: 12 },
        { page: '/settings', visitors: Math.floor(totalVisits * 0.10), percentage: 10 },
        { page: '/videos', visitors: Math.floor(totalVisits * 0.08), percentage: 8 }
      ];
    } catch (error) {
      console.error('Error obteniendo páginas principales:', error);
      return [
        { page: '/dashboard', visitors: 0, percentage: 0 },
        { page: '/analytics', visitors: 0, percentage: 0 },
        { page: '/users', visitors: 0, percentage: 0 }
      ];
    }
  }

  // Canales de adquisición
  async getChannelData(): Promise<ChannelData[]> {
    try {
      const users = await auth0ManagementService.getUsers();
      const totalUsers = users.length;

      return [
        { source: 'Directo', visitors: Math.floor(totalUsers * 0.4), percentage: 40 },
        { source: 'Referido', visitors: Math.floor(totalUsers * 0.25), percentage: 25 },
        { source: 'Búsqueda Orgánica', visitors: Math.floor(totalUsers * 0.20), percentage: 20 },
        { source: 'Social', visitors: Math.floor(totalUsers * 0.15), percentage: 15 }
      ];
    } catch (error) {
      console.error('Error obteniendo datos de canales:', error);
      return [
        { source: 'Directo', visitors: 0, percentage: 0 },
        { source: 'Referido', visitors: 0, percentage: 0 },
        { source: 'Búsqueda Orgánica', visitors: 0, percentage: 0 },
        { source: 'Social', visitors: 0, percentage: 0 }
      ];
    }
  }

  // Órdenes recientes simuladas basadas en la actividad del sistema
  async getRecentOrders(): Promise<RecentOrder[]> {
    try {
      const users = await auth0ManagementService.getUsers();
      const roles = await auth0ManagementService.getRoles();

      // Simular órdenes basadas en usuarios y roles del sistema
      const orders: RecentOrder[] = [];
      const products = ['Dashboard Pro', 'Analytics Suite', 'Security Package', 'User Management', 'Video Platform'];
      const categories = ['Dashboard', 'Analytics', 'Security', 'Management', 'Content'];
      const countries = ['🇺🇸 USA', '🇪🇸 España', '🇲🇽 México', '🇨🇴 Colombia', '🇦🇷 Argentina'];
      const statuses: ('completed' | 'pending' | 'cancelled')[] = ['completed', 'pending', 'cancelled'];

      for (let i = 0; i < Math.min(users.length, 10); i++) {
        orders.push({
          id: `ORD-${Date.now()}-${i}`,
          product: products[i % products.length],
          category: categories[i % categories.length],
          country: countries[i % countries.length],
          value: Math.floor(Math.random() * 1000) + 100,
          status: statuses[i % statuses.length],
          date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Últimos 7 días
        });
      }

      return orders;
    } catch (error) {
      console.error('Error obteniendo órdenes recientes:', error);
      return [];
    }
  }

  // Datos demográficos simulados
  async getDemographicData(): Promise<DemographicData[]> {
    try {
      const users = await auth0ManagementService.getUsers();
      const totalUsers = users.length;

      return [
        { country: 'USA', value: Math.floor(totalUsers * 0.3), coordinates: [39.8283, -98.5795] },
        { country: 'España', value: Math.floor(totalUsers * 0.25), coordinates: [40.4637, -3.7492] },
        { country: 'México', value: Math.floor(totalUsers * 0.20), coordinates: [23.6345, -102.5528] },
        { country: 'Colombia', value: Math.floor(totalUsers * 0.15), coordinates: [4.5709, -74.2973] },
        { country: 'Argentina', value: Math.floor(totalUsers * 0.10), coordinates: [-38.4161, -63.6167] }
      ];
    } catch (error) {
      console.error('Error obteniendo datos demográficos:', error);
      return [
        { country: 'USA', value: 0, coordinates: [39.8283, -98.5795] },
        { country: 'España', value: 0, coordinates: [40.4637, -3.7492] }
      ];
    }
  }

  // Obtener datos de usuarios activos por hora
  async getActiveUsersHourlyData(): Promise<ChartData[]> {
    try {
      const users = await auth0ManagementService.getUsers();
      const activeUsers = users.filter(user => user.email_verified);
      
      // Generar datos de usuarios activos por hora (últimas 24 horas)
      const hourlyData = Array.from({ length: 24 }, (_, hour) => {
        const baseActivity = activeUsers.length;
        const timeOfDayFactor = this.getTimeOfDayFactor(hour);
        return Math.floor(baseActivity * timeOfDayFactor * (0.8 + Math.random() * 0.4));
      });

      return [
        {
          name: 'Usuarios Activos',
          data: hourlyData
        }
      ];
    } catch (error) {
      console.error('Error obteniendo datos de usuarios activos:', error);
      return [
        {
          name: 'Usuarios Activos',
          data: Array.from({ length: 24 }, () => Math.floor(Math.random() * 50))
        }
      ];
    }
  }

  // Obtener datos de sesiones por dispositivo
  async getDeviceSessionData(): Promise<DeviceSessionData[]> {
    try {
      const users = await auth0ManagementService.getUsers();
      
      // Simular datos de sesiones por dispositivo basado en usuarios
      const totalSessions = users.length * 1.5; // Promedio de 1.5 sesiones por usuario
      
      const deviceDistribution = [
        { device: 'Desktop', percentage: 45 },
        { device: 'Mobile', percentage: 40 },
        { device: 'Tablet', percentage: 15 }
      ];

      return deviceDistribution.map(item => ({
        device: item.device,
        sessions: Math.floor((totalSessions * item.percentage) / 100),
        percentage: item.percentage
      }));
    } catch (error) {
      console.error('Error obteniendo datos de sesiones por dispositivo:', error);
      return [
        { device: 'Desktop', sessions: 45, percentage: 45 },
        { device: 'Mobile', sessions: 40, percentage: 40 },
        { device: 'Tablet', sessions: 15, percentage: 15 }
      ];
    }
  }

  // Obtener datos de usuarios activos
  async getActiveUsersData(): Promise<ActiveUsersData> {
    try {
      const users = await auth0ManagementService.getUsers();
      const activeUsers = users.filter(user => 
        user.last_login && 
        new Date(user.last_login) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      );

      // Generar datos para el gráfico de los últimos 12 meses
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      const categories = [];
      const data = [];

      for (let i = 11; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        categories.push(months[monthIndex]);
        
        // Generar datos basados en usuarios reales con variación
        const baseValue = Math.floor(activeUsers.length * (0.8 + Math.random() * 0.4));
        data.push(Math.max(1, baseValue));
      }

      const currentLive = Math.floor(activeUsers.length * 0.3); // 30% de usuarios activos están "en vivo"
      const dailyAvg = Math.floor(activeUsers.length * 0.8);
      const weeklyAvg = Math.floor(activeUsers.length * 1.2);
      const monthlyAvg = Math.floor(activeUsers.length * 1.5);

      return {
        current: currentLive,
        daily: dailyAvg,
        weekly: weeklyAvg,
        monthly: monthlyAvg,
        chartData: [{
          name: 'Usuarios Activos',
          data: data
        }],
        categories: categories
      };
    } catch (error) {
      console.error('Error obteniendo datos de usuarios activos:', error);
      return {
        current: 364,
        daily: 224,
        weekly: 1400,
        monthly: 22100,
        chartData: [{
          name: 'Usuarios Activos',
          data: [180, 181, 182, 184, 183, 182, 181, 182, 183, 185, 186, 183]
        }],
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      };
    }
  }

  private getTimeOfDayFactor(hour: number): number {
    // Simular patrones de actividad realistas durante el día
    if (hour >= 0 && hour < 6) return 0.2; // Madrugada
    if (hour >= 6 && hour < 9) return 0.6; // Mañana temprano
    if (hour >= 9 && hour < 12) return 1.0; // Mañana
    if (hour >= 12 && hour < 14) return 0.8; // Almuerzo
    if (hour >= 14 && hour < 18) return 1.0; // Tarde
    if (hour >= 18 && hour < 22) return 0.7; // Noche temprano
    return 0.4; // Noche
  }

  // Método para refrescar todos los datos
  async refreshAllData() {
    try {
      const [metrics, chartData, deviceData, pages, channels, orders, demographic, activeUsers] = await Promise.all([
        this.getSystemMetrics(),
        this.getUserActivityChart(),
        this.getDeviceData(),
        this.getTopPages(),
        this.getChannelData(),
        this.getRecentOrders(),
        this.getDemographicData(),
        this.getActiveUsersData()
      ]);

      return {
        metrics,
        chartData,
        deviceData,
        pages,
        channels,
        orders,
        demographic,
        activeUsers
      };
    } catch (error) {
      console.error('Error refrescando datos de analytics:', error);
      throw error;
    }
  }
}

export const analyticsService = new AnalyticsService();
