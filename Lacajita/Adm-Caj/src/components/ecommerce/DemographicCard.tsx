import { useEffect, useState } from "react";
import { MoreDotIcon } from "../../icons";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import CountryMap from "./CountryMap";
import { dashboardService, DemographicResponse } from "../../services/dashboardService";

export default function DemographicCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [demo, setDemo] = useState<DemographicResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const d = await dashboardService.getDemographic();
        if (mounted) setDemo(d);
      } catch (e) {
        console.error("Error cargando demografía:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  // Mapa simple de centroides aproximados por ISO2 (subset común)
  const ISO2_TO_LATLNG: Record<string, [number, number]> = {
    US: [37.0902, -95.7129],
    MX: [23.6345, -102.5528],
    ES: [40.4637, -3.7492],
    FR: [46.2276, 2.2137],
    CO: [4.5709, -74.2973],
    AR: [-38.4161, -63.6167],
    CL: [-35.6751, -71.543],
    PE: [-9.19, -75.0152],
    DO: [18.7357, -70.1627],
    BR: [-14.235, -51.9253],
    GB: [55.3781, -3.436],
    DE: [51.1657, 10.4515],
    IT: [41.8719, 12.5674],
    CA: [56.1304, -106.3468],
  };

  const markers = demo?.by_country
    ? Object.keys(demo.by_country)
        .slice(0, 12)
        .map((iso2) => ({
          latLng: ISO2_TO_LATLNG[iso2] || [0, 0],
          name: iso2,
        }))
    : [];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="flex justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Customers Demographic
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Number of customer based on country
          </p>
        </div>
        <div className="relative inline-block">
          <button className="dropdown-toggle" onClick={toggleDropdown}>
            <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 size-6" />
          </button>
          <Dropdown isOpen={isOpen} onClose={closeDropdown} className="w-40 p-2">
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              View More
            </DropdownItem>
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              Delete
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      <div className="px-4 py-6 my-6 overflow-hidden border border-gary-200 rounded-2xl dark:border-gray-800 sm:px-6">
        <div
          id="mapOne"
          className="mapOne map-btn -mx-4 -my-6 h-[212px] w-[252px] 2xsm:w-[307px] xsm:w-[358px] sm:-mx-6 md:w-[668px] lg:w-[634px] xl:w-[393px] 2xl:w-[554px]"
        >
          <CountryMap markers={markers} />
        </div>
      </div>

      <div className="space-y-5">
        {loading && <div className="text-gray-500 text-sm">Cargando…</div>}
        {!loading && demo && demo.by_country &&
          Object.entries(demo.by_country)
            .slice(0, 5)
            .map(([iso2, count]) => {
              const total =
                (Object.values(demo.by_country || {}) as number[]).reduce((a, b) => a + b, 0) || 1;
              const pct = Math.round(((count as number) / total) * 100);
              const flagUrl = `./images/country/${iso2.toLowerCase()}.svg`;
              return (
                <div key={iso2} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="items-center w-full rounded-full max-w-8">
                      <img
                        src={flagUrl}
                        alt={iso2}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            './images/country/country-01.svg';
                        }}
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-theme-sm dark:text-white/90">
                        {iso2}
                      </p>
                      <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                        {count as number} Customers
                      </span>
                    </div>
                  </div>
                  <div className="flex w-full max-w-[140px] items-center gap-3">
                    <div className="relative block h-2 w-full max-w-[100px] rounded-sm bg-gray-200 dark:bg-gray-800">
                      <div
                        className="absolute left-0 top-0 flex h-full items-center justify-center rounded-sm bg-brand-500 text-xs font-medium text-white"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                    <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">{pct}%</p>
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}
