import LazyVectorMap from "../ui/LazyVectorMap";

interface Marker { latLng: [number, number]; name: string }
export default function CountryMap({ markers = [] as Marker[] }: { markers?: Marker[] }) {
  return (
    <LazyVectorMap
      backgroundColor="transparent"
      markerStyle={{ initial: { fill: "#465FFF" } }}
      markersSelectable={true}
      markers={markers}
      zoomOnScroll={false}
      zoomMax={12}
      zoomMin={1}
      zoomAnimate={true}
      zoomStep={1.5}
      regionStyle={{
        initial: {
          fill: "#D0D5DD",
          fillOpacity: 1,
          fontFamily: "Outfit",
          stroke: "none",
          strokeWidth: 0,
          strokeOpacity: 0,
        },
        hover: {
          fillOpacity: 0.7,
          cursor: "pointer",
          fill: "#465fff",
          stroke: "none",
        },
        selected: { fill: "#465FFF" },
        selectedHover: {},
      }}
      regionLabelStyle={{
        initial: { fill: "#35373e", fontWeight: 500, fontSize: "13px", stroke: "none" },
        hover: {},
        selected: {},
        selectedHover: {},
      }}
    />
  );
}
