'use client';
import { useState, useEffect } from 'react';
import { ArrowLeft, Save, FileCheck, Minus, Plus as PlusIcon, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export default function MobilePedidoPage({ params }: { params: { clienteId: string } }) {
    const [gpsData, setGpsData] = useState<{ lat: number, lng: number } | null>(null);

    // Mocking Check-In when component loads
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                setGpsData({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                // En un caso real: supabase.from('visitas_gps').insert(...)
            });
        }
    }, []);

    return (
        <div className="flex-1 bg-gray-50 flex flex-col h-[calc(100vh-60px)]">
            <div className="bg-white px-4 py-3 border-b flex items-center justify-between sticky top-0 z-20 shadow-sm shrink-0">
                <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8" asChild>
                    <Link href="/app-vendedor"><ArrowLeft className="w-5 h-5 text-gray-700" /></Link>
                </Button>
                <span className="font-semibold grow text-center text-sm truncate mr-6">Bodega La Esquina</span>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="bg-red-50 p-3 border-b border-red-100 flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="flex flex-col text-sm text-red-800">
                        <strong>⚠️ CLIENTE CON DEUDA VENCIDA</strong>
                        <span>Generar un pedido requiere autorización gerencial obligatoria para este cliente. Deuda: S/ 450.00</span>
                    </div>
                </div>

                <div className="p-4 space-y-4">
                    <Card>
                        <CardContent className="p-4 flex justify-between items-center bg-gray-100/50">
                            <span className="text-sm font-medium">Buscador de Productos</span>
                            <Button size="sm" variant="secondary">Catálogo</Button>
                        </CardContent>
                    </Card>

                    <h3 className="font-semibold text-gray-800 mt-4">Carrito de Productos</h3>
                    <div className="space-y-3">
                        <Card className="shadow-sm">
                            <CardContent className="p-3">
                                <div className="flex justify-between font-medium text-gray-900 mb-2">
                                    <span>Jamón del País B/N</span>
                                    <span>S/ 42.50</span>
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                                    <span className="text-sm text-gray-500">2.500 KG a S/17.00/kg</span>
                                    <div className="flex items-center gap-3">
                                        <Button variant="outline" size="icon" className="w-7 h-7 rounded-full"><Minus className="w-3 h-3" /></Button>
                                        <span className="w-8 text-center text-sm font-semibold">2.5</span>
                                        <Button variant="outline" size="icon" className="w-7 h-7 rounded-full"><PlusIcon className="w-3 h-3" /></Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm">
                            <CardContent className="p-3">
                                <div className="flex justify-between font-medium text-gray-900 mb-2">
                                    <span>Salchicha Viena</span>
                                    <span>S/ 18.00</span>
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                                    <span className="text-sm text-gray-500">2.000 KG a S/9.00/kg</span>
                                    <div className="flex items-center gap-3">
                                        <Button variant="outline" size="icon" className="w-7 h-7 rounded-full"><Minus className="w-3 h-3" /></Button>
                                        <span className="w-8 text-center text-sm font-semibold">2.0</span>
                                        <Button variant="outline" size="icon" className="w-7 h-7 rounded-full bg-gray-100"><PlusIcon className="w-3 h-3" /></Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>

            <div className="bg-white border-t border-gray-200 p-4 shrink-0 pb-safe">
                <div className="flex justify-between items-center mb-4 text-lg font-bold">
                    <span>Total a Pagar</span>
                    <span className="text-primary text-xl">S/ 60.50</span>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 border-gray-300">
                        <Save className="w-4 h-4 mr-2 text-gray-500" /> Borrador
                    </Button>
                    <Button className="flex-[2] bg-primary hover:bg-primary/90">
                        <FileCheck className="w-4 h-4 mr-2" /> Confirmar Pedido
                    </Button>
                </div>
                {gpsData && (
                    <div className="text-[10px] text-center text-gray-400 mt-2">
                        📍 Check-in registrado: {gpsData.lat.toFixed(4)}, {gpsData.lng.toFixed(4)}
                    </div>
                )}
            </div>

        </div>
    );
}
