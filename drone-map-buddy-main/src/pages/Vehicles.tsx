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
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Vehicle {
  id: string;
  name: string;
  model: string;
  status: "ativo" | "inativo";
  userId: string;
  createdAt: Timestamp | null;
}

const Vehicles = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [model, setModel] = useState("");
  const [status, setStatus] = useState<"ativo" | "inativo">("ativo");

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const snap = await getDocs(query(collection(db, "vehicles"), where("userId", "==", user.uid)));
      setVehicles(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vehicle)));
    } catch {
      // Firebase not configured
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => { setName(""); setModel(""); setStatus("ativo"); setEditId(null); };

  const handleSave = async () => {
    if (!user || !name.trim() || !model.trim()) { toast.error("Preencha todos os campos."); return; }
    try {
      if (editId) {
        await updateDoc(doc(db, "vehicles", editId), { name, model, status });
        toast.success("Veículo atualizado!");
      } else {
        await addDoc(collection(db, "vehicles"), { name, model, status, userId: user.uid, createdAt: Timestamp.now() });
        toast.success("Veículo adicionado!");
      }
      resetForm();
      setOpen(false);
      load();
    } catch {
      toast.error("Erro ao salvar. Verifique a config do Firebase.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "vehicles", id));
      toast.success("Veículo removido!");
      load();
    } catch {
      toast.error("Erro ao remover.");
    }
  };

  const handleEdit = (v: Vehicle) => {
    setEditId(v.id);
    setName(v.name);
    setModel(v.model);
    setStatus(v.status);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Veículos</h2>
          <p className="text-muted-foreground">Gerencie seus drones e veículos</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Adicionar</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Editar" : "Novo"} Veículo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input placeholder="Ex: Drone Alpha" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Input placeholder="Ex: DJI Mavic 3" value={model} onChange={(e) => setModel(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v: "ativo" | "inativo") => setStatus(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {vehicles.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum veículo cadastrado. Adicione seu primeiro drone!
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v) => (
            <Card key={v.id} className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <span className={`status-dot ${v.status === "ativo" ? "status-active" : "status-inactive"}`} />
                  <CardTitle className="text-base">{v.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(v)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(v.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Modelo: <span className="text-foreground font-medium">{v.model}</span></p>
                <p className="text-sm text-muted-foreground mt-1">
                  Status: <span className={v.status === "ativo" ? "text-success font-medium" : "text-muted-foreground"}>{v.status}</span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Vehicles;
