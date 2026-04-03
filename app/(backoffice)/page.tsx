'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Receipt, DollarSign, AlertTriangle } from 'lucide-react';

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Inicio</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Pedidos Hoy</CardTitle>
                        <Package className="h-4 w-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">12</div>
                        <p className="text-xs text-green-600 mt-1 font-medium">S/ 4,250.00</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Comprobantes</CardTitle>
                        <Receipt className="h-4 w-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">8 Emitidos</div>
                        <p className="text-xs text-green-600 mt-1 font-medium">8 Aceptados SUNAT</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-primary shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Cobros del Día</CardTitle>
                        <DollarSign className="h-4 w-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">S/ 1,850.50</div>
                        <p className="text-xs text-gray-500 mt-1">Efectivo y Yape</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500 shadow-sm bg-red-50/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-red-700">Alertas</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700">3</div>
                        <p className="text-xs text-red-600 mt-1 font-medium">1 Stock bajo, 2 Deudas</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                <div className="col-span-2 space-y-4">
                    <h2 className="text-xl font-semibold">Actividad Reciente</h2>
                    <Card>
                        <CardContent className="p-0">
                            <div className="divide-y divide-gray-100">
                                <div className="p-4 hover:bg-gray-50 text-sm flex gap-4">
                                    <span className="text-gray-500 whitespace-nowrap">14:32</span>
                                    <span className="font-medium">Pedido PV-2026-00145 confirmado por Carlos Mamani</span>
                                </div>
                                <div className="p-4 hover:bg-gray-50 text-sm flex gap-4">
                                    <span className="text-gray-500 whitespace-nowrap">14:28</span>
                                    <span className="text-green-600 font-medium">✅ B001-00000892 aceptada por SUNAT</span>
                                </div>
                                <div className="p-4 hover:bg-gray-50 text-sm flex gap-4">
                                    <span className="text-gray-500 whitespace-nowrap">14:15</span>
                                    <span className="text-blue-600 font-medium">💵 Cobro S/350.00 registrado por Jorge Quispe (Yape)</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div>
                    <h2 className="text-xl font-semibold mb-4">Mapa Rápido</h2>
                    <Card className="h-[300px] flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
                        Mapa Google Maps cargando... (Mockup)
                    </Card>
                </div>
            </div>
        </div>
    );
}
