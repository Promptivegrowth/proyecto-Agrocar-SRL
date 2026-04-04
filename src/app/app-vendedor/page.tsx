'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    MapPin,
    Plus,
    PackageOpen,
    DollarSign,
    Search,
    UserPlus,
    Timer,
    Flag,
    CheckCircle2,
    ShoppingBag,
    XCircle,
    ArrowUpRight
} from "lucide-react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { registrarCheckin, registrarCheckout, registrarAsistencia, registrarProspecto } from './actions';

export default function AppVendedorDashboard() {
    const queryClient = useQueryClient();
    const [busqueda, setBusqueda] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isAsistenciaOpen, setIsAsistenciaOpen] = useState(false);
    const [prospectData, setProspectData] = useState({ razon_social: '', numero_documento: '', direccion: '', telefono: '' });
    const [checkoutData, setCheckoutData] = useState({ resultado: 'pedido_tomado', observaciones: '' });

    // 1. Visita Activa
    const { data: visitaActiva, isLoading: loadingVisita } = useQuery({
        queryKey: ['visita-activa'],
        queryFn: async () => {
            const userRes = await supabase.auth.getUser();
            const { data } = await supabase
                .from('visitas_gps')
                .select('*, clientes(razon_social)')
                .eq('vendedor_id', userRes.data.user?.id)
                .is('hora_checkout', null)
                .maybeSingle();
            return data;
        }
    });

    // 2. Clientes con estado de visita hoy
    const { data: clientes, isLoading } = useQuery({
        queryKey: ['clientes-vendedor', busqueda],
        queryFn: async () => {
            const { data: cls, error } = await supabase
                .from('clientes')
                .select('id, razon_social, estado, limite_credito, latitud, longitud')
                .ilike('razon_social', `%${busqueda}%`)
                .limit(30);

            if (error) throw error;

            // Ver visitas de hoy para estos clientes
            const { data: vs } = await supabase
                .from('visitas_gps')
                .select('cliente_id, resultado')
                .eq('fecha', new Date().toISOString().split('T')[0]);

            return cls.map(c => ({
                ...c,
                visitado: vs?.some(v => v.cliente_id === c.id),
                resultado_hoy: vs?.find(v => v.cliente_id === c.id)?.resultado
            }));
        }
    });

    const mutationCheckin = useMutation({
        mutationFn: async (cliente: any) => {
            if (!navigator.geolocation) throw new Error('GPS no disponible');

            return new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(async (pos) => {
                    try {
                        const res = await registrarCheckin(cliente.id, pos.coords.latitude, pos.coords.longitude);
                        resolve(res);
                    } catch (e) { reject(e); }
                }, (err) => reject(new Error('Debes permitir acceso al GPS para iniciar visita.')), { enableHighAccuracy: true });
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['visita-activa'] });
            queryClient.invalidateQueries({ queryKey: ['clientes-vendedor'] });
            toast.success('Check-in registrado. Visita iniciada.');
        },
        onError: (err: any) => toast.error(err.message)
    });

    const mutationCheckout = useMutation({
        mutationFn: async () => {
            if (!visitaActiva) return;
            return new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(async (pos) => {
                    try {
                        await registrarCheckout(
                            visitaActiva.id,
                            pos.coords.latitude,
                            pos.coords.longitude,
                            checkoutData.resultado,
                            checkoutData.observaciones
                        );
                        resolve(true);
                    } catch (e) { reject(e); }
                }, (err) => reject(new Error('Indispensable GPS para finalizar visita.')), { enableHighAccuracy: true });
            });
        },
        onSuccess: () => {
            toast.success('Check-out registrado. Visita finalizada.');
        }
    });

    const mutationAsistencia = useMutation({
        mutationFn: async (tipo: 'ingreso' | 'salida') => {
            return registrarAsistencia(tipo);
        },
        onSuccess: () => {
            toast.success('Asistencia registrada correctamente');
            setIsAsistenciaOpen(false);
        }
    });

    const mutationProspecto = useMutation({
        mutationFn: async () => {
            return registrarProspecto(prospectData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clientes-vendedor'] });
            setIsDialogOpen(false);
            setProspectData({ razon_social: '', numero_documento: '', direccion: '', telefono: '' });
            toast.success('Prospecto registrado con éxito');
        }
    });

    return (
        <div className="flex-1 bg-slate-50 flex flex-col relative pb-32 font-sans overflow-hidden">
            {/* Active Visit Banner */}
            {visitaActiva && (
                <div className="bg-blue-600 p-4 text-white flex flex-col gap-3 sticky top-0 z-50 shadow-lg animate-in slide-in-from-top duration-500">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-xl animate-pulse">
                                <Timer className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Visita Activa</p>
                                <p className="font-bold text-sm line-clamp-1">{visitaActiva.clientes?.razon_social}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Link href={`/app-vendedor/pedido/${visitaActiva.cliente_id}`}>
                                <Button size="sm" variant="secondary" className="bg-white text-blue-700 font-black text-[10px] px-3 h-8 rounded-lg uppercase">
                                    <ShoppingBag className="w-3 h-3 mr-1" /> Pedido
                                </Button>
                            </Link>
                            <Button onClick={() => setIsCheckoutOpen(true)} size="sm" className="bg-red-500 hover:bg-red-400 text-white font-black text-[10px] px-3 h-8 rounded-lg uppercase">
                                <Flag className="w-3 h-3 mr-1" /> Finalizar
                            </Button>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 bg-white/10 p-2 rounded-lg text-[10px] font-bold uppercase">
                        <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Lima, Cercado</div>
                        <div className="flex items-center gap-1 opacity-60"><Timer className="w-3 h-3" /> Llegada est: 5 min</div>
                    </div>
                </div>
            )}

            {/* Header Stats */}
            <div className="p-4 grid grid-cols-2 gap-4">
                <Card className="shadow-sm border-none bg-white rounded-[2rem] overflow-hidden">
                    <CardContent className="p-5 flex flex-col items-center justify-center text-center">
                        <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center mb-2">
                            <PackageOpen className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-xl font-black text-slate-800 tracking-tight">0</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Pedidos Hoy</span>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-none bg-white rounded-[2rem] overflow-hidden">
                    <CardContent className="p-5 flex flex-col items-center justify-center text-center">
                        <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center mb-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <span className="text-xl font-black text-green-700 tracking-tight">S/ 0</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Venta Total</span>
                    </CardContent>
                </Card>
            </div>

            {/* Asistencia Fast Actions */}
            <div className="px-5 pb-4">
                <Button
                    variant="outline"
                    onClick={() => setIsAsistenciaOpen(true)}
                    className="w-full h-12 rounded-2xl border-dashed border-slate-300 text-slate-500 text-[10px] font-black uppercase tracking-widest bg-white"
                >
                    <Timer className="w-4 h-4 mr-2 text-blue-500" /> Marcar Asistencia (Ingreso/Salida)
                </Button>
            </div>

            {/* Search */}
            <div className="px-5 pb-4">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <Input
                        placeholder="Portafolio de clientes..."
                        className="bg-white border-none shadow-sm rounded-2xl h-14 pl-12 focus:ring-2 focus:ring-blue-500/20 text-slate-700 font-medium text-base"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
            </div>

            {/* Client List */}
            <div className="flex-1 overflow-y-auto px-4 space-y-3">
                {isLoading ? (
                    <div className="p-12 text-center text-slate-400 font-medium italic">Sincronizando ruta...</div>
                ) : clientes?.map((c: any) => (
                    <Card key={c.id} className={`border-none shadow-sm rounded-3xl transition-all overflow-hidden ${c.visitado ? 'opacity-80 grayscale-[0.5]' : ''}`}>
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-800 truncate text-[15px]">{c.razon_social}</h3>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase">
                                            <MapPin className="w-3 h-3 mr-1" /> Lima
                                        </div>
                                        <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase">
                                            <DollarSign className="w-3 h-3 mr-1 text-green-500" /> S/ {c.limite_credito?.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="shrink-0 flex flex-col items-end gap-2">
                                    {c.visitado ? (
                                        <Badge className={`uppercase text-[9px] font-black tracking-tighter ${c.resultado_hoy === 'pedido_tomado' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {c.resultado_hoy === 'pedido_tomado' ? 'PEDIDO LOGRADO' : 'VISITADO'}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-[9px] text-slate-400 border-slate-200">PENDIENTE</Badge>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-50 flex gap-2">
                                {!c.visitado && !visitaActiva && (
                                    <Button
                                        onClick={() => mutationCheckin.mutate(c)}
                                        disabled={mutationCheckin.isPending}
                                        className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-none shadow-none font-black text-xs uppercase h-10 rounded-xl"
                                    >
                                        <MapPin className="w-4 h-4 mr-2" /> Iniciar Visita
                                    </Button>
                                )}
                                {visitaActiva?.cliente_id === c.id && (
                                    <Link href={`/app-vendedor/pedido/${c.id}`} className="flex-1">
                                        <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase h-10 rounded-xl shadow-lg shadow-blue-500/20">
                                            <ShoppingBag className="w-4 h-4 mr-2" /> Tomar Pedido
                                        </Button>
                                    </Link>
                                )}
                                {c.visitado && (
                                    <Button variant="ghost" disabled className="flex-1 text-slate-400 font-bold text-xs uppercase h-10">
                                        <CheckCircle2 className="w-4 h-4 mr-2" /> Gestión Completa
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Checkout Dialog */}
            <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                <DialogContent className="rounded-t-3xl sm:rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
                    <div className="bg-blue-600 p-6 text-white">
                        <DialogTitle className="text-xl font-black uppercase italic">Finalizar Visita</DialogTitle>
                        <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mt-1">Registra el resultado de la gestión</p>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="space-y-3">
                            <Label className="uppercase text-[10px] font-black text-slate-500 ml-1">Resultado de Visita</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant={checkoutData.resultado === 'pedido_tomado' ? 'default' : 'outline'}
                                    className={`h-16 rounded-2xl flex flex-col items-center justify-center gap-1 ${checkoutData.resultado === 'pedido_tomado' ? 'bg-green-600' : ''}`}
                                    onClick={() => setCheckoutData({ ...checkoutData, resultado: 'pedido_tomado' })}
                                >
                                    <ShoppingBag className="w-5 h-5" />
                                    <span className="text-[10px] font-black uppercase">Pedido Tomado</span>
                                </Button>
                                <Button
                                    variant={checkoutData.resultado === 'sin_pedido' ? 'default' : 'outline'}
                                    className={`h-16 rounded-2xl flex flex-col items-center justify-center gap-1 ${checkoutData.resultado === 'sin_pedido' ? 'bg-red-600' : ''}`}
                                    onClick={() => setCheckoutData({ ...checkoutData, resultado: 'sin_pedido' })}
                                >
                                    <XCircle className="w-5 h-5" />
                                    <span className="text-[10px] font-black uppercase">Sin Pedido</span>
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="uppercase text-[10px] font-black text-slate-500 ml-1">Observaciones</Label>
                            <textarea
                                className="w-full h-24 bg-slate-50 rounded-2xl p-4 text-sm font-medium border-none focus:ring-2 focus:ring-blue-500/20"
                                placeholder="Escribe aquí algún detalle sobre la visita..."
                                value={checkoutData.observaciones}
                                onChange={(e) => setCheckoutData({ ...checkoutData, observaciones: e.target.value })}
                            />
                        </div>
                        <Button
                            onClick={() => mutationCheckout.mutate()}
                            disabled={mutationCheckout.isPending}
                            className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-500/20"
                        >
                            {mutationCheckout.isPending ? 'Sincronizando...' : 'Confirmar Check-out'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Asistencia Dialog */}
            <Dialog open={isAsistenciaOpen} onOpenChange={setIsAsistenciaOpen}>
                <DialogContent className="rounded-3xl border-none p-0 overflow-hidden max-w-[90%] sm:max-w-[400px]">
                    <div className="bg-slate-900 p-6 text-white text-center">
                        <Timer className="w-12 h-12 mx-auto mb-4 text-blue-400" />
                        <DialogTitle className="text-xl font-black uppercase italic italic">Control de Asistencia</DialogTitle>
                        <p className="text-[10px] text-slate-400 uppercase font-black mt-2 tracking-widest">{new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <div className="p-6 grid grid-cols-2 gap-4">
                        <Button
                            className="h-24 rounded-3xl bg-green-50 text-green-700 border-none flex flex-col gap-2 hover:bg-green-100"
                            onClick={() => mutationAsistencia.mutate('ingreso')}
                        >
                            <ArrowUpRight className="w-6 h-6" />
                            <span className="font-black text-xs">REGISTRAR INGRESO</span>
                        </Button>
                        <Button
                            className="h-24 rounded-3xl bg-red-50 text-red-700 border-none flex flex-col gap-2 hover:bg-red-100"
                            onClick={() => mutationAsistencia.mutate('salida')}
                        >
                            <Flag className="w-6 h-6" />
                            <span className="font-black text-xs">REGISTRAR SALIDA</span>
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Nuevo Prospecto Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="rounded-3xl border-none p-0 overflow-hidden max-w-[90%] sm:max-w-[500px]">
                    <div className="bg-blue-600 p-6 text-white">
                        <UserPlus className="w-10 h-10 mb-4" />
                        <DialogTitle className="text-xl font-black uppercase italic">Nuevo Prospecto</DialogTitle>
                        <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mt-1">Registra un cliente potencial en ruta</p>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="space-y-2">
                            <Label className="uppercase text-[10px] font-black text-slate-500 ml-1">Razón Social / Nombre</Label>
                            <Input
                                className="h-12 rounded-xl bg-slate-50 border-none"
                                value={prospectData.razon_social}
                                onChange={(e) => setProspectData({ ...prospectData, razon_social: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="uppercase text-[10px] font-black text-slate-500 ml-1">RUC / DNI</Label>
                            <Input
                                className="h-12 rounded-xl bg-slate-50 border-none"
                                value={prospectData.numero_documento}
                                onChange={(e) => setProspectData({ ...prospectData, numero_documento: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="uppercase text-[10px] font-black text-slate-500 ml-1">Teléfono</Label>
                                <Input
                                    className="h-12 rounded-xl bg-slate-50 border-none"
                                    value={prospectData.telefono}
                                    onChange={(e) => setProspectData({ ...prospectData, telefono: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="uppercase text-[10px] font-black text-slate-500 ml-1">Distrito</Label>
                                <Input className="h-12 rounded-xl bg-slate-50 border-none" placeholder="Ej: Lima" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="uppercase text-[10px] font-black text-slate-500 ml-1">Dirección</Label>
                            <Input
                                className="h-12 rounded-xl bg-slate-50 border-none"
                                value={prospectData.direccion}
                                onChange={(e) => setProspectData({ ...prospectData, direccion: e.target.value })}
                            />
                        </div>
                        <Button
                            className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase rounded-2xl shadow-xl shadow-blue-500/20 mt-4"
                            onClick={() => mutationProspecto.mutate()}
                            disabled={mutationProspecto.isPending}
                        >
                            {mutationProspecto.isPending ? 'REGISTRANDO...' : 'CREAR PROSPECTO'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Footer FAB */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-6 w-full max-w-md">
                <Button
                    size="lg"
                    onClick={() => setIsDialogOpen(true)}
                    className="w-full h-16 bg-slate-900 hover:bg-slate-800 text-white rounded-[2rem] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                >
                    <UserPlus className="w-6 h-6" />
                    <span className="font-black uppercase tracking-widest">Nuevo Prospecto</span>
                </Button>
            </div>
        </div>
    );
}
