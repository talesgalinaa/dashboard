import { useCallback, useEffect, useState } from "react";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Eye, MapPin, Pencil } from "lucide-react";
import { toast } from "sonner";
import MissionMap from "@/components/MissionMap";
import MissionViewMap from "@/components/MissionViewMap";

interface Waypoint {
  lat: number;
  lng: number;
}

interface Mission {
  id: string;
  name: string;
  vehicleId: string;
  vehicleName: string;
  waypoints: Waypoint[];
  status: "planejada" | "em andamento" | "concluída";
  mode: "area" | "corredor";
  userId: string;
  createdAt: Timestamp | null;
}

interface Vehicle {
  id: string;
  name: string;
}

const Missions = () => {
  const { user } = useAuth();

  // helper: convert degrees to radians
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // haversine distance between two points in meters
  const haversine = (a: Waypoint, b: Waypoint) => {
    const R = 6371000; // earth radius in meters
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

  const calculateDistance = (wps: Waypoint[]) => {
    if (wps.length < 2) return 0;
    return wps.slice(1).reduce((sum, wp, i) => sum + haversine(wps[i], wp), 0);
  };

  // shoelace formula with degree->meter approximation
  const calculateArea = (wps: Waypoint[]) => {
    if (wps.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < wps.length; i++) {
      const j = (i + 1) % wps.length;
      area += wps[i].lng * wps[j].lat - wps[j].lng * wps[i].lat;
    }
    // convert degrees squared to meters squared (approx)
    const factor = 111320; // meters per degree
    return Math.abs(area) / 2 * factor * factor;
  };
  const [missions, setMissions] = useState<Mission[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMission, setViewMission] = useState<Mission | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  // Form
  const [name, setName] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [status, setStatus] = useState<"planejada" | "em andamento" | "concluída">
    ("planejada");
  const [mode, setMode] = useState<"area" | "corredor">("corredor");
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const mSnap = await getDocs(query(collection(db, "missions"), where("userId", "==", user.uid)));
      setMissions(
        mSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            mode: (data as any).mode || "corredor",
            ...data,
          } as Mission;
        })
      );
      const vSnap = await getDocs(query(collection(db, "vehicles"), where("userId", "==", user.uid)));
      setVehicles(vSnap.docs.map((d) => ({ id: d.id, name: d.data().name })));
    } catch {
      // Firebase not configured
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setName("");
    setVehicleId("");
    setStatus("planejada");
    setMode("corredor");
    setWaypoints([]);
    setEditId(null);
  };

  const handleSave = async () => {
    if (!user || !name.trim() || !vehicleId || waypoints.length < 2) {
      toast.error("Preencha o nome, selecione um veículo e defina pelo menos 2 pontos no mapa.");
      return;
    }
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    try {
      if (editId) {
        await updateDoc(doc(db, "missions", editId), {
          name,
          vehicleId,
          vehicleName: vehicle?.name || "",
          waypoints,
          status,
          mode,
        });
        toast.success("Missão atualizada!");
      } else {
        await addDoc(collection(db, "missions"), {
          name,
          vehicleId,
          vehicleName: vehicle?.name || "",
          waypoints,
          status,
          mode,
          userId: user.uid,
          createdAt: Timestamp.now(),
        });
        toast.success("Missão criada!");
      }
      resetForm();
      setCreateOpen(false);
      load();
    } catch {
      toast.error("Erro ao salvar. Verifique a config do Firebase.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "missions", id));
      toast.success("Missão removida!");
      load();
    } catch {
      toast.error("Erro ao remover.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Missões</h2>
          <p className="text-muted-foreground">Crie e visualize trajetos dos seus drones</p>
        </div>
        <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />{editId ? "Editar" : "Nova"} Missão</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "Editar Missão" : "Criar Missão"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Missão</Label>
                  <Input placeholder="Ex: Inspeção Área Norte" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Veículo</Label>
                  <Select value={vehicleId} onValueChange={setVehicleId}>
                    <SelectTrigger>
                      <SelectValue className="block truncate">
                        {vehicles.find((v) => v.id === vehicleId)?.name || (
                          <span className="text-muted-foreground">Selecione um drone</span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v: "planejada" | "em andamento" | "concluída") => setStatus(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planejada">Planejada</SelectItem>
                      <SelectItem value="em andamento">Em andamento</SelectItem>
                      <SelectItem value="concluída">Concluída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="mode"
                      value="corredor"
                      checked={mode === "corredor"}
                      onChange={() => setMode("corredor")}
                    />
                    Corredor
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="mode"
                      value="area"
                      checked={mode === "area"}
                      onChange={() => setMode("area")}
                    />
                    Área
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Defina os pontos no mapa (clique para adicionar)</Label>
                <div className="rounded-lg overflow-hidden border">
                  <MissionMap waypoints={waypoints} onChange={setWaypoints} mode={mode} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {waypoints.length} ponto(s) definido(s). Clique no mapa para adicionar, clique em um marcador para remover.
                </p>
              </div>
              <Button onClick={handleSave} className="w-full">Salvar Missão</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* View mission dialog */}
      <Dialog open={!!viewMission} onOpenChange={(o) => !o && setViewMission(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewMission?.name}</DialogTitle>
          </DialogHeader>
          {viewMission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Veículo: </span>
                  <span className="font-medium">{viewMission.vehicleName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status: </span>
                  <span className="font-medium">{viewMission.status}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tipo: </span>
                  <span className="font-medium capitalize">{viewMission.mode}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Pontos: </span>
                  <span className="font-mono font-medium">{viewMission.waypoints.length}</span>
                </div>
                <div>
                  {viewMission.mode === "corredor" ? (
                    <>
                      <span className="text-muted-foreground">Distância: </span>
                      <span className="font-medium">
                        {(calculateDistance(viewMission.waypoints) / 1000).toFixed(2)} km
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-muted-foreground">Área: </span>
                      <span className="font-medium">
                        {(calculateArea(viewMission.waypoints) / 1e6).toFixed(2)} km²
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="rounded-lg overflow-hidden border">
                <MissionViewMap waypoints={viewMission.waypoints} mode={viewMission.mode} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Coordenadas</Label>
                <div className="bg-muted rounded-md p-3 max-h-32 overflow-y-auto">
                  {viewMission.waypoints.map((wp, i) => (
                    <p key={i} className="text-xs font-mono">
                      #{i + 1}: {wp.lat.toFixed(6)}, {wp.lng.toFixed(6)}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {missions.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma missão criada. Cadastre veículos primeiro e crie sua primeira missão!
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {missions.map((m) => (
            <Card key={m.id} className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">{m.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewMission(m)}>
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                    setEditId(m.id);
                    setName(m.name);
                    setVehicleId(m.vehicleId);
                    setStatus(m.status);
                    setMode(m.mode || "corredor");
                    setWaypoints(m.waypoints);
                    setCreateOpen(true);
                  }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(m.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Veículo: <span className="text-foreground font-medium">{m.vehicleName}</span></p>
                <p className="text-sm text-muted-foreground mt-1">Pontos: <span className="font-mono text-foreground">{m.waypoints.length}</span></p>
                <p className="text-sm text-muted-foreground mt-1">
                  Status: <span className={`font-medium ${m.status === "concluída" ? "text-success" : m.status === "em andamento" ? "text-warning" : "text-primary"}`}>
                    {m.status}
                  </span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Missions;
