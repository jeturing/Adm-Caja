import React, { Suspense } from 'react';

const LazyVector = React.lazy(async () => {
  const core = await import('@react-jvectormap/core');
  const world = await import('@react-jvectormap/world');
  return {
    default: (props: any) => React.createElement(core.VectorMap, { ...props, map: world.worldMill }),
  };
});

export default function LazyVectorMap(props: any) {
  return (
    <Suspense fallback={<div style={{ minHeight: 200 }}>Cargando mapa…</div>}>
      <LazyVector {...props} />
    </Suspense>
  );
}
