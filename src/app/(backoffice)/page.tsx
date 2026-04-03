'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Receipt, DollarSign, AlertTriangle, TrendingUp, Users, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const [pedidos, comprobantes, pagos, productosBajoStock] = await Promise.all([
                supabase.from('pedidos').select('id, total', { count: 'exact' }),
                supabase.from('comprobantes').select('id', { count: 'exact' }),
                supabase.from('pagos').select('monto'),
                supabase.from('productos').select('id').lt('stock_minimo', 5) // Simple alert check
            ]);

            return {
                pedidosCount: pedidos.count || 0,
                pedidosTotal: pedidos.data?.reduce((acc, p) => acc + (p.total || 0), 0) || 0,
                comprobantesCount: comprobantes.count || 0,
                pagosTotal: pagos.data?.reduce((acc, p) => acc + (p.monto || 0), 0) || 0,
                alertasCount: productosBajoStock.data?.length || 0
            };
        }
    });

    return (
        <div className="space-y-8 p-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3 italic uppercase">
                        Panel de Control
                    </h1>
                    <p className="text-slate-500 font-medium uppercase tracking-widest text-[10px] mt-1">Visión General Operativa • Agrocar SRL</p>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-2xl p-1.5 shadow-sm border border-slate-100">
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-bold px-3 py-1 rounded-xl">Hoy</Badge>
                    <span className="text-xs font-bold text-slate-400 px-2 uppercase">{new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long' })}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-none shadow-xl shadow-blue-500/5 bg-white rounded-[2rem] overflow-hidden group">
                    <div className="h-2 w-full bg-blue-500/20 group-hover:bg-blue-500 transition-colors" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pedidos Hoy</CardTitle>
                        <div className="p-2 bg-blue-50 rounded-xl"><Package className="h-4 w-4 text-blue-600" /></div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-800 tracking-tighter italic">{isLoading ? '...' : stats?.pedidosCount}</div>
                        <div className="flex items-center gap-1.5 mt-2">
                            <TrendingUp className="w-3 h-3 text-green-500" />
                            <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">S/ {stats?.pedidosTotal.toLocaleString()}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl shadow-indigo-500/5 bg-white rounded-[2rem] overflow-hidden group">
                    <div className="h-2 w-full bg-indigo-500/20 group-hover:bg-indigo-500 transition-colors" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Comprobantes</CardTitle>
                        <div className="p-2 bg-indigo-50 rounded-xl"><Receipt className="h-4 w-4 text-indigo-600" /></div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-800 tracking-tighter italic">{isLoading ? '...' : stats?.comprobantesCount} <span className="text-sm font-bold text-slate-400 ml-1">Emitidos</span></div>
                        <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500" /> Sync con SUNAT OK
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl shadow-emerald-500/5 bg-white rounded-[2rem] overflow-hidden group">
                    <div className="h-2 w-full bg-emerald-500/20 group-hover:bg-emerald-500 transition-colors" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Cobrado</CardTitle>
                        <div className="p-2 bg-emerald-50 rounded-xl"><DollarSign className="h-4 w-4 text-emerald-600" /></div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-emerald-700 tracking-tighter italic">S/ {isLoading ? '...' : stats?.pagosTotal.toLocaleString()}</div>
                        <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wider">Flujo de caja neto</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl shadow-rose-500/5 bg-rose-50/20 rounded-[2rem] overflow-hidden group">
                    <div className="h-2 w-full bg-rose-500/20 group-hover:bg-rose-500 transition-colors" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">Alertas Críticas</CardTitle>
                        <div className="p-2 bg-rose-100 rounded-xl"><AlertTriangle className="h-4 w-4 text-rose-600" /></div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-rose-700 tracking-tighter italic">{isLoading ? '...' : stats?.alertasCount}</div>
                        <p className="text-[10px] text-rose-600/60 mt-2 font-bold uppercase tracking-wider">Atención inmediata requerida</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tight flex items-center gap-2">
                            <Clock className="w-5 h-5 text-slate-400" /> Actividad Reciente
                        </h2>
                        <Button variant="ghost" className="text-[10px] font-bold uppercase text-blue-600 hover:bg-blue-50">Ver todo</Button>
                    </div>
                    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white">
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-50">
                                {[
                                    { time: '14:32', text: 'Pedido PV-2026-00145 confirmado por Carlos Mamani', color: 'slate' },
                                    { time: '14:28', text: '✅ Factura F001-00000892 aceptada por SUNAT', color: 'green' },
                                    { time: '14:15', text: '💵 Cobro S/350.00 registrado por Jorge Quispe (Yape)', color: 'blue' },
                                    { time: '13:50', text: '🚚 Despacho AH-01 iniciado ruta Surquillo', color: 'amber' }
                                ].map((item, i) => (
                                    <div key={i} className="p-5 hover:bg-slate-50 transition-colors flex gap-6 items-center group cursor-pointer">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-lg group-hover:bg-white transition-colors">{item.time}</span>
                                        <span className={`text-sm font-bold text-slate-700 group-hover:translate-x-1 transition-transform`}>
                                            {item.text}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tight flex items-center gap-2">
                        <Users className="w-5 h-5 text-slate-400" /> Fuerza de Ventas
                    </h2>
                    <Card className="h-[400px] border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-slate-900 overflow-hidden relative group">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10">
                            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 border border-blue-500/30 animate-pulse">
                                <Users className="w-10 h-10 text-blue-400" />
                            </div>
                            <h3 className="text-white font-black uppercase italic tracking-tighter text-lg">GPS Realtime</h3>
                            <p className="text-slate-400 text-sm mt-2 font-medium">Visualiza la ubicación de tus 12 vendedores en campo.</p>
                            <Button className="mt-8 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs px-8 h-12 rounded-2xl transition-all active:scale-95">
                                Abrir Mapa Global
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
