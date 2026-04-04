'use client';

import { useState, useEffect } from 'react';
import { Truck, MapPin, Search, Calendar, FileText, CheckCircle2, ChevronRight, Scale, Package, Zap, Plus, Minus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from "@/components/ui/progress";
import { confirmarConsolidado } from './actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function DroppableContainer({ id, children, className }: { id: string, children: React.ReactNode, className?: string }) {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
        <div ref={setNodeRef} className={`${className} ${isOver ? 'ring-2 ring-primary ring-inset bg-primary/5' : ''}`}>
            {children}
        </div>
    );
}

function SortableItem({ id, pedido, onDetail, vehiculos, onManualAssign }: { id: string, pedido: any, onDetail: (p: any) => void, vehiculos?: any[], onManualAssign?: (pId: string, vId: string) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

    const pesoTotal = pedido.pedido_items?.reduce((acc: number, it: any) => {
        if (it.unidad_medida === 'KG') return acc + (Number(it.cantidad) || 0);
        return acc;
    }, 0) || 0;

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}
            className={`group bg-white p-3 rounded-lg border-2 shadow-sm cursor-grab active:cursor-grabbing transition-all hover:border-primary/50 hover:shadow-md ${isDragging ? 'border-primary shadow-lg scale-105 z-50' : 'border-gray-100'}`}>
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <div className="bg-gray-100 p-1.5 rounded-md text-gray-500">
                        <Package className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-sm text-gray-700">{pedido.numero}</span>
                </div>
                <Badge variant={pedido.estado === 'urgente' ? 'destructive' : 'secondary'} className="text-[9px] px-1.5 py-0">
                    {pedido.estado === 'urgente' ? 'URGENTE' : 'Normal'}
                </Badge>
            </div>

            <p className="text-sm font-semibold text-gray-900 line-clamp-1 mb-1">{pedido.clientes?.razon_social || 'Cliente'}</p>

            <div className="flex items-center text-[11px] text-gray-500 gap-1.5 mb-2">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span className="line-clamp-1">{pedido.clientes?.distrito} · {pedido.clientes?.direccion}</span>
            </div>

            <div className="bg-gray-50/80 rounded-md p-2 mb-3">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Items principales:</p>
                <div className="space-y-1">
                    {pedido.pedido_items?.slice(0, 3).map((it: any, i: number) => (
                        <div key={i} className="flex justify-between text-[11px] text-gray-600">
                            <span className="line-clamp-1">• {it.productos?.descripcion}</span>
                            <span className="font-medium">{it.cantidad} {it.unidad_medida}</span>
                        </div>
                    ))}
                    {(pedido.pedido_items?.length || 0) > 3 && (
                        <p className="text-[10px] text-primary font-medium mt-1">+{pedido.pedido_items.length - 3} productos más...</p>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[11px] font-bold text-gray-700">
                        <Scale className="w-3 h-3 text-amber-500" /> {pesoTotal.toFixed(1)} KG
                    </span>
                </div>
                <div className="flex gap-1" onPointerDown={e => e.stopPropagation()}>
                    {vehiculos && onManualAssign && (
                        <Select onValueChange={(vId: string | null) => vId && onManualAssign && onManualAssign(pedido.id as string, vId)}>
                            <SelectTrigger className="h-6 w-24 text-[9px] font-bold bg-white">
                                <SelectValue placeholder="Asignar" />
                            </SelectTrigger>
                            <SelectContent>
                                {vehiculos.map(v => (
                                    <SelectItem key={v.id} value={v.id} className="text-[10px] font-bold">
                                        {v.placa} ({v.chofer_nombre})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-primary rounded-full" onClick={(e) => { e.stopPropagation(); onDetail(pedido); }}>
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

const handleManualAssign = (pedidoId: string, vehiculoId: string, pedidosPendientes: any[], vehiculos: any[], setPedidosPendientes: any, setVehiculos: any) => {
    const movedPedido = pedidosPendientes.find(p => p.id === pedidoId);
    if (!movedPedido) return;

    setPedidosPendientes((prev: any[]) => prev.filter(p => p.id !== pedidoId));
    setVehiculos((prev: any[]) => prev.map((v: any) => v.id === vehiculoId ? { ...v, consolidado: [...v.consolidado, movedPedido] } : v));
    toast.success("Pedido asignado correctamente");
};

// ─── Direct Cargo Modal ───────────────────────────────────────────────────────
function DirectCargoModal({ vehiculo, productos, onClose, vehiculos, setVehiculos }: {
    vehiculo: any, productos: any[], onClose: () => void,
    vehiculos: any[], setVehiculos: any
}) {
    const [selectedProductId, setSelectedProductId] = useState<string | null>('');
    const [cantidad, setCantidad] = useState('');

    const addDirectItem = () => {
        if (!selectedProductId || !cantidad || Number(cantidad) <= 0) {
            toast.error('Selecciona producto y cantidad válida');
            return;
        }
        const prod = productos.find(p => p.id === selectedProductId);
        if (!prod) return;

        const fakeItem = {
            id: `direct-${Date.now()}`,
            producto_id: prod.id,
            productos: { descripcion: prod.descripcion },
            cantidad: Number(cantidad),
            unidad_medida: prod.unidad_medida || 'UND',
            precio_unitario: 0,
            tipo_carga: 'directo'
        };

        // Create a pseudo-pedido for this product
        const pseudoPedido = {
            id: `cargo-${Date.now()}-${prod.id}`,
            numero: `CARGA`,
            estado: 'normal',
            clientes: { razon_social: `[Carga Directa] ${prod.descripcion}`, distrito: '', direccion: '' },
            total: 0,
            pedido_items: [fakeItem]
        };

        setVehiculos((prev: any[]) => prev.map((v: any) =>
            v.id === vehiculo.id ? { ...v, consolidado: [...v.consolidado, pseudoPedido] } : v
        ));
        toast.success(`${prod.descripcion} agregado a ${vehiculo.placa}`);
        setCantidad('');
        setSelectedProductId('');
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[480px] border-t-8 border-primary">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-black">
                        <Plus className="w-5 h-5 text-primary" /> Agregar Carga Directa
                    </DialogTitle>
                    <DialogDescription>Vehículo: <strong>{vehiculo.placa}</strong> · {vehiculo.chofer_nombre}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-gray-500">Producto</Label>
                        <Select value={selectedProductId || ''} onValueChange={(v) => v && setSelectedProductId(v)}>
                            <SelectTrigger className="h-11">
                                <SelectValue placeholder="Seleccionar producto..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                                {productos.map(p => (
                                    <SelectItem key={p.id} value={p.id} className="text-sm">
                                        {p.descripcion} ({p.unidad_medida})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-gray-500">Cantidad</Label>
                        <Input
                            type="number" min="0.1" step="0.5" placeholder="0"
                            className="h-11" value={cantidad}
                            onChange={e => setCantidad(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') addDirectItem(); }}
                        />
                    </div>
                    <Button className="w-full h-11 font-black text-sm" onClick={addDirectItem}>
                        <Plus className="w-4 h-4 mr-2" /> Agregar al Vehículo
                    </Button>
                </div>
                <DialogFooter>
                    <Button variant="outline" className="border-2 font-bold" onClick={onClose}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function DespachoPage() {
    const queryClient = useQueryClient();

    const [pedidosPendientes, setPedidosPendientes] = useState<any[]>([]);
    const [vehiculos, setVehiculos] = useState<any[]>([]);
    const [selectedVehiculo, setSelectedVehiculo] = useState<any>(null);
    const [isPickingListOpen, setIsPickingListOpen] = useState(false);
    const [selectedPedido, setSelectedPedido] = useState<any>(null);
    const [isPedidoModalOpen, setIsPedidoModalOpen] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [directCargoVehicle, setDirectCargoVehicle] = useState<any>(null);

    const { isLoading: isLoadingVehiculos } = useQuery({
        queryKey: ['vehiculos-despacho'],
        queryFn: async () => {
            const { data } = await supabase.from('vehiculos').select('*, usuarios!chofer_id(nombres, apellidos)').eq('activo', true);
            const formatted = (data || []).map(v => ({
                ...v,
                chofer_nombre: v.usuarios ? `${v.usuarios.nombres} ${v.usuarios.apellidos}` : 'Sin Asignar',
                carga_actual: 0,
                consolidado: []
            }));
            setVehiculos(formatted);
            return formatted;
        }
    });

    const { isLoading: isLoadingPedidos } = useQuery({
        queryKey: ['pedidos-pendientes'],
        queryFn: async () => {
            const { data } = await supabase.from('pedidos')
                .select('*, clientes(razon_social, distrito, direccion), pedido_items(*, productos(descripcion, unidad_medida))')
                .in('estado', ['pendiente', 'confirmado', 'aprobado']);
            setPedidosPendientes(data || []);
            return data;
        }
    });

    const { data: productos } = useQuery({
        queryKey: ['productos-despacho'],
        queryFn: async () => {
            const { data } = await supabase.from('productos').select('id, descripcion, unidad_medida, peso_kg').eq('activo', true).order('descripcion');
            return data || [];
        }
    });

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (event: DragStartEvent) => { setActiveId(event.active.id as string); };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        let movedPedido = pedidosPendientes.find(p => p.id === activeId);
        let source = 'pendientes';

        if (!movedPedido) {
            for (const v of vehiculos) {
                const found = v.consolidado.find((p: any) => p.id === activeId);
                if (found) { movedPedido = found; source = v.id; break; }
            }
        }

        if (!movedPedido) return;

        let target = '';
        if (overId === 'pendientes') {
            target = 'pendientes';
        } else {
            const vTarget = vehiculos.find(v => v.id === overId || v.consolidado.find((p: any) => p.id === overId));
            if (vTarget) target = vTarget.id;
        }

        if (!target || source === target) return;

        if (source === 'pendientes') {
            setPedidosPendientes(prev => prev.filter(p => p.id !== activeId));
        } else {
            setVehiculos(prev => prev.map(v => v.id === source ? { ...v, consolidado: v.consolidado.filter((p: any) => p.id !== activeId) } : v));
        }

        if (target === 'pendientes') {
            setPedidosPendientes(prev => [...prev, movedPedido]);
        } else {
            setVehiculos(prev => prev.map(v => v.id === target ? { ...v, consolidado: [...v.consolidado, movedPedido] } : v));
        }
    };

    const confirmMutation = useMutation({
        mutationFn: async (vehiculoId: string) => {
            const v = vehiculos.find(vh => vh.id === vehiculoId);
            if (!v) return;

            // Separate real orders from direct items
            const realPedidosIds = v.consolidado
                .filter((p: any) => !p.id.startsWith('cargo-'))
                .map((p: any) => p.id);

            const directItems = v.consolidado
                .filter((p: any) => p.id.startsWith('cargo-'))
                .flatMap((p: any) => p.pedido_items);

            const res = await confirmarConsolidado({
                vehiculoId,
                choferId: v.chofer_id,
                pedidosIds: realPedidosIds,
                itemsDirectos: directItems
            });
            if (!res.success) throw new Error(res.error);
            return res;
        },
        onSuccess: (res) => {
            if (!res) return;
            toast.success(`Consolidado ${res.numero} generado con éxito`);
            queryClient.invalidateQueries({ queryKey: ['pedidos-pendientes'] });
            queryClient.invalidateQueries({ queryKey: ['vehiculos-despacho'] });
            setVehiculos(prev => prev.map(v => v.id === res.vehiculoId ? { ...v, consolidado: [] } : v));
        },
        onError: (err: any) => toast.error(err.message || 'Error al confirmar despacho')
    });

    const totalPendientesPeso = calcularPesoTotal(pedidosPendientes);

    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border shadow-sm shrink-0">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                        <Truck className="w-8 h-8 text-primary" /> Logística de Despacho
                    </h1>
                    <p className="text-gray-500 mt-1 flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <div className="px-4 py-2 text-center border-r border-gray-200">
                        <p className="text-[10px] uppercase font-bold text-gray-400">Pendientes</p>
                        <p className="text-xl font-black text-gray-800">{pedidosPendientes.length}</p>
                    </div>
                    <div className="px-4 py-2 text-center">
                        <p className="text-[10px] uppercase font-bold text-gray-400">Peso Total</p>
                        <p className="text-xl font-black text-primary">{totalPendientesPeso.toFixed(1)} <span className="text-xs">KG</span></p>
                    </div>
                </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div className="flex flex-1 gap-6 min-h-0 overflow-hidden">

                    {/* Columna Pendientes */}
                    <SortableContext id="pendientes" items={pedidosPendientes.map(p => p.id)} strategy={verticalListSortingStrategy}>
                        <Card className="w-[380px] flex flex-col bg-gray-50/50 border-2 border-dashed shrink-0 overflow-hidden">
                            <CardHeader className="py-4 border-b bg-white">
                                <CardTitle className="text-lg flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <Package className="w-5 h-5 text-gray-500" />
                                        <span>Bandeja de Pedidos</span>
                                    </div>
                                    <Badge variant="outline" className="bg-gray-100">{pedidosPendientes.length}</Badge>
                                </CardTitle>
                                <div className="relative mt-2">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input placeholder="Buscar por número o cliente..." className="h-9 pl-8 text-sm bg-white" />
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 p-4 overflow-y-auto">
                                <div className="space-y-4 min-h-[200px]">
                                    {pedidosPendientes.map(pedido => (
                                        <SortableItem key={pedido.id} id={pedido.id} pedido={pedido}
                                            vehiculos={vehiculos}
                                            onManualAssign={(pId, vId) => handleManualAssign(pId, vId, pedidosPendientes, vehiculos, setPedidosPendientes, setVehiculos)}
                                            onDetail={(p) => { setSelectedPedido(p); setIsPedidoModalOpen(true); }} />
                                    ))}
                                    {pedidosPendientes.length === 0 && !isLoadingPedidos && (
                                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                            <CheckCircle2 className="w-12 h-12 mb-3 opacity-20 text-green-500" />
                                            <p className="font-medium text-sm">¡Todo despachado!</p>
                                            <p className="text-[11px]">No hay pedidos pendientes hoy.</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </SortableContext>

                    {/* Vehículos Container */}
                    <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
                        {vehiculos.map(vehiculo => {
                            const pesoVehiculo = calcularPesoTotal(vehiculo.consolidado);
                            const porcentajeCarga = (pesoVehiculo / (vehiculo.capacidad_kg || 5000)) * 100;

                            return (
                                <SortableContext key={vehiculo.id} id={vehiculo.id} items={vehiculo.consolidado.map((p: any) => p.id)} strategy={verticalListSortingStrategy}>
                                    <Card key={vehiculo.id} className="flex flex-col h-full border-2 border-slate-200 shadow-xl rounded-3xl overflow-hidden transition-all hover:shadow-2xl hover:border-primary/40 bg-white group">
                                        <CardHeader className="bg-slate-900 text-white p-6 pb-4 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                                <Truck className="w-20 h-20 rotate-12" />
                                            </div>
                                            <div className="flex justify-between items-start mb-4 relative z-10">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-3 rounded-2xl ${vehiculo.consolidado.length > 0 ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                                                        <Truck className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black text-white text-xl leading-none tracking-tight">{vehiculo.placa}</h3>
                                                        <p className="text-[10px] text-slate-400 mt-1.5 uppercase font-black tracking-[0.2em]">{vehiculo.marca} {vehiculo.modelo}</p>
                                                    </div>
                                                </div>
                                                <Badge variant="secondary" className="bg-white/10 text-white border-white/20 font-black text-[10px] px-2 py-0.5 uppercase">
                                                    {vehiculo.consolidado.length} Cargas
                                                </Badge>
                                            </div>

                                            <div className="space-y-2 relative z-10">
                                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                                    <span className="text-slate-400">Capacidad Utilizada</span>
                                                    <span className={`${porcentajeCarga > 100 ? 'text-rose-400 font-black animate-pulse' : porcentajeCarga > 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                        {pesoVehiculo.toFixed(1)} / {vehiculo.capacidad_kg || 5000} KG
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                                                    <div
                                                        className={`h-full transition-all duration-1000 ease-out rounded-full ${porcentajeCarga > 100 ? 'bg-rose-500' : porcentajeCarga > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                        style={{ width: `${Math.min(porcentajeCarga, 100)}%` }}
                                                    />
                                                </div>
                                                {porcentajeCarga > 100 && (
                                                    <p className="text-[10px] text-rose-400 font-black uppercase mt-1 flex items-center gap-1.5">
                                                        <Zap className="w-3 h-3 fill-rose-400" /> ¡SOBRECARGA DETECTADA! ({(porcentajeCarga - 100).toFixed(0)}%)
                                                    </p>
                                                )}
                                            </div>

                                            <div className="mt-4 flex items-center gap-3 text-[10px] text-slate-300 bg-white/5 p-2 px-3 rounded-xl border border-white/10">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                                                <span className="font-black opacity-60 uppercase tracking-widest">Chofer:</span>
                                                <span className="font-bold text-white uppercase">{vehiculo.chofer_nombre}</span>
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full mt-4 h-9 text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl"
                                                onClick={() => setDirectCargoVehicle(vehiculo)}
                                            >
                                                <Plus className="w-3.5 h-3.5 mr-2" /> Agregar Carga Directa
                                            </Button>
                                        </CardHeader>

                                        <DroppableContainer id={vehiculo.id} className="flex-1 p-5 bg-slate-50/50 overflow-y-auto">
                                            <div className="space-y-4 min-h-[200px]">
                                                {vehiculo.consolidado.length === 0 ? (
                                                    <div className="h-full border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-slate-300 py-20 bg-white shadow-inner">
                                                        <div className="bg-slate-50 p-6 rounded-full mb-4">
                                                            <Truck className="w-12 h-12 opacity-10" />
                                                        </div>
                                                        <p className="text-xs font-black uppercase tracking-[0.2em] opacity-30">Contenedor Vacío</p>
                                                        <p className="text-[9px] mt-2 font-bold px-8 text-center leading-relaxed">Asigna pedidos del panel izquierdo de forma directa o arrastrándolos.</p>
                                                    </div>
                                                ) : (
                                                    vehiculo.consolidado.map((pedido: any) => (
                                                        <SortableItem key={pedido.id} id={pedido.id} pedido={pedido} onDetail={(p) => {
                                                            setSelectedPedido(p);
                                                            setIsPedidoModalOpen(true);
                                                        }} />
                                                    ))
                                                )}
                                            </div>
                                        </DroppableContainer>

                                        {vehiculo.consolidado.length > 0 && (
                                            <div className="p-5 border-t bg-white gap-3 flex flex-col shrink-0">
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        className="flex-1 text-[10px] font-black uppercase tracking-widest h-12 border-2 rounded-2xl hover:bg-slate-50"
                                                        onClick={() => { setSelectedVehiculo(vehiculo); setIsPickingListOpen(true); }}
                                                    >
                                                        <FileText className="w-4 h-4 mr-2 text-primary" />
                                                        Picking List
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="h-12 w-12 border-2 rounded-2xl hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                                        onClick={() => setVehiculos(prev => prev.map(v => v.id === vehiculo.id ? { ...v, consolidado: [] } : v))}
                                                    >
                                                        <Zap className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                                <Button
                                                    className="w-full text-[11px] font-black uppercase tracking-[0.2em] h-14 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 rounded-2xl"
                                                    disabled={confirmMutation.isPending}
                                                    onClick={() => confirmMutation.mutate(vehiculo.id)}
                                                >
                                                    {confirmMutation.isPending ? 'PROCESANDO...' : 'CONFIRMAR DESPACHO'}
                                                </Button>
                                            </div>
                                        )}
                                    </Card>
                                </SortableContext>
                            );
                        })}
                    </div>
                </div>
            </DndContext>

            {/* Direct cargo modal */}
            {directCargoVehicle && (
                <DirectCargoModal
                    vehiculo={directCargoVehicle}
                    productos={productos || []}
                    vehiculos={vehiculos}
                    setVehiculos={setVehiculos}
                    onClose={() => setDirectCargoVehicle(null)}
                />
            )}

            {/* Pedido Detail Modal */}
            <Dialog open={isPedidoModalOpen} onOpenChange={setIsPedidoModalOpen}>
                <DialogContent className="sm:max-w-[600px] border-t-8 border-primary">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black flex items-center gap-2">
                            Pedido {selectedPedido?.numero}
                        </DialogTitle>
                        <DialogDescription className="text-gray-500 font-medium italic">
                            {selectedPedido?.clientes?.razon_social} · RUC: {selectedPedido?.clientes?.numero_documento}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-3 rounded-lg border">
                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Dirección de Entrega</p>
                                <p className="text-sm font-medium flex items-start gap-2">
                                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                    {selectedPedido?.clientes?.direccion}
                                </p>
                                <p className="text-xs text-gray-500 mt-1 ml-6">{selectedPedido?.clientes?.distrito}, Lima</p>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                <p className="text-[10px] uppercase font-bold text-blue-400 mb-1">Resumen Económico</p>
                                <div className="flex justify-between items-end">
                                    <p className="text-2xl font-black text-blue-900">S/ {selectedPedido?.total}</p>
                                    <Badge className="bg-blue-600">Pendiente</Badge>
                                </div>
                            </div>
                        </div>

                        <div>
                            <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <Package className="w-4 h-4" /> Detalle de Productos
                            </p>
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-gray-50">
                                        <TableRow>
                                            <TableHead className="font-bold text-gray-600">Producto</TableHead>
                                            <TableHead className="text-right font-bold text-gray-600">Cant.</TableHead>
                                            <TableHead className="text-right font-bold text-gray-600">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedPedido?.pedido_items?.map((it: any, idx: number) => (
                                            <TableRow key={idx}>
                                                <TableCell className="text-sm font-medium">{it.productos?.descripcion}</TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant="outline" className="font-bold border-gray-200">
                                                        {it.cantidad} {it.unidad_medida}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-gray-800">S/ {(it.cantidad * it.precio_unitario).toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {selectedPedido?.observaciones && (
                            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-amber-800 text-sm italic">
                                <span className="font-bold not-italic">Obs:</span> {selectedPedido.observaciones}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button className="w-full bg-gray-900 hover:bg-black text-white font-bold" onClick={() => setIsPedidoModalOpen(false)}>Cerrar Detalle</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Picking List Modal */}
            <Dialog open={isPickingListOpen} onOpenChange={setIsPickingListOpen}>
                <DialogContent className="sm:max-w-[750px] max-h-[90vh] flex flex-col overflow-hidden border-t-8 border-primary">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-2xl font-black">
                            <div className="bg-primary text-white p-2 rounded-xl">
                                <FileText className="w-6 h-6" />
                            </div>
                            Picking List Consolidado
                        </DialogTitle>
                        <DialogDescription className="text-lg font-bold text-primary">
                            Vehículo: {selectedVehiculo?.placa} · {selectedVehiculo?.chofer_nombre}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto mt-6 space-y-8 pr-2">
                        <div className="bg-blue-50/40 p-6 rounded-2xl border-2 border-blue-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Package className="w-24 h-24 text-blue-900" />
                            </div>
                            <h3 className="text-xs font-black text-blue-900 mb-4 uppercase tracking-widest flex items-center gap-2">
                                <Package className="w-4 h-4" /> Resumen de Carga Agrupado
                            </h3>
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-blue-200">
                                        <TableHead className="text-blue-900 font-black">Producto</TableHead>
                                        <TableHead className="text-right text-blue-900 font-black">Cantidad</TableHead>
                                        <TableHead className="text-blue-900 font-black">Peso Est.</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.values(selectedVehiculo?.consolidado.reduce((acc: any, ped: any) => {
                                        ped.pedido_items?.forEach((it: any) => {
                                            const key = it.producto_id;
                                            if (!acc[key]) acc[key] = { desc: it.productos?.descripcion, cant: 0, und: it.unidad_medida || it.productos?.unidad_medida, peso: 0 };
                                            acc[key].cant += Number(it.cantidad);
                                            if (it.unidad_medida === 'KG') acc[key].peso += Number(it.cantidad);
                                        });
                                        return acc;
                                    }, {}) || {}).map((item: any, idx: number) => (
                                        <TableRow key={idx} className="border-blue-100 hover:bg-blue-100/50 transition-colors">
                                            <TableCell className="font-bold text-gray-800">{item.desc}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge className="bg-blue-600 text-white font-black px-3">
                                                    {item.cant.toFixed(1)} {item.und}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-blue-900">
                                                {item.peso > 0 ? `${item.peso.toFixed(1)} KG` : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div>
                            <h3 className="text-xs font-black text-gray-500 mb-4 uppercase tracking-widest flex items-center gap-2">
                                <Truck className="w-4 h-4" /> Desglose por Comprobante
                            </h3>
                            <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
                                <Table>
                                    <TableHeader className="bg-gray-50/80">
                                        <TableRow>
                                            <TableHead className="font-black">N° Reg</TableHead>
                                            <TableHead className="font-black">Cliente</TableHead>
                                            <TableHead className="font-black">Zona / Distrito</TableHead>
                                            <TableHead className="text-right font-black">Carga</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedVehiculo?.consolidado.map((p: any) => (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-black text-primary">{p.numero}</TableCell>
                                                <TableCell className="text-xs font-bold">{p.clientes?.razon_social}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-[10px] font-bold border-gray-200 bg-gray-50">{p.clientes?.distrito}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-gray-700">
                                                    {calcularPesoTotal([p]).toFixed(1)} KG
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="mt-6 pt-6 border-t gap-3">
                        <Button variant="outline" className="px-8 border-2 font-bold" onClick={() => setIsPickingListOpen(false)}>Cerrar</Button>
                        <Button className="flex-1 bg-primary hover:bg-primary/90 text-sm font-black h-12 rounded-xl shadow-lg shadow-primary/20" onClick={() => {
                            toast.success("Imprimiendo Picking List...");
                            window.print();
                        }}>
                            <FileText className="w-5 h-5 mr-3" />
                            IMPRIMIR GUÍA DE DESPACHO
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function calcularPesoTotal(peds: any[]) {
    return peds.reduce((acc, p) => {
        const pPeso = p.pedido_items?.reduce((pa: number, it: any) => {
            if (it.unidad_medida === 'KG') return pa + (Number(it.cantidad) || 0);
            return pa;
        }, 0) || 0;
        return acc + pPeso;
    }, 0);
}
