'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
    Truck, AlertTriangle, ShieldCheck, Wrench, FileText, Clock, Plus, CheckCircle2,
    Calendar, User, MapPin, Gauge, Settings, ChevronRight, Zap, CreditCard, Shield, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const ALERT_ICONS: Record<string, any> = {
    soat: Shield,
    revision_tecnica: FileText,
    mantenimiento: Wrench,
    multa: AlertTriangle,
    seguro: ShieldCheck,
    licencia: CreditCard,
    otro: AlertCircle
};

const ALERT_LABELS: Record<string, string> = {
    soat: 'SOAT',
    revision_tecnica: 'Rev. Técnica',
    mantenimiento: 'Mantenimiento',
    multa: 'Multa',
    seguro: 'Seguro',
    licencia: 'Licencia',
    otro: 'Otro'
};

const PRIORIDAD_COLORS: Record<string, string> = {
    critica: 'bg-red-100 text-red-700 border-red-200',
    alta: 'bg-orange-100 text-orange-700 border-orange-200',
    media: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    baja: 'bg-blue-100 text-blue-700 border-blue-200'
};

const ESTADO_COLORS: Record<string, string> = {
    pendiente: 'bg-yellow-500',
    vencido: 'bg-red-500',
    pagado: 'bg-green-500',
    resuelto: 'bg-slate-400'
};

function getDaysUntil(dateStr: string): number | null {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function FlotaPage() {
    const queryClient = useQueryClient();
    const [selectedVehiculo, setSelectedVehiculo] = useState<any>(null);
    const [showNewAlerta, setShowNewAlerta] = useState(false);
    const [newAlerta, setNewAlerta] = useState({
        tipo: 'soat', titulo: '', descripcion: '', fecha_vencimiento: '', monto: '', prioridad: 'media'
    });

    const { data: vehiculos = [], isLoading } = useQuery({
        queryKey: ['flota-vehiculos'],
        queryFn: async () => {
            const { data } = await supabase
                .from('vehiculos')
                .select('*, usuarios!chofer_id(nombres, apellidos, telefono)')
                .eq('activo', true)
                .order('placa');
            return data || [];
        }
    });

    const { data: alertas = [] } = useQuery({
        queryKey: ['fleet-alertas'],
        queryFn: async () => {
            const { data } = await supabase
                .from('fleet_alertas')
                .select('*, vehiculos(placa, marca, modelo)')
                .not('estado', 'eq', 'resuelto')
                .order('fecha_vencimiento', { ascending: true });
            return data || [];
        },
        refetchInterval: 30000
    });

    const resolverAlertaMutation = useMutation({
        mutationFn: async (alertaId: string) => {
            const { error } = await supabase
                .from('fleet_alertas')
                .update({ estado: 'resuelto', updated_at: new Date().toISOString() })
                .eq('id', alertaId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fleet-alertas'] });
            toast.success('Alerta marcada como resuelta');
        },
        onError: () => toast.error('Error al actualizar la alerta')
    });

    const crearAlertaMutation = useMutation({
        mutationFn: async () => {
            if (!selectedVehiculo || !newAlerta.titulo) throw new Error('Campos requeridos');
            const { data: emp } = await supabase.from('usuarios').select('empresa_id').limit(1).single();
            const { error } = await supabase.from('fleet_alertas').insert([{
                empresa_id: emp?.empresa_id,
                vehiculo_id: selectedVehiculo.id,
                tipo: newAlerta.tipo,
                titulo: newAlerta.titulo,
                descripcion: newAlerta.descripcion,
                fecha_vencimiento: newAlerta.fecha_vencimiento || null,
                monto: newAlerta.monto ? Number(newAlerta.monto) : 0,
                prioridad: newAlerta.prioridad,
                estado: 'pendiente'
            }]);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fleet-alertas'] });
            setShowNewAlerta(false);
            setNewAlerta({ tipo: 'soat', titulo: '', descripcion: '', fecha_vencimiento: '', monto: '', prioridad: 'media' });
            toast.success('Alerta creada correctamente');
        },
        onError: (err: any) => toast.error(err.message || 'Error al crear alerta')
    });

    const alertasCriticas = alertas.filter((a: any) => a.prioridad === 'critica' || a.estado === 'vencido');
    const alertasVehiculo = selectedVehiculo ? alertas.filter((a: any) => a.vehiculo_id === selectedVehiculo.id) : [];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-3">
                    <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
                    <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Cargando flota...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Truck className="w-9 h-9 text-primary" />
                        Gestión de Flota
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Control de vehículos, documentos y alertas técnicas.</p>
                </div>
                <div className="flex gap-3">
                    {alertasCriticas.length > 0 && (
                        <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />
                            <span className="text-red-700 font-black text-sm">{alertasCriticas.length} alertas críticas</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Vehículos Activos', value: vehiculos.length, icon: Truck, color: 'text-primary', bg: 'bg-primary/10' },
                    { label: 'Alertas Totales', value: alertas.length, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Alertas Críticas', value: alertasCriticas.length, icon: Zap, color: 'text-red-600', bg: 'bg-red-50' },
                    { label: 'Documentación OK', value: vehiculos.length - alertasCriticas.length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                ].map((stat, i) => (
                    <Card key={i} className="border-0 shadow-md rounded-3xl overflow-hidden">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className={`${stat.bg} p-3 rounded-2xl`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{stat.label}</p>
                                <p className="text-3xl font-black text-slate-900">{stat.value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Vehicle Cards */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <Truck className="w-5 h-5" /> Flota de Vehículos
                    </h2>
                    {vehiculos.map((v: any) => {
                        const vAlerts = alertas.filter((a: any) => a.vehiculo_id === v.id);
                        const hasVencido = vAlerts.some((a: any) => a.estado === 'vencido');
                        const hasCritica = vAlerts.some((a: any) => a.prioridad === 'critica');
                        const chofer = v.usuarios ? `${v.usuarios.nombres} ${v.usuarios.apellidos}` : 'Sin chofer';

                        const daysSOAT = getDaysUntil(v.venc_soat);
                        const daysRev = getDaysUntil(v.venc_revision);

                        return (
                            <Card
                                key={v.id}
                                className={`border-2 rounded-3xl cursor-pointer transition-all hover:shadow-lg ${hasCritica || hasVencido ? 'border-red-200 bg-red-50/30' : 'border-slate-200 hover:border-primary/40'} ${selectedVehiculo?.id === v.id ? 'border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/20' : ''}`}
                                onClick={() => setSelectedVehiculo(selectedVehiculo?.id === v.id ? null : v)}
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-2xl ${hasCritica || hasVencido ? 'bg-red-100' : 'bg-primary/10'}`}>
                                                <Truck className={`w-7 h-7 ${hasCritica || hasVencido ? 'text-red-600' : 'text-primary'}`} />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{v.placa}</h3>
                                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">{v.marca} {v.modelo} {v.anio}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            {(hasCritica || hasVencido) && (
                                                <Badge className="bg-red-600 text-white font-black uppercase text-[9px] animate-pulse">
                                                    <AlertTriangle className="w-3 h-3 mr-1" /> Atención
                                                </Badge>
                                            )}
                                            <Badge variant="outline" className="font-bold text-[10px] bg-white">
                                                {vAlerts.length} alertas
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 text-[11px] mb-4">
                                        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                                            <User className="w-3.5 h-3.5 mx-auto mb-1 text-slate-400" />
                                            <p className="font-black text-slate-700 text-xs leading-tight">{chofer}</p>
                                            <p className="text-slate-400 font-bold uppercase tracking-wider mt-0.5">Chofer</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                                            <Gauge className="w-3.5 h-3.5 mx-auto mb-1 text-slate-400" />
                                            <p className="font-black text-slate-700 text-xs">{(v.km_actual || 0).toLocaleString()}</p>
                                            <p className="text-slate-400 font-bold uppercase tracking-wider mt-0.5">KM Actual</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-2.5 text-center relative overflow-hidden group">
                                            <Wrench className="w-3.5 h-3.5 mx-auto mb-1 text-slate-400" />
                                            {(() => {
                                                const kmDesdeAceite = v.km_actual - (v.ultimo_km_aceite || 0);
                                                const objetivo = v.objetivo_km_aceite || 5000;
                                                const porc = Math.min(100, (kmDesdeAceite / objetivo) * 100);
                                                const isCritical = porc >= 90;
                                                return (
                                                    <>
                                                        <p className={`font-black text-xs ${isCritical ? 'text-red-600' : 'text-slate-700'}`}>
                                                            {kmDesdeAceite.toLocaleString()} / {objetivo.toLocaleString()}
                                                        </p>
                                                        <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-200">
                                                            <div
                                                                className={`h-full transition-all ${isCritical ? 'bg-red-500' : 'bg-blue-500'}`}
                                                                style={{ width: `${porc}%` }}
                                                            />
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                            <p className="text-slate-400 font-bold uppercase tracking-wider mt-0.5">Aceite (KM)</p>
                                        </div>
                                        <div className={`rounded-xl p-2.5 text-center border-2 ${v.tiene_papeletas ? 'bg-orange-50 border-orange-200 animate-pulse' : 'bg-slate-50 border-transparent'}`}>
                                            <AlertTriangle className={`w-3.5 h-3.5 mx-auto mb-1 ${v.tiene_papeletas ? 'text-orange-600' : 'text-slate-400'}`} />
                                            <p className={`font-black text-xs ${v.tiene_papeletas ? 'text-orange-700' : 'text-slate-700'}`}>
                                                {v.tiene_papeletas ? `S/ ${v.monto_papeletas || 0}` : 'OK'}
                                            </p>
                                            <p className="text-slate-400 font-bold uppercase tracking-wider mt-0.5">Papeletas</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { label: 'SOAT', venc: v.venc_soat, days: daysSOAT },
                                            { label: 'Rev. Técnica', venc: v.venc_revision, days: daysRev }
                                        ].map((doc, i) => {
                                            const isVencido = doc.days !== null && doc.days < 0;
                                            const isProximo = doc.days !== null && doc.days >= 0 && doc.days <= 30;
                                            return (
                                                <div key={i} className={`rounded-xl p-2.5 border ${isVencido ? 'bg-red-50 border-red-200' : isProximo ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{doc.label}</p>
                                                        <div className={`w-2 h-2 rounded-full ${isVencido ? 'bg-red-500' : isProximo ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                                                    </div>
                                                    <p className={`text-xs font-black mt-1 ${isVencido ? 'text-red-700' : isProximo ? 'text-amber-700' : 'text-emerald-700'}`}>
                                                        {doc.venc ? new Date(doc.venc).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : 'Sin datos'}
                                                    </p>
                                                    {doc.days !== null && (
                                                        <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                                                            {isVencido ? `Vencido hace ${Math.abs(doc.days)} días` : `${doc.days} días restantes`}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {selectedVehiculo?.id === v.id && (
                                        <div className="mt-4 pt-4 border-t border-slate-200">
                                            <Button
                                                className="w-full h-10 font-black text-[11px] uppercase tracking-widest rounded-2xl"
                                                onClick={(e) => { e.stopPropagation(); setShowNewAlerta(true); }}
                                            >
                                                <Plus className="w-4 h-4 mr-2" /> Agregar Alerta
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Alerts Panel */}
                <div className="space-y-4">
                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" /> Alertas Activas
                        {alertas.length > 0 && <Badge className="bg-amber-500 text-white ml-auto">{alertas.length}</Badge>}
                    </h2>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                        {alertas.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed">
                                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                                <p className="font-black text-slate-400 uppercase text-xs tracking-widest">Sin alertas pendientes</p>
                            </div>
                        ) : alertas.map((alerta: any) => {
                            const Icon = ALERT_ICONS[alerta.tipo] || AlertCircle;
                            const days = getDaysUntil(alerta.fecha_vencimiento);
                            const isVencido = alerta.estado === 'vencido' || (days !== null && days < 0);
                            return (
                                <div
                                    key={alerta.id}
                                    className={`bg-white rounded-2xl border-2 p-4 transition-all hover:shadow-md ${isVencido ? 'border-red-200 bg-red-50/50' : alerta.prioridad === 'alta' ? 'border-orange-200' : 'border-slate-200'}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-xl mt-0.5 ${isVencido ? 'bg-red-100' : alerta.prioridad === 'alta' ? 'bg-orange-100' : 'bg-amber-50'}`}>
                                            <Icon className={`w-4 h-4 ${isVencido ? 'text-red-600' : alerta.prioridad === 'alta' ? 'text-orange-600' : 'text-amber-600'}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${PRIORIDAD_COLORS[alerta.prioridad]}`}>
                                                    {alerta.prioridad}
                                                </span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">{ALERT_LABELS[alerta.tipo]}</span>
                                            </div>
                                            <p className="font-bold text-sm text-slate-800 leading-tight">{alerta.titulo}</p>
                                            <p className="text-[10px] text-slate-500 font-bold mt-0.5">{alerta.vehiculos?.placa}</p>
                                            {alerta.fecha_vencimiento && (
                                                <p className={`text-[10px] font-bold mt-1 flex items-center gap-1 ${isVencido ? 'text-red-600' : 'text-slate-400'}`}>
                                                    <Clock className="w-3 h-3" />
                                                    {isVencido ? `¡VENCIDO hace ${Math.abs(days!)} días!` : `Vence: ${new Date(alerta.fecha_vencimiento).toLocaleDateString('es-PE')} (${days} días)`}
                                                </p>
                                            )}
                                            {alerta.monto > 0 && (
                                                <p className="text-[10px] font-black text-slate-600 mt-1">S/ {alerta.monto.toLocaleString()}</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => resolverAlertaMutation.mutate(alerta.id)}
                                            className="shrink-0 p-1.5 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 text-slate-300 transition-all"
                                            title="Marcar como resuelto"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* New Alert Dialog */}
            <Dialog open={showNewAlerta} onOpenChange={setShowNewAlerta}>
                <DialogContent className="sm:max-w-[480px] rounded-3xl border-0 p-0 overflow-hidden">
                    <div className="bg-slate-900 p-6 text-white">
                        <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                            <AlertTriangle className="w-6 h-6 text-amber-400" /> Nueva Alerta
                        </DialogTitle>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                            Vehículo: {selectedVehiculo?.placa}
                        </p>
                    </div>
                    <div className="p-6 space-y-4 bg-white">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">Tipo</label>
                                <select
                                    value={newAlerta.tipo}
                                    onChange={e => setNewAlerta(p => ({ ...p, tipo: e.target.value }))}
                                    className="w-full h-11 px-3 rounded-2xl border-2 border-slate-200 bg-slate-50 font-medium text-sm focus:border-primary focus:outline-none"
                                >
                                    {Object.entries(ALERT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">Prioridad</label>
                                <select
                                    value={newAlerta.prioridad}
                                    onChange={e => setNewAlerta(p => ({ ...p, prioridad: e.target.value }))}
                                    className="w-full h-11 px-3 rounded-2xl border-2 border-slate-200 bg-slate-50 font-medium text-sm focus:border-primary focus:outline-none"
                                >
                                    <option value="baja">Baja</option>
                                    <option value="media">Media</option>
                                    <option value="alta">Alta</option>
                                    <option value="critica">Crítica</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">Título</label>
                            <input
                                type="text" placeholder="Ej: SOAT por vencer..."
                                value={newAlerta.titulo} onChange={e => setNewAlerta(p => ({ ...p, titulo: e.target.value }))}
                                className="w-full h-11 px-4 rounded-2xl border-2 border-slate-200 bg-slate-50 font-medium text-sm focus:border-primary focus:outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">Vencimiento</label>
                                <input
                                    type="date" value={newAlerta.fecha_vencimiento} onChange={e => setNewAlerta(p => ({ ...p, fecha_vencimiento: e.target.value }))}
                                    className="w-full h-11 px-4 rounded-2xl border-2 border-slate-200 bg-slate-50 font-medium text-sm focus:border-primary focus:outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">Monto (S/)</label>
                                <input
                                    type="number" placeholder="0" value={newAlerta.monto} onChange={e => setNewAlerta(p => ({ ...p, monto: e.target.value }))}
                                    className="w-full h-11 px-4 rounded-2xl border-2 border-slate-200 bg-slate-50 font-medium text-sm focus:border-primary focus:outline-none"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">Descripción (opcional)</label>
                            <textarea
                                placeholder="Detalles adicionales..." value={newAlerta.descripcion} onChange={e => setNewAlerta(p => ({ ...p, descripcion: e.target.value }))}
                                className="w-full h-20 px-4 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50 font-medium text-sm focus:border-primary focus:outline-none resize-none"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowNewAlerta(false)} className="flex-1 h-12 rounded-2xl border-2 border-slate-200 font-black text-sm uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all">
                                Cancelar
                            </button>
                            <button
                                onClick={() => crearAlertaMutation.mutate()}
                                disabled={crearAlertaMutation.isPending}
                                className="flex-1 h-12 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                            >
                                {crearAlertaMutation.isPending ? 'Guardando...' : 'Crear Alerta'}
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
