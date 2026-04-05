'use client';

import { useState, Suspense } from 'react';
import { Search, History, Check, DollarSign, Wallet, CreditCard, Banknote, Landmark } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { registrarPago } from '../actions';
import { ReciboPagoModal } from '@/components/ReciboPagoModal';
import { Hash } from 'lucide-react';

function CuentasCorrientesContent() {
    const params = useSearchParams();
    const queryClient = useQueryClient();
    const clienteId = params.get('cliente_id');

    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [selectedComp, setSelectedComp] = useState<any>(null);
    const [paymentData, setPaymentData] = useState<{
        metodo: string;
        monto: number;
        referencia: string;
    }>({
        metodo: 'yape',
        monto: 0,
        referencia: ''
    });
    const [isReceiptOpen, setIsReceiptOpen] = useState(false);
    const [generatedReceipt, setGeneratedReceipt] = useState<any>(null);

    const { data: clientes, isLoading: loadingClients } = useQuery({
        queryKey: ['clientes-cc-search'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('clientes')
                .select(`
                    id, 
                    razon_social, 
                    numero_documento, 
                    estado,
                    comprobantes(total, monto_pagado, estado_pago)
                `)
                .order('razon_social');

            if (error) throw error;

            return data.map(c => {
                const comps = Array.isArray(c.comprobantes) ? c.comprobantes : [];
                const deudaTotal = comps.reduce((acc: number, curr: any) => {
                    if (['pendiente', 'parcial', 'vencido'].includes(curr.estado_pago)) {
                        return acc + (curr.total - (curr.monto_pagado || 0));
                    }
                    return acc;
                }, 0);
                return { ...c, deudaTotal };
            });
        },
        enabled: !clienteId
    });

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
        mutationFn: async (data: { comprobanteId: string, monto: number, metodo: string, referencia: string }) => {
            const result = await registrarPago({
                comprobanteId: data.comprobanteId,
                cliente_id: clienteId || '',
                monto: data.monto,
                metodo: data.metodo,
                referencia: data.referencia
            });
            if (result.error) throw new Error(result.error);
            return result;
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['deudas', clienteId || ''] });
            toast.success("Cobranza registrada correctamente.");
            setIsPaymentDialogOpen(false);
            setPaymentData({ metodo: 'yape', monto: 0, referencia: '' });

            // Abrir el recibo generado
            if (data?.recibo) {
                setGeneratedReceipt({
                    numero_recibo: data.recibo.numero,
                    fecha: new Date().toLocaleDateString(),
                    cliente_razon_social: data.recibo.razon_social,
                    cliente_doc: data.recibo.documento,
                    monto: data.recibo.monto,
                    metodo_pago: paymentData.metodo,
                    referencia: paymentData.referencia,
                    comprobante_afectado: data.recibo.original,
                    monto_letras: data.recibo.letras
                });
                setIsReceiptOpen(true);
            }
        },
        onError: (error: any) => {
            toast.error("Error al registrar pago: " + error.message);
        }
    });

    const openPayment = (comprobante: any) => {
        setSelectedComp(comprobante);
        setPaymentData({
            metodo: 'yape',
            monto: comprobante.saldo,
            referencia: ''
        });
        setIsPaymentDialogOpen(true);
    };

    if (!clienteId) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Cuentas Corrientes</h1>
                    <p className="text-gray-500 mt-1">Seleccione un cliente para gestionar su estado de cuenta</p>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Buscador de Clientes</CardTitle>
                        <CardDescription>Seleccione un cliente de la lista para ver sus deudas y cobranzas</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-gray-50 uppercase text-[10px]">
                                    <TableRow>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead>Documento</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead className="text-right">Deuda Total</TableHead>
                                        <TableHead className="text-right">Acción</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingClients ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-8">Cargando...</TableCell></TableRow>
                                    ) : clientes?.map(c => (
                                        <TableRow key={c.id}>
                                            <TableCell className="font-medium text-gray-900">{c.razon_social}</TableCell>
                                            <TableCell className="text-gray-500">{c.numero_documento}</TableCell>
                                            <TableCell>
                                                <Badge className={c.estado === 'activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                                    {c.estado.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={`font-bold ${c.deudaTotal > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                                    S/ {c.deudaTotal.toFixed(2)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" onClick={() => window.location.href = `/cobranzas/cuentas-corrientes?cliente_id=${c.id}`}>
                                                    Ver Estado
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
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
                            <div className="text-sm font-medium text-primary mt-1">Crédito Disponible: <span className="font-bold text-lg">S/ {(Number(cliente?.limite_credito || 0) - Number(deudas?.reduce((acc, d) => acc + d.saldo, 0) || 0)).toFixed(2)}</span></div>
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
                                        <Button size="sm" onClick={() => openPayment(d)} className="bg-green-600 w-full hover:bg-green-700">
                                            <DollarSign className="w-4 h-4 mr-1" />
                                            Cobrar
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

            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-green-600" />
                            Registrar Cobranza
                        </DialogTitle>
                        <DialogDescription>
                            Ingrese los detalles del pago para {selectedComp?.doc}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-2">
                        <Label className="text-xs font-bold uppercase text-gray-400">Método de Pago</Label>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                            {[
                                { id: 'yape', label: 'Yape', icon: <Wallet className="w-5 h-5" />, color: 'border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700' },
                                { id: 'plin', label: 'Plin', icon: <Wallet className="w-5 h-5 text-teal-600" />, color: 'border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-700' },
                                { id: 'efectivo', label: 'Efectivo', icon: <Banknote className="w-5 h-5 text-emerald-600" />, color: 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700' },
                                { id: 'transferencia', label: 'Transferencia', icon: <Landmark className="w-5 h-5 text-blue-600" />, color: 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700' }
                            ].map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setPaymentData({ ...paymentData, metodo: m.id })}
                                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left ${paymentData.metodo === m.id ? m.color + ' ring-2 ring-offset-1 ring-slate-900 scale-[1.02]' : 'border-gray-100 hover:border-gray-200 bg-white text-gray-500'}`}
                                >
                                    <div className={`p-2 rounded-lg bg-white shadow-sm ${paymentData.metodo === m.id ? 'text-inherit' : 'text-gray-400'}`}>
                                        {m.icon}
                                    </div>
                                    <span className="font-black uppercase text-[10px] tracking-widest">{m.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-2 mt-4">
                        <Label htmlFor="monto">Monto a Pagar (S/)</Label>
                        <Input
                            id="monto"
                            type="number"
                            step="0.01"
                            value={paymentData.monto}
                            onChange={(e) => setPaymentData({ ...paymentData, monto: parseFloat(e.target.value) })}
                            className="font-bold text-3xl h-14 text-center border-2 border-slate-900 focus:ring-slate-900"
                        />
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Saldo pendiente: S/ {selectedComp?.saldo?.toFixed(2)}</p>
                    </div>

                    {paymentData.metodo !== 'efectivo' && (
                        <div className="grid gap-2 animate-in slide-in-from-top-2 duration-300">
                            <Label htmlFor="referencia" className="font-black text-[10px] uppercase tracking-widest text-gray-400">Nro. de Operación / Referencia</Label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    id="referencia"
                                    placeholder="Ingrese el número de confirmación"
                                    className="pl-10 h-11 font-bold bg-slate-50 border-slate-200 shadow-inner"
                                    value={paymentData.referencia}
                                    onChange={(e) => setPaymentData({ ...paymentData, referencia: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancelar</Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => mutationPagar.mutate({
                                comprobanteId: selectedComp?.id || '',
                                ...paymentData
                            })}
                            disabled={mutationPagar.isPending || paymentData.monto <= 0}
                        >
                            {mutationPagar.isPending ? 'Procesando...' : 'Confirmar Cobro'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ReciboPagoModal
                isOpen={isReceiptOpen}
                onClose={() => setIsReceiptOpen(false)}
                pago={generatedReceipt}
            />
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

