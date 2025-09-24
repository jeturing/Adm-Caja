import React, { Suspense } from 'react';

const Chart = React.lazy(() => import('react-apexcharts'));

type LazyChartProps = {
  options?: any;
  series?: any;
  type?: string;
  height?: string | number;
  width?: string | number;
};

export default function LazyChart(props: LazyChartProps) {
  return (
    <Suspense fallback={<div style={{ minHeight: 120 }}>Cargando gráfica…</div>}>
      {/* @ts-ignore dynamic import */}
      <Chart {...props} />
    </Suspense>
  );
}
