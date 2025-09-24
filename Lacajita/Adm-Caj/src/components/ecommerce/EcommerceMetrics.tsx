import { useEffect, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, BoxIconLine, GroupIcon } from "../../icons";
import Badge from "../ui/badge/Badge";
import { dashboardService, SystemSummary, CustomersSummary } from "../../services/dashboardService";

export default function EcommerceMetrics() {
  const [cust, setCust] = useState<CustomersSummary | null>(null);
  const [sys, setSys] = useState<SystemSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [c, s] = await Promise.all([
          dashboardService.getCustomersSummary(),
          dashboardService.getSystemSummary(),
        ]);
        if (mounted) {
          setCust(c);
          setSys(s);
        }
      } catch (e) {
        console.error("Error cargando métricas:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const customers = cust?.total ?? 0;
  // Usar videos totales como proxy de "Orders" en este dashboard
  const orders = sys?.videos ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <GroupIcon className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Customers</span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {loading ? '…' : customers.toLocaleString()}
            </h4>
          </div>
          <Badge color="success">
            <ArrowUpIcon />
            {cust ? `${Math.min(100, Math.round((cust.new_last_30d / Math.max(1, cust.total)) * 100))}%` : '—'}
          </Badge>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <BoxIconLine className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Videos</span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {loading ? '…' : orders.toLocaleString()}
            </h4>
          </div>
          <Badge color={orders > 0 ? "success" : "error"}>
            {orders > 0 ? <ArrowUpIcon /> : <ArrowDownIcon />}
            {sys ? `${sys.playlists} playlists` : '—'}
          </Badge>
        </div>
      </div>
    </div>
  );
}
