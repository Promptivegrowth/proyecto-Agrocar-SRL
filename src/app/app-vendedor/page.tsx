'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, PackageOpen, DollarSign, Users, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function AppVendedorDashboard() {
    const dummyClientes = [
        { id: '1', nombre: 'Bodega La Esquina', dir: 'Av. Brasil 1240', estado: 'pendiente' },
        { id: '2', nombre: 'Minimarket El Buen Vecino', dir: 'Calle Los Pinos 402', estado: 'visitado' },
        { id: '3', nombre: 'Restaurant Doña Julia', dir: 'Av. Arequipa 3450', estado: 'deuda' },
    ];

    return (
        <div className="flex-1 bg-gray-50 flex flex-col relative pb-24">
            <div className="p-4 grid grid-cols-2 gap-3">
                <Card className="shadow-sm">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <PackageOpen className="w-6 h-6 text-primary mb-1" />
                        <span className="text-xl font-bold">12</span>
                        <span className="text-xs text-gray-500">Pedidos Hoy</span>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <DollarSign className="w-6 h-6 text-green-600 mb-1" />
                        <span className="text-xl font-bold text-green-700">S/ 4K</span>
                        <span className="text-xs text-gray-500">Vendido</span>
                    </CardContent>
                </Card>
            </div>

            <div className="px-4 pb-2 font-bold text-gray-800 border-b border-gray-200 bg-white sticky top-0 z-10 flex items-center justify-between mt-2 pt-2">
                <h2>Ruta de Hoy</h2>
                <Badge variant="outline" className="text-xs font-normal">3 clientes</Badge>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 bg-white">
                {dummyClientes.map((c) => (
                    <Link key={c.id} href={`/app-vendedor/pedido/${c.id}`} className="block">
                        <div className="p-4 flex items-start justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer">
                            <div className="flex flex-col">
                                <span className="font-semibold text-gray-900">{c.nombre}</span>
                                <span className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                                    <MapPin className="w-3 h-3" /> {c.dir}
                                </span>
                            </div>
                            <div>
                                {c.estado === 'visitado' && <Badge className="bg-green-100 text-green-800">Visitado</Badge>}
                                {c.estado === 'pendiente' && <Badge variant="outline" className="text-gray-500 border-gray-300">Pendiente</Badge>}
                                {c.estado === 'deuda' && <Badge variant="destructive" className="bg-red-100 text-red-800 mt-1">Con Deuda</Badge>}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Floating Action Button */}
            <div className="fixed sm:absolute bottom-6 right-6 sm:bottom-6 sm:right-6">
                <Button size="lg" className="h-14 w-14 rounded-full shadow-lg shadow-primary/30 bg-primary">
                    <Plus className="h-6 w-6 text-secondary" />
                </Button>
            </div>
        </div>
    );
}
