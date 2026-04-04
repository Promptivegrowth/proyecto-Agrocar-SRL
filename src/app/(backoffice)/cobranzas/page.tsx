'use client';

import Link from 'next/link';
import {
    Wallet,
    History,
    BarChart3,
    ArrowUpRight,
    ChevronRight,
    CheckCircle2,
    Clock,
    AlertCircle,
    Landmark,
    TrendingUp
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export default function CobranzasPage() {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['cobranzas-main-stats'],
        queryFn: async () => {
            // 1. Por Cobrar (Pendiente + Parcial)
            const { data: comps } = await supabase.from('comprobantes')
                .select('total, monto_pagado, fecha_emision')
                .in('estado_pago', ['pendiente', 'parcial']);

            const totalPendiente = comps?.reduce((acc, c) => acc + (Number(c.total) - (Number(c.monto_pagado) || 0)), 0) || 0;

            const hoy = new Date();
            const vencido = comps?.filter(c => {
                const f = new Date(c.fecha_emision);
                f.setDate(f.getDate() + 7);
                return hoy > f;
            }).reduce((acc, c) => acc + (Number(c.total) - (Number(c.monto_pagado) || 0)), 0) || 0;

            // 2. Cobrado Hoy
            const { data: pagosHoy } = await supabase.from('pagos')
                .select('monto')
                .eq('fecha', new Date().toISOString().split('T')[0]);

            const totalCobradoHoy = pagosHoy?.reduce((acc, p) => acc + Number(p.monto), 0) || 0;

            return {
                totalPendiente,
                vencido,
                totalCobradoHoy,
                meta: 10000 // Mock meta
            };
        }
    });

    const statCards = [
        { title: 'Por Cobrar (Vencido)', value: `S/. ${stats?.vencido.toLocaleString() || '0'}`, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
        { title: 'Por Cobrar (Vigente)', value: `S/. ${(stats?.totalPendiente || 0 - (stats?.vencido || 0)).toLocaleString() || '0'}`, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        { title: 'Cobrado Hoy', value: `S/. ${stats?.totalCobradoHoy.toLocaleString() || '0'}`, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
        { title: 'Progreso Meta', value: `${Math.round(((stats?.totalCobradoHoy || 0) / (stats?.meta || 1)) * 100)}%`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    ];

    const menuItems = [
        {
            title: 'Cuentas Corrientes',
            description: 'Estado de deuda por cliente, amortizaciones y línea de crédito.',
            href: '/cobranzas/cuentas-corrientes',
            icon: Wallet,
            color: 'bg-blue-600'
        },
        {
            title: 'Historial de Pagos',
            description: 'Registro cronológico de cobranzas, arqueos y depósitos.',
            href: '/cobranzas/historial',
            icon: History,
            color: 'bg-purple-600'
        },
        {
            title: 'Apertura y Cierre de Caja',
            description: 'Control de efectivo diario, saldos y reporte de arqueo.',
            href: '/cobranzas/caja',
            icon: Landmark,
            color: 'bg-emerald-600'
        }
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">Módulo de Cobranzas</h1>
                <p className="text-gray-500 mt-2 text-lg">Gestión de cartera pesada, control de caja y conciliación bancaria.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, idx) => (
                    <Card key={idx} className="border-none shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.title}</p>
                                <p className="text-2xl font-black mt-1 text-gray-800">{stat.value}</p>
                            </div>
                            <div className={`${stat.bg} p-3 rounded-2xl`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Menu */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {menuItems.map((item, idx) => (
                    <Link key={idx} href={item.href} className="group">
                        <Card className="h-full border-2 border-transparent hover:border-primary/20 hover:shadow-xl transition-all duration-300">
                            <CardHeader>
                                <div className={`${item.color} w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                                    <item.icon className="w-6 h-6" />
                                </div>
                                <CardTitle className="group-hover:text-primary transition-colors flex items-center">
                                    {item.title} <ArrowUpRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </CardTitle>
                                <CardDescription className="text-sm leading-relaxed">{item.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button variant="ghost" className="p-0 text-primary font-bold group-hover:translate-x-2 transition-transform border-none hover:bg-transparent">
                                    Gestionar <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Collections Summary Mockup */}
            <Card className="shadow-sm border-gray-100">
                <CardHeader className="border-b bg-gray-50/30">
                    <CardTitle className="text-lg">Próximos Vencimientos</CardTitle>
                    <CardDescription>Facturas que vencen en los próximos 3 días</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="p-12 text-center text-gray-400">
                        <Clock className="w-12 h-12 mx-auto mb-3 opacity-10" />
                        <p className="text-sm italic font-medium">No hay vencimientos críticos registrados para hoy.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
