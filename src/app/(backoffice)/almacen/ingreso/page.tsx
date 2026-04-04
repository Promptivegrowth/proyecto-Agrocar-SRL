'use client';

import { useState } from 'react';
import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { registrarIngreso } from '../actions';
import { toast } from 'sonner';

export default function IngresoMercaderia() {
    const router = useRouter();
    const queryClient = useQueryClient();

    // Form Document State
    const [proveedor, setProveedor] = useState('');
    const [tipoDoc, setTipoDoc] = useState('FACTURA');
    const [serieDoc, setSerieDoc] = useState('');
    const [correlativo, setCorrelativo] = useState('');

    // Items State
    const [items, setItems] = useState<any[]>([]);

    // Product Selection
    const { data: productos } = useQuery({
        queryKey: ['productos-almacen'],
        queryFn: async () => {
            const { data, error } = await supabase.from('productos').select('id, codigo, descripcion').eq('activo', true);
            if (error) throw error;
            return data;
        }
    });

    const agregarItem = () => {
        if (!productos || productos.length === 0) return;
        setItems([...items, {
            temp_id: Math.random().toString(),
            producto_id: productos[0].id,
            cantidad: 1,
            costo: 0
        }]);
    };

    const actualizarItem = (temp_id: string, campo: string, valor: any) => {
        setItems(items.map(it => it.temp_id === temp_id ? { ...it, [campo]: valor } : it));
    };

    const eliminarItem = (temp_id: string) => {
        setItems(items.filter(it => it.temp_id !== temp_id));
    };

    const mutationSave = useMutation({
        mutationFn: async () => {
            if (items.length === 0) throw new Error("No hay items para ingresar");

            const result = await registrarIngreso({
                proveedor,
                tipoDoc,
                serieDoc,
                correlativo,
                items
            });

            if (result.error) throw new Error(result.error);
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kardexGlobal'] });
            queryClient.invalidateQueries({ queryKey: ['stockGlobal'] });
            toast.success("Ingreso de mercadería registrado con éxito");
            router.push('/almacen');
        },
        onError: (error: any) => {
            toast.error("Error al registrar ingreso: " + error.message);
        }
    });

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/almacen">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ingreso de Mercadería (Compras)</h1>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-4 border-b">
                    <CardTitle className="text-lg">Datos del Documento</CardTitle>
                    <CardDescription>Factura o Guía del Proveedor</CardDescription>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Proveedor (RUC / Razón Social)</label>
                        <Input placeholder="Razón Social del Proveedor" value={proveedor} onChange={e => setProveedor(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Almacén Destino</label>
                        <Input value="Almacén Principal (Refrigerado)" readOnly className="bg-gray-50 text-gray-600" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Tipo Documento</label>
                        <Input value={tipoDoc} onChange={e => setTipoDoc(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Serie</label>
                            <Input placeholder="F001" value={serieDoc} onChange={e => setSerieDoc(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Correlativo</label>
                            <Input placeholder="000123" value={correlativo} onChange={e => setCorrelativo(e.target.value)} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2 border-b flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">Detalle de Productos</CardTitle>
                    </div>
                    <Button size="sm" variant="outline" onClick={agregarItem} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                        <Plus className="w-4 h-4 mr-2" /> Agregar Item
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-gray-50/80">
                            <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead className="w-32">Cantidad</TableHead>
                                <TableHead className="w-32">Costo Unit.</TableHead>
                                <TableHead className="w-24 text-right">Subtotal</TableHead>
                                <TableHead className="w-16"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">Agregue productos para el ingreso.</TableCell>
                                </TableRow>
                            ) : (
                                items.map((it) => (
                                    <TableRow key={it.temp_id}>
                                        <TableCell>
                                            <select
                                                className="w-full h-8 text-sm border rounded px-2"
                                                value={it.producto_id}
                                                onChange={e => actualizarItem(it.temp_id, 'producto_id', e.target.value)}
                                            >
                                                {productos?.map(p => (
                                                    <option key={p.id} value={p.id}>{p.codigo} - {p.descripcion}</option>
                                                ))}
                                            </select>
                                        </TableCell>
                                        <TableCell>
                                            <Input type="number" min="0.01" step="0.01" value={it.cantidad} onChange={e => actualizarItem(it.temp_id, 'cantidad', parseFloat(e.target.value) || 0)} className="h-8 text-right" />
                                        </TableCell>
                                        <TableCell>
                                            <Input type="number" min="0.01" step="0.01" value={it.costo} onChange={e => actualizarItem(it.temp_id, 'costo', parseFloat(e.target.value) || 0)} className="h-8 text-right" />
                                        </TableCell>
                                        <TableCell className="text-right font-medium align-middle">
                                            S/ {(it.cantidad * it.costo).toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => eliminarItem(it.temp_id)} className="h-8 w-8 text-red-500 hover:text-red-700">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-3 mt-8">
                <Button variant="outline" size="lg" onClick={() => router.push('/almacen')}>Cancelar</Button>
                <Button size="lg" className="bg-green-600 hover:bg-green-700" onClick={() => mutationSave.mutate()} disabled={items.length === 0 || mutationSave.isPending}>
                    <Save className="w-5 h-5 mr-2" />
                    {mutationSave.isPending ? 'Guardando...' : 'Registrar Ingreso'}
                </Button>
            </div>

        </div>
    );
}
