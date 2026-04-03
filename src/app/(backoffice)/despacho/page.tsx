'use client';

import { useState } from 'react';
import { Truck, MapPin, Search, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ id, pedido }: { id: string, pedido: any }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}
            className="bg-white p-3 rounded-md border shadow-sm cursor-grab hover:border-primary active:cursor-grabbing">
            <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-sm">{pedido.numero}</span>
                <Badge variant={pedido.estado === 'urgente' ? 'destructive' : 'secondary'} className="text-[10px]">
                    {pedido.estado === 'urgente' ? 'URGENTE' : 'Normal'}
                </Badge>
            </div>
            <p className="text-sm font-medium text-gray-800 line-clamp-1">{pedido.cliente}</p>
            <div className="flex items-center text-xs text-gray-500 mt-2 gap-3">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {pedido.distrito}</span>
                <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {pedido.peso} kg</span>
            </div>
        </div>
    );
}

export default function DespachoPage() {
    const [pedidosPendientes, setPedidosPendientes] = useState([
        { id: '1', numero: 'PED-001', cliente: 'Bodega Central SAC', estado: 'normal', distrito: 'Surco', peso: 45.5 },
        { id: '2', numero: 'PED-002', cliente: 'Restaurante Doña María', estado: 'urgente', distrito: 'Miraflores', peso: 12.0 },
        { id: '3', numero: 'PED-003', cliente: 'Minimarket Los Pinos', estado: 'normal', distrito: 'Surco', peso: 110.0 },
    ]);

    const [vehiculos, setVehiculos] = useState([
        { id: 'v1', placa: 'ABC-123', chofer: 'Julio Pérez', capacidad: 1500, carga_actual: 0, consolidado: [] as any[] },
        { id: 'v2', placa: 'DEF-456', chofer: 'Mario Gómez', capacidad: 800, carga_actual: 0, consolidado: [] as any[] },
    ]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: any) => {
        // Lógica real de Drag and Drop se implementaría aquí manipulando el estado
        // Moviendo de pedidosPendientes a vehiculos[...].consolidado
    };

    return (
        <div className="h-full flex flex-col space-y-4">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Asignación de Despacho</h1>
                    <p className="text-gray-500 mt-1">Arma los consolidados arrastrando pedidos hacia los vehículos</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="bg-white">
                        <Calendar className="w-4 h-4 mr-2" /> Programar Futuro
                    </Button>
                    <Button className="bg-primary hover:bg-primary/90 text-white">
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Confirmar Consolidados
                    </Button>
                </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className="flex flex-1 gap-6 min-h-0 overflow-hidden">

                    {/* Columna Pendientes */}
                    <Card className="w-[350px] flex flex-col bg-gray-50/50 border-dashed shrink-0">
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
                            <SortableContext items={pedidosPendientes.map(p => p.id)} strategy={verticalListSortingStrategy}>
                                <div className="space-y-3">
                                    {pedidosPendientes.map(pedido => (
                                        <SortableItem key={pedido.id} id={pedido.id} pedido={pedido} />
                                    ))}
                                </div>
                            </SortableContext>
                        </CardContent>
                    </Card>

                    {/* Vehículos Container */}
                    <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
                        {vehiculos.map(vehiculo => (
                            <Card key={vehiculo.id} className="w-[350px] flex flex-col shrink-0 border border-gray-200">
                                <CardHeader className="py-4 border-b bg-gray-50">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2 font-bold text-gray-800">
                                            <Truck className="w-5 h-5 text-gray-600" /> {vehiculo.placa}
                                        </div>
                                        <Badge variant={vehiculo.carga_actual > vehiculo.capacidad ? 'destructive' : 'secondary'}>
                                            {vehiculo.carga_actual} / {vehiculo.capacidad} kg
                                        </Badge>
                                    </div>
                                    <p className="text-sm font-medium text-gray-500">Chofer: {vehiculo.chofer}</p>
                                </CardHeader>
                                <CardContent className="flex-1 p-3 bg-gray-50/30 overflow-y-auto">
                                    <div className="h-full border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400 text-sm">
                                        Arratre pedidos aquí
                                    </div>
                                </CardContent>
                                <div className="p-3 border-t bg-white shrink-0">
                                    <Button variant="outline" className="w-full text-xs" size="sm">
                                        Ver Picking List / Imprimir
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </DndContext>
        </div>
    );
}
