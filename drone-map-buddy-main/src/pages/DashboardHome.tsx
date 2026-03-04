import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Map, CheckCircle, AlertCircle } from "lucide-react";

const DashboardHome = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ vehicles: 0, missions: 0, active: 0, completed: 0, dailyArea: 0, totalArea: 0, dailyDistance: 0, totalDistance: 0 });

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const haversine = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const R = 6371000;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const sinDlat = Math.sin(dLat / 2);
    const sinDlon = Math.sin(dLon / 2);
    const inside = sinDlat * sinDlat + Math.cos(lat1) * Math.cos(lat2) * sinDlon * sinDlon;
    const c = 2 * Math.atan2(Math.sqrt(inside), Math.sqrt(1 - inside));
    return R * c;
  };

  const distanceFor = (wps: { lat: number; lng: number }[]) => {
    if (wps.length < 2) return 0;
    return wps.slice(1).reduce((sum, wp, i) => sum + haversine(wps[i], wp), 0);
  };

  // calculate area using shoelace, with degree->meter approx
  const areaFor = (wps: { lat: number; lng: number }[]) => {
    if (wps.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < wps.length; i++) {
      const j = (i + 1) % wps.length;
      area += wps[i].lng * wps[j].lat - wps[j].lng * wps[i].lat;
    }
    const factor = 111320; // meters per degree
    return Math.abs(area) / 2 * factor * factor;
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const vSnap = await getDocs(query(collection(db, "vehicles"), where("userId", "==", user.uid)));
        const mSnap = await getDocs(query(collection(db, "missions"), where("userId", "==", user.uid)));
        const active = vSnap.docs.filter((d) => d.data().status === "ativo").length;
        const completed = mSnap.docs.filter((d) => d.data().status === "concluída").length;

        // compute areas
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let totalArea = 0;
        let dailyArea = 0;
        let totalDistance = 0;
        let dailyDistance = 0;
        mSnap.docs.forEach((d) => {
          const data: any = d.data();
          if (Array.isArray(data.waypoints)) {
            const a = areaFor(data.waypoints);
            const dist = distanceFor(data.waypoints);
            if (data.mode === "area") {
              totalArea += a;
            }
            totalDistance += dist;
            const created: any = data.createdAt;
            let date: Date | null = null;
            if (created && created.toDate) date = created.toDate();
            else if (created instanceof Date) date = created;
            if (date && date >= startOfToday) {
              if (data.mode === "area") {
                dailyArea += a;
              }
              dailyDistance += dist;
            }
          }
        });

        setStats({ vehicles: vSnap.size, missions: mSnap.size, active, completed, totalArea, dailyArea, totalDistance, dailyDistance });
      } catch {
        // Firebase not configured yet
      }
    };
    load();
  }, [user]);

  const cards = [
    { title: "Veículos", value: stats.vehicles, icon: Truck, color: "text-primary" },
    { title: "Missões", value: stats.missions, icon: Map, color: "text-accent" },
    { title: "Drones Ativos", value: stats.active, icon: CheckCircle, color: "text-success" },
    { title: "Missões Concluídas", value: stats.completed, icon: AlertCircle, color: "text-warning" },
    { title: "Área Hoje", value: `${(stats.dailyArea / 1e6).toFixed(2)} km²`, icon: Map, color: "text-primary" },
    { title: "Área Total", value: `${(stats.totalArea / 1e6).toFixed(2)} km²`, icon: Map, color: "text-accent" },
    { title: "Distância Hoje", value: `${(stats.dailyDistance / 1000).toFixed(2)} km`, icon: Map, color: "text-primary" },
    { title: "Distância Total", value: `${(stats.totalDistance / 1000).toFixed(2)} km`, icon: Map, color: "text-accent" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Painel de Controle</h2>
        <p className="text-muted-foreground">Visão geral da sua frota de drones</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.title} className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold font-mono">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DashboardHome;
