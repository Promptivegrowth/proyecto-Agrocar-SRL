'use client';

import { useState, useEffect } from 'react';
import { Truck, MapPin, Search, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

function SortableItem({ id, pedido }: { id: string, pedido: any }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}
            className="group bg-white p-3 rounded-md border shadow-sm cursor-grab hover:border-primary active:cursor-grabbing transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-sm">{pedido.numero}</span>
                <Badge variant={pedido.estado === 'urgente' ? 'destructive' : 'secondary'} className="text-[10px]">
                    {pedido.estado === 'urgente' ? 'URGENTE' : 'Normal'}
                </Badge>
            </div>
            <p className="text-sm font-medium text-gray-800 line-clamp-1">{pedido.clientes?.razon_social || 'Cliente'}</p>
            <div className="flex items-center text-xs text-gray-500 mt-2 gap-3">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {pedido.clientes?.distrito || 'Sin distrito'}</span>
                <span className="flex items-center gap-1 font-semibold text-blue-600">S/ {pedido.total}</span>
            </div>
            <div className="mt-3 pt-2 border-t opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" className="w-full h-7 text-[10px] text-gray-400 hover:text-primary" onClick={(e) => { e.stopPropagation(); toast.info(`Pedido ${pedido.numero}: ${pedido.clientes?.razon_social}`); }}>
                    Ver Detalle
                </Button>
            </div>
        </div>
    );
}

export default function DespachoPage() {
    const queryClient = useQueryClient();

    // Local state for drag & drop
    const [pedidosPendientes, setPedidosPendientes] = useState<any[]>([]);
    const [vehiculos, setVehiculos] = useState<any[]>([]);

    const { isLoading: isLoadingVehiculos } = useQuery({
        queryKey: ['vehiculos-despacho'],
        queryFn: async () => {
            const { data, error } = await supabase.from('vehiculos').select('*, usuarios(nombres, apellidos)').eq('activo', true);
            if (error) throw error;
            const formatted = data.map(v => ({
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
            const { data, error } = await supabase.from('pedidos').select('*, clientes(razon_social, distrito)').eq('estado', 'pendiente');
            if (error) throw error;
            setPedidosPendientes(data || []);
            return data;
        }
    });

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Find the pedido
        let movedPedido = pedidosPendientes.find(p => p.id === activeId);
        let source = 'pendientes';

        if (!movedPedido) {
            // check vehiculos
            for (const v of vehiculos) {
                const found = v.consolidado.find((p: any) => p.id === activeId);
                if (found) {
                    movedPedido = found;
                    source = v.id;
                    break;
                }
            }
        }

        if (!movedPedido) return;

        // target
        let target = '';
        if (overId === 'pendientes') {
            target = 'pendientes';
        } else {
            // Is it a vehicle container?
            const vTarget = vehiculos.find(v => v.id === overId || v.consolidado.find((p: any) => p.id === overId));
            if (vTarget) target = vTarget.id;
        }

        if (!target || source === target) return;

        // Remove from source
        if (source === 'pendientes') {
            setPedidosPendientes(prev => prev.filter(p => p.id !== activeId));
        } else {
            setVehiculos(prev => prev.map(v => v.id === source ? { ...v, consolidado: v.consolidado.filter((p: any) => p.id !== activeId) } : v));
        }

        // Add to target
        if (target === 'pendientes') {
            setPedidosPendientes(prev => [...prev, movedPedido]);
        } else {
            setVehiculos(prev => prev.map(v => v.id === target ? { ...v, consolidado: [...v.consolidado, movedPedido] } : v));
        }
    };

    const confirmMutation = useMutation({
        mutationFn: async () => {
            const vehiculosAConfirmar = vehiculos.filter(v => v.consolidado.length > 0);
            if (vehiculosAConfirmar.length === 0) throw new Error("No hay consolidados armados para despachar");

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error('Sesión expirada. Reingrese.');
                window.location.href = '/login';
                return;
            }

            const { data: usuario, error: userError } = await supabase
                .from('usuarios')
                .select('empresa_id')
                .eq('id', user.id)
                .single();

            if (userError || !usuario) throw new Error('Usuario no vinculado a empresa');

            for (const v of vehiculosAConfirmar) {
                // 1. Create Consolidado
                const numStr = 'C-' + Math.floor(Math.random() * 10000);
                const { data: consol, error: errC } = await supabase.from('consolidados_despacho').insert([{
                    empresa_id: usuario.empresa_id,
                    numero: numStr,
                    fecha: new Date().toISOString().split('T')[0],
                    vehiculo_id: v.id,
                    chofer_id: v.chofer_id,
                    estado: 'preparando',
                    total_pedidos: v.consolidado.length
                }]).select().single();

                if (errC) throw errC;

                // 2. Update each Pedido
                for (const p of v.consolidado) {
                    await supabase.from('pedidos').update({
                        estado: 'en_despacho',
                        vehiculo_id: v.id,
                        consolidado_id: consol.id
                    }).eq('id', p.id);
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pedidos-pendientes'] });
            toast.success("Consolidados de despacho confirmados exitosamente!");
        },
        onError: (error: any) => {
            toast.error("Error al confirmar: " + error.message);
        }
    });

    return (
        <div className="h-full flex flex-col space-y-4">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Asignación de Despacho</h1>
                    <p className="text-gray-500 mt-1">Arma los consolidados arrastrando pedidos hacia los vehículos</p>
                </div>
                <div className="flex gap-2">
                    <Button className="bg-primary hover:bg-primary/90 text-white" disabled={confirmMutation.isPending} onClick={() => confirmMutation.mutate()}>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {confirmMutation.isPending ? 'Confirmando...' : 'Confirmar Consolidados'}
                    </Button>
                </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className="flex flex-1 gap-6 min-h-0 overflow-hidden">

                    {/* Columna Pendientes */}
                    <SortableContext id="pendientes" items={pedidosPendientes.map(p => p.id)} strategy={verticalListSortingStrategy}>
                        <Card id="pendientes" className="w-[350px] flex flex-col bg-gray-50/50 border-dashed shrink-0">
                            <CardHeader className="py-4 border-b bg-white rounded-t-xl">
                                <CardTitle className="text-lg flex justify-between items-center">
                                    <span>Pedidos Pendientes</span>
                                    <Badge>{pedidosPendientes.length}</Badge>
                                </CardTitle>
                                <div className="relative mt-2">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input placeholder="Buscar..." className="h-8 pl-8 text-sm" />
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 p-3 overflow-y-auto">
                                <div className="space-y-3 min-h-[100px]">
                                    {pedidosPendientes.map(pedido => (
                                        <SortableItem key={pedido.id} id={pedido.id} pedido={pedido} />
                                    ))}
                                    {pedidosPendientes.length === 0 && !isLoadingPedidos && (
                                        <div className="text-center text-sm text-gray-400 mt-10">No hay pedidos pendientes.</div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </SortableContext>

                    {/* Vehículos Container */}
                    <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
                        {vehiculos.map(vehiculo => (
                            <SortableContext key={vehiculo.id} id={vehiculo.id} items={vehiculo.consolidado.map((p: any) => p.id)} strategy={verticalListSortingStrategy}>
                                <Card id={vehiculo.id} className="w-[350px] flex flex-col shrink-0 border border-gray-200">
                                    <CardHeader className="py-4 border-b bg-gray-50">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2 font-bold text-gray-800">
                                                <Truck className="w-5 h-5 text-gray-600" /> {vehiculo.placa}
                                            </div>
                                            <Badge variant="secondary">
                                                {vehiculo.consolidado.length} peds
                                            </Badge>
                                        </div>
                                        <p className="text-sm font-medium text-gray-500">Chofer: {vehiculo.chofer_nombre}</p>
                                    </CardHeader>
                                    <CardContent className="flex-1 p-3 bg-gray-50/30 overflow-y-auto min-h-[100px]">
                                        <div className="space-y-3">
                                            {vehiculo.consolidado.length === 0 ? (
                                                <div className="h-full mt-6 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 text-sm py-12 bg-white/50 backdrop-blur-sm group-hover:border-primary/50 transition-colors">
                                                    <Truck className="w-8 h-8 mb-2 opacity-20" />
                                                    <span className="font-medium">Carga Vacía</span>
                                                    <span className="text-[10px] uppercase mt-1">Arrastre pedidos aquí</span>
                                                </div>
                                            ) : (
                                                vehiculo.consolidado.map((pedido: any) => (
                                                    <SortableItem key={pedido.id} id={pedido.id} pedido={pedido} />
                                                ))
                                            )}
                                        </div>
                                    </CardContent>
                                    {vehiculo.consolidado.length > 0 && (
                                        <div className="p-3 border-t bg-white shrink-0">
                                            <Button variant="outline" className="w-full text-xs" size="sm">
                                                Ver Picking List / Imprimir
                                            </Button>
                                        </div>
                                    )}
                                </Card>
                            </SortableContext>
                        ))}
                    </div>
                </div>
            </DndContext>
        </div>
    );
}
