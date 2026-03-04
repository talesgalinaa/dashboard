import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Map, CheckCircle, AlertCircle } from "lucide-react";

const DashboardHome = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ vehicles: 0, missions: 0, active: 0, completed: 0 });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const vSnap = await getDocs(query(collection(db, "vehicles"), where("userId", "==", user.uid)));
        const mSnap = await getDocs(query(collection(db, "missions"), where("userId", "==", user.uid)));
        const active = vSnap.docs.filter((d) => d.data().status === "ativo").length;
        const completed = mSnap.docs.filter((d) => d.data().status === "concluída").length;
        setStats({ vehicles: vSnap.size, missions: mSnap.size, active, completed });
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
