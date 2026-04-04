'use client';

import Link from 'next/link';
import {
    FileText,
    Layers,
    History,
    Settings,
    ChevronRight,
    ArrowUpRight,
    CheckCircle2,
    Clock,
    AlertTriangle,
    BarChart3,
    Truck
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function FacturacionPage() {
    const statCards = [
        { title: 'Pendientes de Envío', value: '12', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        { title: 'Aceptados SUNAT', value: '2,451', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
        { title: 'Rechazados', value: '0', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
        { title: 'Total del Mes', value: 'S/. 45.2k', icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50' },
    ];

    const menuItems = [
        {
            title: 'Facturación en Bloque',
            description: 'Emite comprobantes masivamente por Consolidados de Despacho.',
            href: '/facturacion/bloque',
            icon: Layers,
            color: 'bg-blue-500'
        },
        {
            title: 'Historial de Comprobantes',
            description: 'Consulta, descarga XML/PDF y anula documentos emitidos.',
            href: '/facturacion/historial',
            icon: History,
            color: 'bg-purple-500'
        },
        {
            title: 'Configuración de Series',
            description: 'Gestiona series B001, F001 y correlativos actuales.',
            href: '/facturacion/configuracion',
            icon: Settings,
            color: 'bg-gray-500'
        },
        {
            title: 'Guías de Remisión',
            description: 'Emite y consulta guías de remitente (Traslados).',
            href: '/facturacion/guias',
            icon: Truck,
            color: 'bg-orange-500'
        }
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">Módulo de Facturación</h1>
                <p className="text-gray-500 mt-2 text-lg">Central de comprobantes electrónicos y comunicación con SUNAT/OSE.</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                                <Button variant="ghost" className="p-0 text-primary font-bold group-hover:translate-x-2 transition-transform">
                                    Ir ahora <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Recent Activity Mockup */}
            <Card className="shadow-sm border-gray-100">
                <CardHeader className="border-b bg-gray-50/30">
                    <CardTitle className="text-lg">Actividad Reciente</CardTitle>
                    <CardDescription>Ultimos 5 comprobantes generados hoy</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="p-8 text-center text-gray-400">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-10" />
                        <p className="text-sm italic">Los datos del historial aparecerán aquí tras la primera emisión del día.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
