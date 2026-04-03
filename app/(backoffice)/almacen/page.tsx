'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PackageSearch, History, ArrowRightLeft, ArrowUpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from 'next/link';

export default function AlmacenPage() {
    const { data: stockData, isLoading } = useQuery({
        queryKey: ['stockGlobal'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('stock')
                .select(`
          cantidad,
          costo_promedio,
          productos(codigo, descripcion, unidad_medida),
          almacenes(nombre)
        `)
                .order('cantidad', { ascending: false });
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
                    <Button asChild className="bg-primary hover:bg-primary/90 text-white">
                        <Link href="/almacen/ingreso">
                            <ArrowUpCircle className="w-4 h-4 mr-2" /> Ingreso de Mercadería
                        </Link>
                    </Button>
                    <Button variant="outline">
                        <ArrowRightLeft className="w-4 h-4 mr-2 text-gray-600" /> Transferencia
                    </Button>
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
                                    stockData?.map((item, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-medium text-gray-600">{item.almacenes?.nombre}</TableCell>
                                            <TableCell>{item.productos?.codigo}</TableCell>
                                            <TableCell>{item.productos?.descripcion}</TableCell>
                                            <TableCell className="text-right font-medium text-blue-600">
                                                {item.cantidad} <span className="text-xs text-gray-400 font-normal">{item.productos?.unidad_medida}</span>
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
                    <div className="bg-white p-8 text-center text-gray-500 rounded-lg shadow-sm border border-gray-200">
                        Registro KARDEX (Vista de movimientos históricos irá aquí)
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
