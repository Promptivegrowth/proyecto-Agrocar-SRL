'use client';

import { useState } from 'react';
import { Truck, Package, Plus, Trash2, CheckCircle2, FileText, Zap, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// ─── Types ───────────────────────────────────────────────────────────────────
interface CargoItem {
    producto_id: string;
    descripcion: string;
    cantidad: number;
    unidad: string;
    peso_kg: number;
}

interface VehicleCargo {
    vehiculo_id: string;
    items: CargoItem[];
}

export default function DespachoPage() {
    const queryClient = useQueryClient();

    // Track cargo per vehicle: vehiculo_id -> CargoItem[]
    const [cargas, setCargas] = useState<Record<string, CargoItem[]>>({});
    const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);
    const [selectedVehicleForPrint, setSelectedVehicleForPrint] = useState<any>(null);
    const [isPrintOpen, setIsPrintOpen] = useState(false);

    // Per-vehicle product selector state
    const [addingTo, setAddingTo] = useState<string | null>(null);
    const [selectedProductId, setSelectedProductId] = useState<string | null>('');
    const [cantidad, setCantidad] = useState('');

    // DB Queries
    const { data: vehiculos, isLoading: loadingVehiculos } = useQuery({
        queryKey: ['vehiculos-despacho'],
        queryFn: async () => {
            const { data } = await supabase
                .from('vehiculos')
                .select('*, usuarios!chofer_id(nombres, apellidos)')
                .eq('activo', true);
            return (data || []).map(v => ({
                ...v,
                chofer_nombre: v.usuarios ? `${v.usuarios.nombres} ${v.usuarios.apellidos}` : 'Sin Asignar',
            }));
        }
    });

    const { data: productos, isLoading: loadingProductos } = useQuery({
        queryKey: ['productos-despacho'],
        queryFn: async () => {
            const { data } = await supabase
                .from('productos')
                .select('id, descripcion, unidad_medida, peso_kg')
                .eq('activo', true)
                .order('descripcion');
            return data || [];
        }
    });

    // Helper: get cargo for a vehicle
    const getCarga = (vehiculoId: string): CargoItem[] => cargas[vehiculoId] || [];

    const pesoTotal = (vehiculoId: string) =>
        getCarga(vehiculoId).reduce((acc, i) => acc + (i.peso_kg * i.cantidad), 0);

    // Add product to vehicle
    const addItem = (vehiculoId: string) => {
        if (!selectedProductId || !cantidad || Number(cantidad) <= 0) {
            toast.error('Selecciona un producto y cantidad válida');
            return;
        }
        const prod = productos?.find(p => p.id === selectedProductId);
        if (!prod) return;

        setCargas(prev => {
            const existing = prev[vehiculoId] || [];
            const idx = existing.findIndex(i => i.producto_id === selectedProductId);
            if (idx >= 0) {
                // Add quantity to existing
                const updated = [...existing];
                updated[idx] = { ...updated[idx], cantidad: updated[idx].cantidad + Number(cantidad) };
                return { ...prev, [vehiculoId]: updated };
            }
            return {
                ...prev,
                [vehiculoId]: [...existing, {
                    producto_id: prod.id,
                    descripcion: prod.descripcion,
                    cantidad: Number(cantidad),
                    unidad: prod.unidad_medida || 'UND',
                    peso_kg: prod.peso_kg || 0
                }]
            };
        });
        setCantidad('');
        setSelectedProductId('');
        toast.success(`${prod.descripcion} agregado al vehículo`);
    };

    // Remove item from vehicle
    const removeItem = (vehiculoId: string, productoId: string) => {
        setCargas(prev => ({
            ...prev,
            [vehiculoId]: (prev[vehiculoId] || []).filter(i => i.producto_id !== productoId)
        }));
    };

    // Clear vehicle cargo
    const clearCarga = (vehiculoId: string) => {
        setCargas(prev => ({ ...prev, [vehiculoId]: [] }));
        toast.info('Carga vaciada');
    };

    // Confirm dispatch (deduct stock)
    const confirmMutation = useMutation({
        mutationFn: async (vehiculoId: string) => {
            const items = getCarga(vehiculoId);
            if (items.length === 0) throw new Error('Agrega productos primero');

            // Get empresa_id
            const { data: { user } } = await supabase.auth.getUser();
            const { data: usr } = await supabase.from('usuarios').select('empresa_id').eq('id', user!.id).single();

            // Deduct stock for each product
            for (const item of items) {
                const { data: stock } = await supabase
                    .from('stock')
                    .select('id, cantidad')
                    .eq('producto_id', item.producto_id)
                    .limit(1)
                    .maybeSingle();

                if (stock) {
                    const nuevo = stock.cantidad - item.cantidad;
                    await supabase.from('stock').update({ cantidad: nuevo }).eq('id', stock.id);
                    await supabase.from('stock_movimientos').insert({
                        empresa_id: usr?.empresa_id,
                        producto_id: item.producto_id,
                        tipo: 'salida',
                        motivo: 'despacho_vehiculo',
                        cantidad: item.cantidad,
                        referencia_tipo: 'despacho',
                        saldo_anterior: stock.cantidad,
                        saldo_posterior: nuevo,
                        usuario_id: user!.id,
                        fecha: new Date().toISOString()
                    });
                }
            }
            return vehiculoId;
        },
        onSuccess: (vehiculoId) => {
            clearCarga(vehiculoId);
            queryClient.invalidateQueries({ queryKey: ['inventario'] });
            toast.success('¡Despacho confirmado! Stock descontado correctamente.');
        },
        onError: (e: any) => toast.error('Error: ' + e.message)
    });

    const today = new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border shadow-sm">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                        <Truck className="w-8 h-8 text-blue-600" /> Gestión de Carga de Vehículos
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm capitalize">{today}</p>
                </div>
                <div className="flex gap-4 text-center bg-gray-50 p-3 rounded-xl">
                    <div className="px-4 border-r">
                        <p className="text-[10px] uppercase font-bold text-gray-400">Vehículos</p>
                        <p className="text-2xl font-black text-gray-800">{vehiculos?.length || 0}</p>
                    </div>
                    <div className="px-4">
                        <p className="text-[10px] uppercase font-bold text-gray-400">Con Carga</p>
                        <p className="text-2xl font-black text-blue-600">
                            {vehiculos?.filter(v => getCarga(v.id).length > 0).length || 0}
                        </p>
                    </div>
                </div>
            </div>

            {/* How to use */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                <Zap className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                <div className="text-sm text-blue-800">
                    <strong>Cómo usar:</strong> Expande un vehículo → Selecciona un producto → Ingresa la cantidad → Agrega.
                    Repite para todos los productos. Cuando termines, presiona <strong>"Confirmar Despacho"</strong> para descontar del inventario.
                </div>
            </div>

            {/* Vehicles */}
            {loadingVehiculos ? (
                <div className="text-center py-20 text-gray-400 font-medium">Cargando vehículos...</div>
            ) : (vehiculos || []).map(vehiculo => {
                const items = getCarga(vehiculo.id);
                const peso = pesoTotal(vehiculo.id);
                const capacidad = vehiculo.capacidad_kg || 5000;
                const pct = Math.min((peso / capacidad) * 100, 100);
                const isExpanded = expandedVehicle === vehiculo.id;
                const isOverloaded = peso > capacidad;

                return (
                    <Card key={vehiculo.id} className={`border-2 transition-all rounded-2xl overflow-hidden ${items.length > 0 ? 'border-blue-300 shadow-lg shadow-blue-100' : 'border-gray-200'}`}>
                        {/* Vehicle Header - Always visible */}
                        <div
                            className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => setExpandedVehicle(isExpanded ? null : vehiculo.id)}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${items.length > 0 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                    <Truck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="font-black text-xl text-gray-900">{vehiculo.placa}</h2>
                                    <p className="text-xs text-gray-400 uppercase tracking-wide">{vehiculo.marca} {vehiculo.modelo} · Chofer: {vehiculo.chofer_nombre}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {items.length > 0 && (
                                    <div className="text-right hidden sm:block">
                                        <p className={`text-sm font-black ${isOverloaded ? 'text-red-600' : 'text-blue-600'}`}>
                                            {peso.toFixed(1)} / {capacidad} KG
                                        </p>
                                        <p className="text-[10px] text-gray-400 uppercase">{items.length} producto(s)</p>
                                    </div>
                                )}
                                <Badge className={`${items.length > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'} font-black text-xs border-none`}>
                                    {items.length > 0 ? `${items.length} items` : 'VACÍO'}
                                </Badge>
                                {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="border-t">
                                {/* Capacity bar */}
                                {items.length > 0 && (
                                    <div className="px-5 py-3 bg-gray-50 border-b">
                                        <div className="flex justify-between text-xs font-bold mb-1">
                                            <span className="text-gray-500">Capacidad Utilizada</span>
                                            <span className={isOverloaded ? 'text-red-600 animate-pulse' : 'text-blue-600'}>
                                                {peso.toFixed(1)} KG / {capacidad} KG ({pct.toFixed(0)}%)
                                            </span>
                                        </div>
                                        <Progress value={pct} className={`h-2 ${isOverloaded ? 'bg-red-100' : ''}`} />
                                        {isOverloaded && (
                                            <p className="text-[10px] text-red-600 font-bold flex items-center gap-1 mt-1">
                                                <AlertTriangle className="w-3 h-3" /> Excede capacidad del vehículo
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="p-5 space-y-5">
                                    {/* Add Product Form */}
                                    <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                                        <p className="text-xs font-black text-blue-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Plus className="w-4 h-4" /> Agregar Producto a este Vehículo
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <div className="flex-1">
                                                <Label className="text-[10px] font-black text-gray-500 uppercase">Producto</Label>
                                                <Select
                                                    value={addingTo === vehiculo.id ? selectedProductId : ''}
                                                    onValueChange={(v) => {
                                                        setAddingTo(vehiculo.id);
                                                        setSelectedProductId(v);
                                                    }}
                                                >
                                                    <SelectTrigger className="mt-1 h-10 bg-white border-blue-200 text-sm">
                                                        <SelectValue placeholder="Seleccionar producto..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-60">
                                                        {loadingProductos ? (
                                                            <SelectItem value="_loading" disabled>Cargando...</SelectItem>
                                                        ) : (productos || []).map(p => (
                                                            <SelectItem key={p.id} value={p.id} className="text-sm">
                                                                {p.descripcion} ({p.unidad_medida})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="w-32">
                                                <Label className="text-[10px] font-black text-gray-500 uppercase">Cantidad</Label>
                                                <Input
                                                    type="number"
                                                    min="0.1"
                                                    step="0.5"
                                                    placeholder="0"
                                                    className="mt-1 h-10 bg-white border-blue-200"
                                                    value={addingTo === vehiculo.id ? cantidad : ''}
                                                    onChange={(e) => {
                                                        setAddingTo(vehiculo.id);
                                                        setCantidad(e.target.value);
                                                    }}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') addItem(vehiculo.id); }}
                                                />
                                            </div>
                                            <div className="flex items-end">
                                                <Button
                                                    className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase rounded-xl"
                                                    onClick={() => {
                                                        setAddingTo(vehiculo.id);
                                                        addItem(vehiculo.id);
                                                    }}
                                                >
                                                    <Plus className="w-4 h-4 mr-1" /> Agregar
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Current Cargo */}
                                    {items.length > 0 ? (
                                        <div>
                                            <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <Package className="w-4 h-4" /> Carga Actual del Vehículo
                                            </p>
                                            <div className="border rounded-xl overflow-hidden bg-white">
                                                <Table>
                                                    <TableHeader className="bg-gray-50">
                                                        <TableRow>
                                                            <TableHead className="font-black text-xs">Producto</TableHead>
                                                            <TableHead className="text-right font-black text-xs">Cantidad</TableHead>
                                                            <TableHead className="text-right font-black text-xs">Peso Est.</TableHead>
                                                            <TableHead className="w-10"></TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {items.map(item => (
                                                            <TableRow key={item.producto_id}>
                                                                <TableCell className="font-medium text-sm">{item.descripcion}</TableCell>
                                                                <TableCell className="text-right">
                                                                    <Badge variant="outline" className="font-bold border-blue-200 bg-blue-50 text-blue-700">
                                                                        {item.cantidad} {item.unidad}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="text-right text-sm font-medium text-gray-500">
                                                                    {item.peso_kg > 0 ? `${(item.peso_kg * item.cantidad).toFixed(1)} KG` : '—'}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                                                        onClick={() => removeItem(vehiculo.id, item.producto_id)}
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-3 mt-4">
                                                <Button
                                                    variant="outline"
                                                    className="flex-1 border-2 font-bold text-xs h-10"
                                                    onClick={() => {
                                                        const v = vehiculos?.find(vv => vv.id === vehiculo.id);
                                                        setSelectedVehicleForPrint({ ...v, items, peso });
                                                        setIsPrintOpen(true);
                                                    }}
                                                >
                                                    <FileText className="w-4 h-4 mr-2 text-blue-600" /> Ver Detalle
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="border-2 font-bold text-xs h-10 text-red-500 border-red-200 hover:bg-red-50"
                                                    onClick={() => clearCarga(vehiculo.id)}
                                                >
                                                    <Trash2 className="w-4 h-4 mr-1" /> Vaciar
                                                </Button>
                                                <Button
                                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-black text-xs h-10 rounded-xl"
                                                    disabled={confirmMutation.isPending || isOverloaded}
                                                    onClick={() => confirmMutation.mutate(vehiculo.id)}
                                                >
                                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                                    {confirmMutation.isPending ? 'Confirmando...' : 'Confirmar Despacho'}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-2xl">
                                            <Truck className="w-12 h-12 mx-auto mb-3 opacity-10" />
                                            <p className="font-bold text-sm">Vehículo Vacío</p>
                                            <p className="text-xs mt-1">Agrega productos usando el formulario de arriba</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </Card>
                );
            })}

            {/* Print/Detail Modal */}
            <Dialog open={isPrintOpen} onOpenChange={setIsPrintOpen}>
                <DialogContent className="sm:max-w-[600px] border-t-8 border-blue-600">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black flex items-center gap-2">
                            <Truck className="w-5 h-5 text-blue-600" />
                            Guía de Carga — {selectedVehicleForPrint?.placa}
                        </DialogTitle>
                        <p className="text-sm text-gray-500">Chofer: {selectedVehicleForPrint?.chofer_nombre} · {today}</p>
                    </DialogHeader>
                    <div className="border rounded-xl overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead className="font-black">Producto</TableHead>
                                    <TableHead className="text-right font-black">Cantidad</TableHead>
                                    <TableHead className="text-right font-black">Peso</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedVehicleForPrint?.items?.map((item: CargoItem) => (
                                    <TableRow key={item.producto_id}>
                                        <TableCell className="font-medium">{item.descripcion}</TableCell>
                                        <TableCell className="text-right font-bold">{item.cantidad} {item.unidad}</TableCell>
                                        <TableCell className="text-right text-gray-500">
                                            {item.peso_kg > 0 ? `${(item.peso_kg * item.cantidad).toFixed(1)} KG` : '—'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="bg-blue-50 font-black">
                                    <TableCell className="font-black">TOTAL</TableCell>
                                    <TableCell></TableCell>
                                    <TableCell className="text-right font-black text-blue-700">
                                        {selectedVehicleForPrint?.peso?.toFixed(1)} KG
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                    <DialogFooter className="gap-3 mt-4">
                        <Button variant="outline" className="border-2 font-bold" onClick={() => setIsPrintOpen(false)}>Cerrar</Button>
                        <Button className="bg-blue-600 text-white font-black" onClick={() => window.print()}>
                            <FileText className="w-4 h-4 mr-2" /> Imprimir Guía
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
