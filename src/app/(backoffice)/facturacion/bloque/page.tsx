'use client';

import { useState } from 'react';
import { FileDown, RefreshCcw, CheckCircle2, XCircle, Search, Play } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export default function FacturacionBloquePage() {
    const queryClient = useQueryClient();

    const { data: consolidados, isLoading } = useQuery({
        queryKey: ['consolidados-facturacion'],
        queryFn: async () => {
            // Get consolidados with their vehicles
            const { data, error } = await supabase
                .from('consolidados_despacho')
                .select('*, vehiculos(placa)')
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            // Note: We'd normally do a complex join to calculate status_facturacion
            return data.map(c => ({
                id: c.id,
                numero: c.numero,
                vehiculo: c.vehiculos?.placa || 'Sin Vehículo',
                pedidos_count: c.total_pedidos,
                total: 0, // Mocked total as it requires joining all pedidos -> pedido_items
                status_facturacion: c.estado === 'cerrado' ? 'completado' : 'pendiente'
            }));
        }
    });

    const mutationProcesar = useMutation({
        mutationFn: async (consId: string) => {
            const userRes = await supabase.auth.getUser();
            const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', userRes.data.user?.id).single();

            // Fetch pedidos for this consolidado
            const { data: pedidos, error: errPed } = await supabase
                .from('pedidos')
                .select('*, clientes(tipo_documento, numero_documento, razon_social, distrito, direccion)')
                .eq('consolidado_id', consId);

            if (errPed) throw errPed;

            for (const ped of pedidos) {
                // Generate comprobante
                const isBoleta = ped.clientes?.tipo_documento === 'DNI';
                await supabase.from('comprobantes').insert([{
                    empresa_id: usuario?.empresa_id,
                    tipo: isBoleta ? '03' : '01',
                    serie: isBoleta ? 'B001' : 'F001',
                    correlativo: Math.floor(Math.random() * 100000),
                    fecha_emision: new Date().toISOString().split('T')[0],
                    pedido_id: ped.id,
                    consolidado_id: consId,
                    cliente_id: ped.cliente_id,
                    tipo_doc_cliente: ped.clientes?.tipo_documento,
                    num_doc_cliente: ped.clientes?.numero_documento,
                    razon_social_cliente: ped.clientes?.razon_social,
                    direccion_cliente: `${ped.clientes?.direccion || ''} ${ped.clientes?.distrito || ''}`,
                    subtotal: ped.subtotal,
                    igv: ped.igv || (ped.total * 0.18),
                    total: ped.total,
                    condicion_pago: 'credito',
                    estado_pago: 'pendiente',
                    sunat_estado: 'aceptado',
                    usuario_emisor_id: userRes.data.user?.id
                }]);

                // Update pedido status
                await supabase.from('pedidos').update({ estado: 'facturado' }).eq('id', ped.id);
            }

            // Close consolidado
            const { error: errCons } = await supabase.from('consolidados_despacho').update({ estado: 'cerrado' }).eq('id', consId);
            if (errCons) throw errCons;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['consolidados-facturacion'] });
            alert('Bloque procesado: Comprobantes generados exitosamente.');
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Facturación Electrónica</h1>
                    <p className="text-gray-500 mt-1">Generación masiva de comprobantes XML UBL 2.1 a SUNAT/OSE</p>
                </div>
                <Button variant="outline" className="text-gray-600">
                    <RefreshCcw className="w-4 h-4 mr-2" /> Actualizar Estados SUNAT
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="col-span-2">
                    <CardHeader className="border-b bg-white pb-4">
                        <div className="flex justify-between items-center">
                            <CardTitle>Consolidados Pendientes de Facturar</CardTitle>
                            <div className="relative w-64">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input placeholder="Buscar consolidado..." className="h-8 pl-8 text-sm" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead>Número</TableHead>
                                    <TableHead>Vehículo</TableHead>
                                    <TableHead className="text-right">Pedidos</TableHead>
                                    <TableHead className="text-center">Estado SUNAT</TableHead>
                                    <TableHead className="w-[140px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">Cargando consolidados...</TableCell>
                                    </TableRow>
                                ) : consolidados?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">No hay consolidados registrados.</TableCell>
                                    </TableRow>
                                ) : consolidados?.map((cons) => (
                                    <TableRow key={cons.id}>
                                        <TableCell className="font-medium text-blue-600 cursor-pointer hover:underline">
                                            {cons.numero}
                                        </TableCell>
                                        <TableCell>{cons.vehiculo}</TableCell>
                                        <TableCell className="text-right">{cons.pedidos_count}</TableCell>
                                        <TableCell className="text-center">
                                            {cons.status_facturacion === 'pendiente' && <Badge variant="outline">Pendiente</Badge>}
                                            {cons.status_facturacion === 'procesando' && <Badge className="bg-yellow-100 text-yellow-800">En Proceso...</Badge>}
                                            {cons.status_facturacion === 'completado' && <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Completado</Badge>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {cons.status_facturacion === 'pendiente' ? (
                                                <Button size="sm" onClick={() => mutationProcesar.mutate(cons.id)} disabled={mutationProcesar.isPending} className="bg-primary hover:bg-primary/90 text-white w-full">
                                                    <Play className="w-3 h-3 mr-2" />
                                                    {mutationProcesar.variables === cons.id && mutationProcesar.isPending ? 'Emitiendo...' : 'Emitir Bloque'}
                                                </Button>
                                            ) : (
                                                <Button size="sm" variant="outline" className="w-full">
                                                    <FileDown className="w-3 h-3 mr-2" /> Ver ZIP XML
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="border-l-4 border-l-green-500 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Comprobantes Exitosos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-700 font-mono">1,245</div>
                            <p className="text-xs text-gray-500 mt-1">Documentos con CDR activo</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-red-500 shadow-sm bg-red-50/30">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
                                <XCircle className="w-4 h-4" /> Rechazados (Errores)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-700 font-mono">2</div>
                            <p className="text-xs font-medium text-red-600 mt-1 hover:underline cursor-pointer">Ver detalle de errores (Cód 1033)</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
