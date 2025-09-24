/**
 * Script de prueba para verificar conectividad con JWPlayer CDN
 * Usa video IDs reales de La Cajita API
 */

import { JWPlayerCDNService } from '../services/jwPlayerCDNService';

// Video IDs conocidos de La Cajita API
const TEST_VIDEO_IDS = [
  'O9CLAplo',
  'KhYF5ak3', 
  '1s5Vve98',
  'xfCkH0LR',
  'TXGHblqN'
];

const testJWPlayerCDN = async () => {
  console.log('🧪 Iniciando pruebas de JWPlayer CDN...');
  const service = new JWPlayerCDNService();
  
  for (const videoId of TEST_VIDEO_IDS) {
    console.log(`\n🔍 Probando video ID: ${videoId}`);
    
    try {
      // Verificar disponibilidad
      const available = await service.isPlaylistAvailable(videoId);
      console.log(`📡 Disponible: ${available ? '✅' : '❌'}`);
      
      if (available) {
        // Obtener datos
        const data = await service.fetchPlaylistData(videoId);
        if (data) {
          console.log(`📺 Título: ${data.title}`);
          console.log(`🎬 Videos en playlist: ${data.playlist?.length || 0}`);
          
          if (data.playlist && data.playlist.length > 0) {
            const firstVideo = data.playlist[0];
            console.log(`🎯 Primer video: ${firstVideo.title}`);
            console.log(`⏱️ Duración: ${firstVideo.duration}s`);
            console.log(`🖼️ Thumbnail: ${firstVideo.image ? '✅' : '❌'}`);
            console.log(`📽️ Fuentes: ${firstVideo.sources?.length || 0}`);
          }
        }
      }
      
      // URLs generadas
      console.log(`🔗 JSON URL: ${service.getPlaylistJsonUrl(videoId)}`);
      console.log(`🔗 RSS URL: ${service.getPlaylistRssUrl(videoId)}`);
      
    } catch (error) {
      console.error(`❌ Error probando ${videoId}:`, error);
    }
  }
  
  console.log('\n✅ Pruebas de JWPlayer CDN completadas');
};

// Ejecutar pruebas
testJWPlayerCDN().catch(console.error);

export { testJWPlayerCDN };
