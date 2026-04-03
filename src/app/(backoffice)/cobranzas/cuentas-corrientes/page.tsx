'use client';

import { useState, Suspense } from 'react';
import { Search, History, Check, DollarSign, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

function CuentasCorrientesContent() {
    const params = useSearchParams();
    const queryClient = useQueryClient();
    const clienteId = params.get('cliente_id');

    const { data: cliente, isLoading: loadingClient } = useQuery({
        queryKey: ['cliente-cc', clienteId],
        queryFn: async () => {
            if (!clienteId) return null;
            const { data, error } = await supabase.from('clientes').select('*').eq('id', clienteId).single();
            if (error) throw error;
            return data;
        },
        enabled: !!clienteId
    });

    const { data: deudas, isLoading: loadingDeudas } = useQuery({
        queryKey: ['deudas', clienteId],
        queryFn: async () => {
            if (!clienteId) return [];
            const { data, error } = await supabase.from('comprobantes')
                .select('*')
                .eq('cliente_id', clienteId)
                .in('estado_pago', ['pendiente', 'parcial', 'vencido'])
                .order('fecha_emision', { ascending: false });
            if (error) throw error;

            return data.map(d => {
                const today = new Date();
                const v = new Date(d.fecha_emision);
                v.setDate(v.getDate() + 7); // assumed 7 days limit
                const diffTime = Math.abs(today.getTime() - v.getTime());
                const dias_retraso = today > v ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;

                return {
                    id: d.id,
                    doc: `${d.serie}-${d.correlativo}`,
                    fecha: d.fecha_emision,
                    vencimiento: v.toISOString().split('T')[0],
                    dias_retraso,
                    total: d.total,
                    saldo: d.total - (d.monto_pagado || 0)
                };
            });
        },
        enabled: !!clienteId
    });

    const mutationPagar = useMutation({
        mutationFn: async (comprobanteId: string) => {
            const comp = deudas?.find(d => d.id === comprobanteId);
            if (!comp) return;

            const userRes = await supabase.auth.getUser();
            const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', userRes.data.user?.id).single();

            // Insert pago full mapping
            await supabase.from('pagos').insert([{
                empresa_id: usuario?.empresa_id,
                comprobante_id: comprobanteId,
                cliente_id: clienteId,
                fecha: new Date().toISOString().split('T')[0],
                monto: comp.saldo,
                metodo_pago: 'efectivo',
                usuario_cobrador_id: userRes.data.user?.id
            }]);

            // Update comprobante
            await supabase.from('comprobantes').update({
                monto_pagado: comp.total,
                estado_pago: 'pagado'
            }).eq('id', comprobanteId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['deudas', clienteId] });
            alert("Pago total registrado exitosamente.");
        }
    });

    if (!clienteId) {
        return (
            <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                <Wallet className="w-12 h-12 text-gray-300 mb-4" />
                No se ha seleccionado ningún cliente. Utilice el buscador general para acceder a una cuenta de cliente.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Cuentas Corrientes</h1>
                <p className="text-gray-500 mt-1">Gestión de créditos, amortizaciones y línea crediticia por cliente</p>
            </div>

            <Card>
                <CardHeader className="bg-gray-50 border-b pb-4">
                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <CardTitle className="text-xl">{loadingClient ? 'Cargando...' : cliente?.razon_social}</CardTitle>
                            <CardDescription>RUC/DNI: {cliente?.numero_documento} - Cliente {cliente?.estado}</CardDescription>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-medium text-gray-500">Línea de Crédito: <span className="text-gray-900">S/ {cliente?.limite_credito?.toFixed(2) || '0.00'}</span></div>
                            <div className="text-sm font-medium text-primary mt-1">Crédito Disponible: <span className="font-bold text-lg">S/ {cliente?.limite_credito?.toFixed(2) || '0.00'}</span></div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="p-4 border-b flex justify-between bg-white items-center">
                        <h3 className="font-semibold text-gray-800">Deudas Pendientes</h3>
                    </div>
                    <Table>
                        <TableHeader className="bg-red-50/50">
                            <TableRow>
                                <TableHead>Comprobante</TableHead>
                                <TableHead>Emisión</TableHead>
                                <TableHead>Vencimiento</TableHead>
                                <TableHead className="text-center">Retraso</TableHead>
                                <TableHead className="text-right">Monto Original</TableHead>
                                <TableHead className="text-right font-bold text-red-700">Saldo Deudor</TableHead>
                                <TableHead className="w-[140px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingDeudas ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-6 text-gray-500">Cargando deudas...</TableCell>
                                </TableRow>
                            ) : deudas?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-6 text-green-600 font-medium">El cliente no tiene deudas pendientes.</TableCell>
                                </TableRow>
                            ) : deudas?.map((d) => (
                                <TableRow key={d.id}>
                                    <TableCell className="font-medium">{d.doc}</TableCell>
                                    <TableCell>{d.fecha}</TableCell>
                                    <TableCell>{d.vencimiento}</TableCell>
                                    <TableCell className="text-center">
                                        {d.dias_retraso > 0 ? (
                                            <Badge variant="destructive">{d.dias_retraso} días</Badge>
                                        ) : (
                                            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">Al día</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right text-gray-500">S/ {d.total.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-bold text-red-600">S/ {d.saldo.toFixed(2)}</TableCell>
                                    <TableCell>
                                        <Button size="sm" onClick={() => mutationPagar.mutate(d.id)} disabled={mutationPagar.isPending} className="bg-green-600 w-full hover:bg-green-700">
                                            <DollarSign className="w-4 h-4 mr-1" />
                                            {mutationPagar.variables === d.id && mutationPagar.isPending ? 'P...' : 'Pagar'}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {deudas && deudas.length > 0 && (
                                <TableRow className="bg-gray-50 font-bold border-t-2 border-gray-200">
                                    <TableCell colSpan={5} className="text-right uppercase text-sm">Deuda Total Consolidada</TableCell>
                                    <TableCell className="text-right text-red-700 text-lg">
                                        S/ {deudas.reduce((acc, c) => acc + c.saldo, 0).toFixed(2)}
                                    </TableCell>
                                    <TableCell />
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

export default function CuentasCorrientesPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Cargando cuentas...</div>}>
            <CuentasCorrientesContent />
        </Suspense>
    );
}

