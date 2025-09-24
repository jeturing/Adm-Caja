import { useEffect, useMemo, useState } from "react";
import LazyChart from "../ui/LazyChart";
import { ApexOptions } from "apexcharts";
import { dashboardService, VideoConsumptionSummary } from "../../services/dashboardService";

export default function VideoConsumptionCard() {
  const [data, setData] = useState<VideoConsumptionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await dashboardService.getVideoConsumption(30);
        if (mounted) setData(res);
      } catch (e) {
        console.error('Error cargando consumo de video:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const options: ApexOptions = useMemo(() => ({
    chart: { type: 'area', height: 180, toolbar: { show: false }, fontFamily: 'Outfit, sans-serif' },
    colors: ['#465FFF'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: { categories: (data?.last_7d || []).map(p => p.d) },
    yaxis: { labels: { style: { fontSize: '12px', colors: ['#6B7280'] } } },
    grid: { yaxis: { lines: { show: true } } },
    tooltip: { y: { formatter: (v: number) => `${v} eventos` } },
  }), [data]);

  const series = useMemo(() => ([{
    name: 'Eventos',
    data: (data?.last_7d || []).map(p => p.events),
  }]), [data]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">📺 Consumo de Video (30 días)</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Kpi title="Eventos" value={loading ? '…' : (data?.total_events ?? 0).toLocaleString()} />
        <Kpi title="Reproducciones" value={loading ? '…' : (data?.plays ?? 0).toLocaleString()} />
        <Kpi title="Completos" value={loading ? '…' : (data?.completes ?? 0).toLocaleString()} />
        <Kpi title="Usuarios Únicos" value={loading ? '…' : (data?.unique_users ?? 0).toLocaleString()} />
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar mb-6">
        <div className="min-w-[600px] xl:min-w-full">
          <LazyChart options={options} series={series} type="line" height={120} />
        </div>
      </div>

      <div>
        <h4 className="font-medium text-gray-800 mb-3">Top videos</h4>
        <div className="space-y-2">
          {(data?.top_videos || []).map(v => (
            <div key={v.media_id} className="flex items-center justify-between text-sm">
              <span className="text-gray-700">{v.media_id}</span>
              <span className="text-gray-500">{v.plays} plays • {v.completes} completes • {v.events} eventos</span>
            </div>
          ))}
          {!loading && (!data || data.top_videos.length === 0) && (
            <div className="text-gray-500 text-sm">Sin datos suficientes aún.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="text-xs text-gray-500 mb-1">{title}</div>
      <div className="text-xl font-semibold text-gray-800">{value}</div>
    </div>
  );
}
