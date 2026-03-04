import { GoogleMap, useJsApiLoader, Marker, Polyline, Polygon } from "@react-google-maps/api";
import { useMemo } from "react";

interface Waypoint {
  lat: number;
  lng: number;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

const containerStyle = { width: "100%", height: "400px" };

const MissionViewMap = ({ waypoints }: { waypoints: Waypoint[] }) => {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const bounds = useMemo(() => {
    if (!isLoaded || waypoints.length === 0) return undefined;
    const b = new google.maps.LatLngBounds();
    waypoints.forEach((wp) => b.extend(wp));
    return b;
  }, [isLoaded, waypoints]);

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
      center={waypoints[0]}
      zoom={14}
      onLoad={(map) => bounds && map.fitBounds(bounds, 50)}
      options={{ streetViewControl: false }}
    >
      {waypoints.map((wp, i) => (
        <Marker
          key={i}
          position={wp}
          label={{ text: `${i + 1}`, color: "white", fontWeight: "bold", fontSize: "12px" }}
        />
      ))}
      {waypoints.length > 1 && (
        <Polyline
          path={waypoints}
          options={{ strokeColor: "hsl(210, 100%, 45%)", strokeWeight: 3, strokeOpacity: 0.8 }}
        />
      )}
      {waypoints.length > 2 && (
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

export default MissionViewMap;
