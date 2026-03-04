import { GoogleMap, useJsApiLoader, Marker, Polyline, Polygon } from "@react-google-maps/api";
import { useCallback } from "react";

interface Waypoint {
  lat: number;
  lng: number;
}

interface MissionMapProps {
  waypoints: Waypoint[];
  onChange: (waypoints: Waypoint[]) => void;
  mode?: "area" | "corredor";
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

const containerStyle = { width: "100%", height: "400px" };
const defaultCenter = { lat: -15.7801, lng: -47.9292 }; // Brasília

const MissionMap = ({ waypoints, onChange, mode }: MissionMapProps) => {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        onChange([...waypoints, { lat: e.latLng.lat(), lng: e.latLng.lng() }]);
      }
    },
    [waypoints, onChange]
  );

  const handleMarkerClick = useCallback(
    (index: number) => {
      onChange(waypoints.filter((_, i) => i !== index));
    },
    [waypoints, onChange]
  );

  if (!isLoaded) {
    return (
      <div className="w-full h-[400px] bg-muted flex items-center justify-center text-muted-foreground text-sm">
        {GOOGLE_MAPS_API_KEY ? (
          "Carregando mapa..."
        ) : (
          <div className="text-center">
            <div>Chave da API do Google Maps não configurada.</div>
            <div className="text-xs">Defina `VITE_GOOGLE_MAPS_API_KEY` em seu `.env`.</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={waypoints.length > 0 ? waypoints[0] : defaultCenter}
      zoom={waypoints.length > 0 ? 15 : 5}
      onClick={handleMapClick}
      options={{
        mapTypeControl: true,
        streetViewControl: false,
        styles: [
          { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
        ],
      }}
    >
      {waypoints.map((wp, i) => (
        <Marker
          key={i}
          position={wp}
          label={{ text: `${i + 1}`, color: "white", fontWeight: "bold", fontSize: "12px" }}
          onClick={() => handleMarkerClick(i)}
        />
      ))}
      {waypoints.length > 1 && (
        <Polyline
          path={waypoints}
          options={{ strokeColor: "hsl(210, 100%, 45%)", strokeWeight: 3, strokeOpacity: 0.8 }}
        />
      )}
      {mode === "area" && waypoints.length > 2 && (
        <Polygon
          paths={waypoints}
          options={{
            fillColor: "hsl(210, 100%, 45%)",
            fillOpacity: 0.15,
            strokeColor: "hsl(210, 100%, 45%)",
            strokeWeight: 2,
            strokeOpacity: 0.5,
          }}
        />
      )}
    </GoogleMap>
  );
};

export default MissionMap;
