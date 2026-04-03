'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Plus, PackageOpen, DollarSign, Users, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export default function AppVendedorDashboard() {
    const { data: clientes, isLoading } = useQuery({
        queryKey: ['clientes-vendedor'],
        queryFn: async () => {
            const userRes = await supabase.auth.getUser();
            // Normally we'd filter by vendedor_asignado_id = userRes.data.user.id
            // But for this prototype we'll load the first 10
            const { data, error } = await supabase.from('clientes').select('id, razon_social, estado, limite_credito').limit(10);
            if (error) throw error;
            return data;
        }
    });

    return (
        <div className="flex-1 bg-gray-50 flex flex-col relative pb-24">
            <div className="p-4 grid grid-cols-2 gap-3">
                <Card className="shadow-sm">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <PackageOpen className="w-6 h-6 text-primary mb-1" />
                        <span className="text-xl font-bold">0</span>
                        <span className="text-xs text-gray-500">Pedidos Hoy</span>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <DollarSign className="w-6 h-6 text-green-600 mb-1" />
                        <span className="text-xl font-bold text-green-700">S/ 0</span>
                        <span className="text-xs text-gray-500">Vendido</span>
                    </CardContent>
                </Card>
            </div>

            <div className="px-4 pb-2 font-bold text-gray-800 border-b border-gray-200 bg-white sticky top-0 z-10 flex items-center justify-between mt-2 pt-2">
                <h2>Ruta de Hoy</h2>
                <Badge variant="outline" className="text-xs font-normal">{clientes?.length || 0} clientes</Badge>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 bg-white">
                {isLoading ? (
                    <div className="p-8 text-center text-gray-500">Cargando clientes...</div>
                ) : clientes?.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No hay clientes asignados.</div>
                ) : (
                    clientes?.map((c) => (
                        <Link key={c.id} href={`/app-vendedor/pedido/${c.id}`} className="block">
                            <div className="p-4 flex items-start justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer">
                                <div className="flex flex-col">
                                    <span className="font-semibold text-gray-900">{c.razon_social}</span>
                                    <span className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                                        <MapPin className="w-3 h-3" /> Límite Cr: S/ {c.limite_credito}
                                    </span>
                                </div>
                                <div>
                                    <Badge variant="outline" className="text-gray-500 border-gray-300 capitalize">{c.estado}</Badge>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
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
