'use client';

import { useState, useEffect } from 'react';
import {
    Landmark,
    ExternalLink,
    Lock,
    Plus,
    ArrowDownLeft,
    ArrowUpRight,
    MoreVertical,
    CheckCircle2,
    Clock,
    AlertCircle,
    Wallet
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getCajaActiva, abrirCaja, cerrarCaja } from '../actions';
import { supabase } from '@/lib/supabase';

export default function CajaPage() {
    const queryClient = useQueryClient();
    const [isAperturaOpen, setIsAperturaOpen] = useState(false);
    const [isCierreOpen, setIsCierreOpen] = useState(false);
    const [monto, setMonto] = useState(0);

    const { data: cajaActiva, isLoading: loadingCaja } = useQuery({
        queryKey: ['caja-activa'],
        queryFn: () => getCajaActiva()
    });

    const { data: pagosHoy } = useQuery({
        queryKey: ['pagos-hoy', cajaActiva?.id],
        queryFn: async () => {
            if (!cajaActiva) return [];
            const { data } = await supabase
                .from('pagos')
                .select('*, clientes(razon_social)')
                .eq('caja_id', cajaActiva.id)
                .order('fecha', { ascending: false });
            return data || [];
        },
        enabled: !!cajaActiva
    });

    const mutationAbrir = useMutation({
        mutationFn: (m: number) => abrirCaja(m),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['caja-activa'] });
            toast.success("Caja abierta correctamente.");
            setIsAperturaOpen(false);
            setMonto(0);
        },
        onError: (e: any) => toast.error("Error al abrir caja: " + e.message)
    });

    const mutationCerrar = useMutation({
        mutationFn: (m: number) => cerrarCaja(cajaActiva!.id, m),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['caja-activa'] });
            toast.success("Caja cerrada correctamente.");
            setIsCierreOpen(false);
            setMonto(0);
        },
        onError: (e: any) => toast.error("Error al cerrar caja: " + e.message)
    });

    const totalIngresos = pagosHoy?.reduce((acc, p) => acc + Number(p.monto), 0) || 0;
    const montoEnEfectivo = (pagosHoy?.filter(p => p.metodo_pago === 'efectivo').reduce((acc, p) => acc + Number(p.monto), 0) || 0) + (cajaActiva?.monto_apertura || 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        Control de Caja <Landmark className="w-8 h-8 text-emerald-600" />
                    </h1>
                    <p className="text-gray-500 font-medium">Gestión de efectivo y arqueo diario de cobranzas.</p>
                </div>
                {!loadingCaja && !cajaActiva && (
                    <Button onClick={() => setIsAperturaOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 shadow-lg">
                        <Plus className="w-4 h-4 mr-2" /> Apertura de Caja
                    </Button>
                )}
                {cajaActiva && (
                    <Button variant="destructive" onClick={() => { setMonto(montoEnEfectivo); setIsCierreOpen(true); }} className="shadow-lg">
                        Cerrar Caja (Arqueo)
                    </Button>
                )}
            </div>

            {loadingCaja ? (
                <div className="p-12 text-center text-gray-400 animate-pulse font-medium uppercase tracking-widest text-xs">Sincronizando con Tesorería...</div>
            ) : cajaActiva ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Caja Status Card */}
                    <Card className="lg:col-span-1 border-emerald-100 shadow-xl shadow-emerald-500/5 overflow-hidden">
                        <CardHeader className="bg-emerald-50/50 border-b">
                            <div className="flex justify-between items-center">
                                <Badge className="bg-emerald-100 text-emerald-800 border-none font-black uppercase text-[10px]">Caja Abierta</Badge>
                                <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {new Date(cajaActiva.hora_apertura).toLocaleTimeString()}
                                </span>
                            </div>
                            <CardTitle className="mt-4 text-gray-400 text-xs font-bold uppercase tracking-widest">Saldo en Caja (Efectivo)</CardTitle>
                            <div className="text-5xl font-black text-gray-900 mt-1 tracking-tighter">
                                S/ {montoEnEfectivo.toFixed(2)}
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex justify-between items-center pt-2 border-b border-dashed pb-2">
                                <span className="text-sm font-medium text-gray-500">Monto Apertura</span>
                                <span className="text-sm font-black text-gray-900">S/ {cajaActiva.monto_apertura.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-b border-dashed pb-2">
                                <span className="text-sm font-medium text-gray-500">Cobros en Efectivo</span>
                                <span className="text-sm font-black text-emerald-600">+ S/ {(montoEnEfectivo - cajaActiva.monto_apertura).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <span className="text-sm font-medium text-gray-500">Otros Medios (Yape/Transf)</span>
                                <span className="text-sm font-black text-blue-600">S/ {(totalIngresos - (montoEnEfectivo - cajaActiva.monto_apertura)).toFixed(2)}</span>
                            </div>
                        </CardContent>
                        <CardFooter className="bg-gray-50/50 p-6">
                            <div className="w-full">
                                <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-600 mb-2">
                                    <CheckCircle2 className="w-4 h-4" /> LISTO PARA CIERRE
                                </div>
                                <p className="text-[11px] text-gray-400 leading-tight">Asegúrese de contar el efectivo físico antes de realizar el cierre.</p>
                            </div>
                        </CardFooter>
                    </Card>

                    {/* Today's Transactions */}
                    <Card className="lg:col-span-2 shadow-sm border-none bg-white/50 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Transacciones de la Sesión</CardTitle>
                            <CardDescription>Cobros registrados en esta caja hoy</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-gray-50 text-[10px] uppercase font-black tracking-widest text-gray-400">
                                    <TableRow>
                                        <TableHead>Hora</TableHead>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead>Método</TableHead>
                                        <TableHead className="text-right">Monto</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pagosHoy?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-12 text-gray-400 italic">No hay transacciones registradas.</TableCell>
                                        </TableRow>
                                    ) : pagosHoy?.map((p: any) => (
                                        <TableRow key={p.id}>
                                            <TableCell className="text-[11px] font-medium text-gray-400">{new Date(p.created_at || '').toLocaleTimeString()}</TableCell>
                                            <TableCell className="font-bold text-gray-800 uppercase text-xs">{p.clientes?.razon_social}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`text-[10px] font-black uppercase ${p.metodo_pago === 'efectivo' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                                                    {p.metodo_pago}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-black text-gray-900">S/ {p.monto.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <Card className="border-dashed border-2 border-gray-200 bg-gray-50/50 p-12 text-center">
                    <div className="max-w-md mx-auto">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-6 text-gray-300">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-black text-gray-800 mb-2 uppercase tracking-tighter">Sin sesión de caja activa</h2>
                        <p className="text-sm text-gray-500 mb-6">Para registrar cobros y gestionar efectivo, debe realizar la apertura inicial con el monto disponible en su gaveta.</p>
                        <Button onClick={() => setIsAperturaOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 font-bold px-8 h-12 shadow-xl shadow-emerald-600/20">
                            Abrir Caja Ahora
                        </Button>
                    </div>
                </Card>
            )}

            {/* Apertura Modal */}
            <Dialog open={isAperturaOpen} onOpenChange={setIsAperturaOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="w-5 h-5 text-emerald-600" /> Apertura de Caja
                        </DialogTitle>
                        <DialogDescription>Ingrese el fondo de caja inicial (efectivo en gaveta).</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="apertura">Monto de Apertura (S/)</Label>
                            <Input
                                id="apertura"
                                type="number"
                                value={monto}
                                onChange={(e) => setMonto(Number(e.target.value))}
                                className="text-3xl font-black h-16 text-center"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAperturaOpen(false)}>Cancelar</Button>
                        <Button onClick={() => mutationAbrir.mutate(monto)} disabled={mutationAbrir.isPending}>
                            {mutationAbrir.isPending ? 'Abriendo...' : 'Confirmar Apertura'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cierre Modal */}
            <Dialog open={isCierreOpen} onOpenChange={setIsCierreOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            Arqueo de Caja
                        </DialogTitle>
                        <DialogDescription>Cuente el efectivo físico y compare con el monto en sistema.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="bg-gray-50 p-4 rounded-xl border">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Monto en Sistema (Esperado)</p>
                            <p className="text-3xl font-black text-gray-900">S/ {montoEnEfectivo.toFixed(2)}</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cierre" className="font-bold">Efectivo Físico Contado (S/)</Label>
                            <Input
                                id="cierre"
                                type="number"
                                value={monto}
                                onChange={(e) => setMonto(Number(e.target.value))}
                                className="text-3xl font-black h-16 text-center border-blue-200 outline-blue-500"
                            />
                        </div>
                        <div className={`p-4 rounded-xl border text-center font-bold ${monto - montoEnEfectivo === 0 ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                            {monto - montoEnEfectivo === 0 ? 'Caja Cuadrada' : `Diferencia: S/ ${(monto - montoEnEfectivo).toFixed(2)}`}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCierreOpen(false)}>Cancelar</Button>
                        <Button onClick={() => mutationCerrar.mutate(monto)} disabled={mutationCerrar.isPending} className="bg-slate-900">
                            {mutationCerrar.isPending ? 'Cerrando...' : 'Finalizar Cierre y Arqueo'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
