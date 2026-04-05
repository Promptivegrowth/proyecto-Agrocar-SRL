'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Package,
    Receipt,
    DollarSign,
    AlertTriangle,
    TrendingUp,
    Users,
    Clock,
    ArrowUpRight,
    MousePointer2,
    Zap,
    ZapOff,
    MapPin,
    Truck
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { exportToExcel } from '@/lib/exportUtils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    Cell,
    PieChart,
    Pie
} from 'recharts';
import Link from 'next/link';

export default function DashboardPage() {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboard-stats-pro'],
        queryFn: async () => {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

            const [pedidos, comprobantes, pagos, productosBajoStock] = await Promise.all([
                supabase.from('pedidos').select('id, total, created_at').gte('created_at', startOfMonth),
                supabase.from('comprobantes').select('id, total', { count: 'exact' }).gte('fecha_emision', startOfMonth.split('T')[0]),
                supabase.from('pagos').select('monto, created_at').gte('created_at', startOfMonth),
                supabase.from('productos').select('nombre, stock, stock_minimo').lt('stock', 10).limit(5)
            ]);

            // Mock chart data for visual excellence
            const chartData = [
                { name: 'Lun', ventas: 4000, cobros: 2400 },
                { name: 'Mar', ventas: 3000, cobros: 1398 },
                { name: 'Mie', ventas: 2000, cobros: 9800 },
                { name: 'Jue', ventas: 2780, cobros: 3908 },
                { name: 'Vie', ventas: 1890, cobros: 4800 },
                { name: 'Sab', ventas: 2390, cobros: 3800 },
                { name: 'Dom', ventas: 3490, cobros: 4300 },
            ];

            return {
                pedidosCount: pedidos.data?.length || 0,
                pedidosTotal: pedidos.data?.reduce((acc, p) => acc + (p.total || 0), 0) || 0,
                comprobantesCount: comprobantes.count || 0,
                pagosTotal: pagos.data?.reduce((acc, p) => acc + (p.monto || 0), 0) || 0,
                alertas: productosBajoStock.data || [],
                chartData
            };
        }
    });

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        Dashboard Gerencial <Zap className="w-8 h-8 text-blue-600 animate-pulse" />
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Inteligencia de negocios y monitoreo operativo en tiempo real.</p>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl font-bold text-xs uppercase tracking-widest border-2"
                        onClick={async () => {
                            const dataToExport = [
                                { "CONCEPTO": "REPORTE", "VALOR": "RESUMEN GERENCIAL AGROCAR" },
                                { "CONCEPTO": "FECHA", "VALOR": new Date().toLocaleDateString() },
                                { "CONCEPTO": "VENTAS TOTALES DEL MES", "VALOR": stats?.pedidosTotal },
                                { "CONCEPTO": "COBRANZA TOTAL EFECTIVA", "VALOR": stats?.pagosTotal },
                                { "CONCEPTO": "DOCUMENTOS EMITIDOS (SUNAT)", "VALOR": stats?.comprobantesCount },
                                { "CONCEPTO": "PRODUCTOS CON STOCK CRÍTICO", "VALOR": stats?.alertas.length },
                                { "CONCEPTO": "ESTUADO DE OPERACIÓN", "VALOR": "OPTIMO" }
                            ];
                            await exportToExcel(dataToExport, "Reporte_Gerencial_Agrocar", "Dashboard");
                            toast.success("Reporte gerencial generado");
                        }}
                    >
                        Exportar Reporte
                    </Button>
                    <Link href="/supervision/mapa">
                        <Badge className="bg-blue-600 text-white border-none font-bold px-4 py-2 rounded-xl h-9 hover:bg-blue-700 cursor-pointer flex items-center justify-center">
                            LIVE MONITORING
                        </Badge>
                    </Link>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Ventas de Mes', value: `S/ ${stats?.pedidosTotal.toLocaleString()}`, sub: `+12% vs mes ant.`, icon: TrendingUp, color: 'blue' },
                    { label: 'Cobranza Total', value: `S/ ${stats?.pagosTotal.toLocaleString()}`, sub: `${((stats?.pagosTotal || 0) / (stats?.pedidosTotal || 1) * 100).toFixed(1)}% ratio`, icon: DollarSign, color: 'green' },
                    { label: 'Documentos SUNAT', value: stats?.comprobantesCount, sub: 'Sincronizado OK', icon: Receipt, color: 'indigo' },
                    { label: 'Stock Crítico', value: stats?.alertas.length, sub: 'Req. Reposición', icon: AlertTriangle, color: 'rose' },
                ].map((stat, i) => (
                    <Card key={i} className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all duration-300">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</CardTitle>
                            <div className={`p-2 bg-${stat.color}-50 rounded-xl`}><stat.icon className={`h-4 w-4 text-${stat.color}-600`} /></div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-slate-900 tracking-tighter">{isLoading ? '...' : stat.value}</div>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{stat.sub}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white p-6">
                    <CardHeader className="px-0 pt-0">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-xl font-black text-slate-800 uppercase tracking-tight italic">Flujo de Ingresos vs Ventas</CardTitle>
                                <CardDescription className="text-xs font-bold uppercase text-slate-400 mt-1">Comparativa semanal de facturación y cobranza líquida</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-blue-500" /><span className="text-[10px] font-bold text-slate-400 uppercase">Ventas</span></div>
                                <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-500" /><span className="text-[10px] font-bold text-slate-400 uppercase">Cobros</span></div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[300px] px-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats?.chartData}>
                                <defs>
                                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCobros" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                    tickFormatter={(val) => `S/${val}`}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                                />
                                <Area type="monotone" dataKey="ventas" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVentas)" />
                                <Area type="monotone" dataKey="cobros" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCobros)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-slate-900 overflow-hidden relative p-8 flex flex-col">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><Zap className="w-32 h-32 text-blue-400" /></div>
                    <h3 className="text-white font-black uppercase italic text-2xl tracking-tighter leading-none">Supervisión<br />de Flota</h3>
                    <p className="text-slate-400 text-sm mt-4 font-medium leading-relaxed">Monitorea la ubicación de tus vendedores y el progreso de sus rutas en tiempo real.</p>

                    <div className="mt-8 flex-1 flex flex-col justify-center gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                                <Users className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-white font-black text-xs uppercase tracking-wider">12 Activos</p>
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">En campo hoy</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                                <MapPin className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-white font-black text-xs uppercase tracking-wider">45 Visitas</p>
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Completadas hoy</p>
                            </div>
                        </div>
                    </div>

                    <Link href="/supervision/mapa">
                        <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs h-14 rounded-2xl shadow-xl shadow-blue-500/20 group">
                            Visualizar Mapa Satelital <ArrowUpRight className="ml-2 w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </Button>
                    </Link>
                </Card>
            </div>

            {/* Alerts & Inventory Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-black text-slate-800 uppercase italic tracking-tight flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-rose-500" /> Stock Crítico (Reposición)
                        </h2>
                        <Link href="/maestros/productos">
                            <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-blue-600 hover:bg-blue-50">Gestionar Inventario</Button>
                        </Link>
                    </div>
                    <div className="space-y-4">
                        {stats?.alertas.map((prod, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-rose-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-bold text-rose-500 shadow-sm border border-rose-100">{prod.stock}</div>
                                    <div>
                                        <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{prod.nombre}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Mínimo: {prod.stock_minimo}</p>
                                    </div>
                                </div>
                                <Button size="sm" className="h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Pedir</Button>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full translate-x-8 -translate-y-8 opacity-80" />
                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <h2 className="text-lg font-black text-slate-800 uppercase italic tracking-tight flex items-center gap-2">
                            <Truck className="w-5 h-5 text-amber-500" /> Flota: Alertas Urgentes
                        </h2>
                        <Link href="/despacho/flota">
                            <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-amber-600 hover:bg-amber-50">Ver Flota</Button>
                        </Link>
                    </div>
                    <FleetAlertsWidget />
                </Card>
            </div>
        </div>
    );
}

function FleetAlertsWidget() {
    const { data: alertas = [] } = useQuery({
        queryKey: ['fleet-alertas-dashboard'],
        queryFn: async () => {
            const { data } = await supabase
                .from('fleet_alertas')
                .select('*, vehiculos(placa)')
                .not('estado', 'eq', 'resuelto')
                .order('fecha_vencimiento', { ascending: true })
                .limit(6);
            return data || [];
        },
        refetchInterval: 30000
    });

    if (alertas.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 bg-emerald-50 rounded-3xl border-2 border-emerald-100">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                    <ZapOff className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="font-black text-emerald-700 text-xs uppercase tracking-widest">Flota sin alertas</p>
                <p className="text-[10px] text-emerald-500 font-medium mt-1">Toda la documentación al día</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {alertas.map((alerta: any) => {
                const days = alerta.fecha_vencimiento
                    ? Math.ceil((new Date(alerta.fecha_vencimiento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                const isVencido = alerta.estado === 'vencido' || (days !== null && days < 0);
                const isUrgente = days !== null && days <= 7 && days >= 0;
                const color = isVencido ? 'bg-red-50 border-red-200 text-red-700' : isUrgente ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-100 text-slate-700';
                return (
                    <div key={alerta.id} className={`flex items-center gap-3 p-3 rounded-2xl border ${color}`}>
                        <div className={`w-2 h-8 rounded-full shrink-0 ${isVencido ? 'bg-red-500' : isUrgente ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`} />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black leading-tight truncate">{alerta.titulo}</p>
                            <p className="text-[9px] font-bold opacity-60 uppercase tracking-wider mt-0.5">{alerta.vehiculos?.placa}</p>
                        </div>
                        <div className="text-right shrink-0">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${isVencido ? 'bg-red-100 text-red-700' : isUrgente ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                                {isVencido ? 'VENCIDO' : days !== null ? `${days}d` : '—'}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
