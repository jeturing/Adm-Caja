import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const ContentNavigation: React.FC = () => {
  const location = useLocation();

  const navigationItems = [
    {
      path: '/videos-config',
      label: 'Config API',
      icon: '⚙️',
      description: 'Vista dinámica API'
    },
    {
      path: '/playlists',
      label: 'Playlists',
      icon: '📋',
      description: 'Gestión de playlists'
    },
    {
      path: '/videos',
      label: 'Videos',
      icon: '🎬',
      description: 'Gestión de videos'
    },
    {
      path: '/seasons',
      label: 'Seasons',
      icon: '📺',
      description: 'Gestión de temporadas'
    },
    {
      path: '/segments',
      label: 'Segments',
      icon: '🏷️',
      description: 'Gestión de segmentos'
    },
    {
      path: '/carousel',
      label: 'Carousel',
      icon: '🎠',
      description: 'Home carousel'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        🎯 Gestión de Contenido
      </h3>        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path;
          const isImplemented = item.path === '/videos-config' || item.path === '/playlists' || item.path === '/videos' || item.path === '/seasons' || item.path === '/segments' || item.path === '/carousel';
          
          return (
            <div key={item.path} className="relative">
              {isImplemented ? (
                <Link
                  to={item.path}
                  className={`block p-3 rounded-lg border-2 transition-colors ${
                    isActive
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50 text-gray-700'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">{item.icon}</div>
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                  {isActive && (
                    <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                      ✓
                    </div>
                  )}
                </Link>
              ) : (
                <div className="block p-3 rounded-lg border-2 border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed">
                  <div className="text-center">
                    <div className="text-2xl mb-1 opacity-50">{item.icon}</div>
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs">Próximamente</div>
                  </div>
                  <div className="absolute -top-2 -right-2 bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                    ⏳
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ContentNavigation;
