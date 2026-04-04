'use client';

import { PackageSearch, History, ArrowRightLeft, ArrowUpCircle, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { registrarTransferencia } from './actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export default function AlmacenPage() {
    const queryClient = useQueryClient();
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [transferData, setTransferData] = useState({
        producto_id: '',
        almacen_origen_id: '',
        almacen_destino_id: '',
        cantidad: 0,
        motivo: 'Transferencia interna'
    });

    const { data: stockData, isLoading } = useQuery({
        queryKey: ['stockGlobal'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('stock')
                .select(`
                    cantidad,
                    costo_promedio,
                    productos(id, codigo, descripcion, unidad_medida),
                    almacenes(nombre)
                `)
                .order('cantidad', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    const { data: movimientos, isLoading: loadingKardex } = useQuery({
        queryKey: ['kardexGlobal'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('stock_movimientos')
                .select(`
                    id, fecha, tipo, motivo, cantidad, saldo_posterior,
                    productos(descripcion, unidad_medida),
                    almacenes(nombre)
                `)
                .order('fecha', { ascending: false })
                .limit(50);
            if (error) throw error;
            return data;
        }
    });

    const { data: almacenes } = useQuery({
        queryKey: ['almacenes'],
        queryFn: async () => {
            const { data, error } = await supabase.from('almacenes').select('id, nombre').eq('activo', true);
            if (error) throw error;
            return data;
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        Gestión de Almacén
                    </h1>
                    <p className="text-gray-500 mt-1">Control de inventario, ingresos y transferencias</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/almacen/ingreso">
                        <Button className="bg-primary hover:bg-primary/90 text-white">
                            <ArrowUpCircle className="w-4 h-4 mr-2" /> Ingreso de Mercadería
                        </Button>
                    </Link>
                    <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
                        <DialogTrigger>
                            <Button variant="outline">
                                <ArrowRightLeft className="w-4 h-4 mr-2 text-gray-600" /> Transferencia
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-xl">
                            <DialogHeader>
                                <DialogTitle>Registrar Transferencia</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Producto</Label>
                                    <Select onValueChange={(v: any) => setTransferData({ ...transferData, producto_id: v })}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Seleccione producto" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {stockData?.map((it: any, idx: number) => {
                                                const p = Array.isArray(it.productos) ? it.productos[0] : it.productos;
                                                const a = Array.isArray(it.almacenes) ? it.almacenes[0] : it.almacenes;
                                                return (
                                                    <SelectItem key={idx} value={p?.id}>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold">{p?.codigo} - {p?.descripcion}</span>
                                                            <span className="text-[10px] text-muted-foreground uppercase">Stock: {it.cantidad} en {a?.nombre}</span>
                                                        </div>
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Almacén Origen</Label>
                                        <Select onValueChange={(v: any) => setTransferData({ ...transferData, almacen_origen_id: v })}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Origen" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {almacenes?.map(a => (
                                                    <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Almacén Destino</Label>
                                        <Select onValueChange={(v: any) => setTransferData({ ...transferData, almacen_destino_id: v })}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Destino" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {almacenes?.map(a => (
                                                    <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Cantidad</Label>
                                    <Input type="number" onChange={(e) => setTransferData({ ...transferData, cantidad: parseFloat(e.target.value) })} />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={async () => {
                                    if (!transferData.producto_id || !transferData.almacen_origen_id || !transferData.almacen_destino_id || transferData.cantidad <= 0) {
                                        toast.error("Por favor complete todos los campos");
                                        return;
                                    }
                                    const res = await registrarTransferencia(transferData);
                                    if (res.success) {
                                        toast.success("Transferencia realizada");
                                        setIsTransferOpen(false);
                                        queryClient.invalidateQueries({ queryKey: ['stockGlobal'] });
                                        queryClient.invalidateQueries({ queryKey: ['kardexGlobal'] });
                                    } else {
                                        toast.error(res.error || "Error al transferir");
                                    }
                                }}>Confirmar Transferencia</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Tabs defaultValue="inventario" className="w-full">
                <TabsList className="bg-gray-100 p-1 mb-4 h-auto">
                    <TabsTrigger value="inventario" className="data-[state=active]:bg-white py-2 px-6">
                        <PackageSearch className="w-4 h-4 mr-2" /> Inventario Actual
                    </TabsTrigger>
                    <TabsTrigger value="movimientos" className="data-[state=active]:bg-white py-2 px-6">
                        <History className="w-4 h-4 mr-2" /> Kardex / Movimientos
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="inventario" className="mt-0">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-50/80">
                                <TableRow>
                                    <TableHead>Almacén</TableHead>
                                    <TableHead>Código</TableHead>
                                    <TableHead>Producto</TableHead>
                                    <TableHead className="text-right">Stock Actual</TableHead>
                                    <TableHead className="text-right">Costo Prom.</TableHead>
                                    <TableHead className="text-right">Valorizado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">Cargando stock...</TableCell></TableRow>
                                ) : stockData?.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">Sin existencias registradas.</TableCell></TableRow>
                                ) : (
                                    stockData?.map((item: any, idx: number) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-medium text-gray-600">
                                                {/* @ts-ignore */}
                                                {item.almacenes?.nombre || item.almacenes?.[0]?.nombre}
                                            </TableCell>
                                            <TableCell>
                                                {/* @ts-ignore */}
                                                {item.productos?.codigo || item.productos?.[0]?.codigo}
                                            </TableCell>
                                            <TableCell>
                                                {/* @ts-ignore */}
                                                {item.productos?.descripcion || item.productos?.[0]?.descripcion}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-blue-600">
                                                {item.cantidad} <span className="text-xs text-gray-400 font-normal">
                                                    {/* @ts-ignore */}
                                                    {item.productos?.unidad_medida || item.productos?.[0]?.unidad_medida}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right text-gray-600">S/ {item.costo_promedio?.toFixed(4)}</TableCell>
                                            <TableCell className="text-right font-semibold">
                                                S/ {(item.cantidad * item.costo_promedio).toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="movimientos" className="mt-0">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-50/80">
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Almacén</TableHead>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead className="text-right">Cant.</TableHead>
                                    <TableHead className="text-right">Saldo Final</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingKardex ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">Cargando movimientos...</TableCell></TableRow>
                                ) : movimientos?.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">Sin movimientos registrados en Kardex.</TableCell></TableRow>
                                ) : (
                                    movimientos?.map((m: any) => (
                                        <TableRow key={m.id}>
                                            <TableCell className="text-xs text-gray-500">
                                                {new Date(m.fecha).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="font-medium text-gray-600">
                                                {m.almacenes?.nombre}
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm font-medium">{m.productos?.descripcion}</div>
                                                <div className="text-[10px] text-gray-400 uppercase">{m.motivo}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={m.tipo === 'entrada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                                    {m.tipo.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-bold">
                                                {m.tipo === 'entrada' ? '+' : '-'}{m.cantidad}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-gray-900">
                                                {m.saldo_posterior}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
