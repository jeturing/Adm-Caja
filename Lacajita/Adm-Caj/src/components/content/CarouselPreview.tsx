import React, { useState, useEffect } from 'react';
import { realApiService, ApiHomeCarousel } from '../../services/realApiService';

const CarouselPreview: React.FC = () => {
  const [items, setItems] = useState<ApiHomeCarousel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    loadActiveItems();
  }, []);

  useEffect(() => {
    if (!autoPlay || items.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 5000); // Cambiar cada 5 segundos

    return () => clearInterval(interval);
  }, [autoPlay, items.length]);

  const loadActiveItems = async () => {
    try {
      setLoading(true);
      setError('');
      // Cargar solo items activos
      const allItems = await realApiService.getHomeCarousel(1);
      // Ordenar por campo order
      const sortedItems = allItems.sort((a, b) => (a.order || 0) - (b.order || 0));
      setItems(sortedItems);
      console.log('✅ Items activos del carousel cargados:', sortedItems.length);
    } catch (error: any) {
      console.error('❌ Error cargando items del carousel:', error);
      setError('Error al cargar los items del carousel.');
    } finally {
      setLoading(false);
    }
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const handleItemClick = (item: ApiHomeCarousel) => {
    if (item.link) {
      window.open(item.link, '_blank');
    } else if (item.video) {
      console.log('🎬 Reproducir video:', item.video);
      // Aquí se podría implementar la lógica para reproducir el video
      alert(`Reproducir video: ${item.video}`);
    }
  };

  const formatDateTime = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES');
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">⏳ Cargando carousel...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-96 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center">
        <div className="text-red-600">❌ {error}</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 text-lg mb-2">🎠 No hay items en el carousel</div>
          <div className="text-gray-400">Agregue items activos para ver el carousel</div>
        </div>
      </div>
    );
  }

  const currentItem = items[currentIndex];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          🎠 Preview del Home Carousel
        </h3>
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoPlay}
              onChange={(e) => setAutoPlay(e.target.checked)}
              className="mr-2"
            />
            ⏯️ Auto-play
          </label>
          <button
            onClick={loadActiveItems}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            🔄 Recargar
          </button>
        </div>
      </div>

      {/* Carousel principal */}
      <div className="relative w-full h-96 bg-black rounded-lg overflow-hidden">
        {/* Imagen actual */}
        <div className="relative w-full h-full">
          <img
            src={currentItem.imgsrc}
            alt={`Slide ${currentIndex + 1}`}
            className="w-full h-full object-cover cursor-pointer"
            onClick={() => handleItemClick(currentItem)}
            onError={(e) => {
              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbiBubyBkaXNwb25pYmxlPC90ZXh0Pjwvc3ZnPg==';
            }}
          />
          
          {/* Overlay con información */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
            <div className="text-white">
              <div className="flex items-center space-x-4 mb-2">
                <span className="text-lg font-medium">
                  Item #{currentItem.id}
                </span>
                {currentItem.video && (
                  <span className="px-2 py-1 bg-blue-600 rounded text-sm">
                    🎬 Video: {currentItem.video}
                  </span>
                )}
                {currentItem.link && (
                  <span className="px-2 py-1 bg-green-600 rounded text-sm">
                    🔗 Link externo
                  </span>
                )}
              </div>
              {currentItem.date_time && (
                <div className="text-sm text-gray-300">
                  📅 {formatDateTime(currentItem.date_time)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controles de navegación */}
        {items.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
            >
              ◀️
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
            >
              ▶️
            </button>
          </>
        )}
      </div>

      {/* Indicadores de slides */}
      {items.length > 1 && (
        <div className="flex justify-center space-x-2 mt-4">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentIndex ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}

      {/* Lista de items */}
      <div className="mt-6">
        <h4 className="text-md font-medium text-gray-900 mb-3">
          📋 Items del Carousel ({items.length})
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                index === currentIndex 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              }`}
              onClick={() => goToSlide(index)}
            >
              <div className="flex items-center space-x-3">
                <img
                  src={item.imgsrc}
                  alt={`Item ${item.id}`}
                  className="w-16 h-12 object-cover rounded"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    Item #{item.id} (Orden: {item.order || 0})
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.video ? `🎬 Video: ${item.video}` : ''}
                    {item.link ? `🔗 Link` : ''}
                  </div>
                </div>
                {index === currentIndex && (
                  <div className="text-blue-600">▶️</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CarouselPreview;
