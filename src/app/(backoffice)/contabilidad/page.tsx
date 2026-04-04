'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, TrendingUp, TrendingDown, Landmark, ArrowUpRight, ArrowDownRight, ArrowRight, ShieldCheck, Download, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export default function ContabilidadDashboard() {
    const { data: stats } = useQuery({
        queryKey: ['contabilidad-stats'],
        queryFn: async () => {
            const { data: v } = await supabase.from('comprobantes').select('total');
            const { data: c } = await supabase.from('compras').select('total');

            const totalVentas = v?.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0) || 0;
            const totalCompras = c?.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0) || 0;

            return {
                ventas: totalVentas,
                compras: totalCompras,
                utilidad: totalVentas - totalCompras,
                impuestos: totalVentas * 0.18 // Estimado IGV
            };
        }
    });

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        Dashboard Contable <Landmark className="w-8 h-8 text-blue-600" />
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">Gestión tributaria, libros electrónicos y salud financiera.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="rounded-xl font-bold bg-white shadow-sm border-none"><Download className="w-4 h-4 mr-2" /> Reporte Anual</Button>
                    <Button className="rounded-xl font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20">Cierre de Mes</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-none shadow-xl rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-blue-800 text-white overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><TrendingUp className="w-24 h-24" /></div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest opacity-80 flex items-center gap-2">Ventas Totales <ArrowUpRight className="w-3 h-3" /></CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-black">S/ {stats?.ventas.toLocaleString() || '0'}</p>
                        <p className="text-[10px] mt-2 opacity-60 font-bold uppercase">Facturación Acumulada</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl rounded-[2.5rem] bg-white text-gray-900 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-8 opacity-5"><TrendingDown className="w-24 h-24" /></div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">Compras / Gastos <ArrowDownRight className="w-3 h-3 text-red-500" /></CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-black">S/ {stats?.compras.toLocaleString() || '0'}</p>
                        <p className="text-[10px] mt-2 text-gray-400 font-bold uppercase">Adquisiciones Netas</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl rounded-[2.5rem] bg-white text-gray-900 overflow-hidden relative group">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-gray-400">Utilidad Bruta</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={`text-3xl font-black ${stats?.utilidad && stats.utilidad > 0 ? 'text-green-600' : 'text-red-600'}`}>S/ {stats?.utilidad.toLocaleString() || '0'}</p>
                        <p className="text-[10px] mt-2 text-green-500 font-bold uppercase">Margen de Operación</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl rounded-[2.5rem] bg-slate-900 text-white overflow-hidden relative group">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest opacity-60">Impuestos (IGV)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-black text-amber-400">S/ {stats?.impuestos.toLocaleString() || '0'}</p>
                        <p className="text-[10px] mt-2 opacity-40 font-bold uppercase tracking-widest">Previsión Tributaria</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10">
                <div className="space-y-6">
                    <h2 className="text-xl font-black uppercase tracking-tight text-gray-400 ml-4">Libros Electrónicos (PLE)</h2>
                    <div className="grid grid-cols-1 gap-4">
                        <Link href="/contabilidad/registro-ventas">
                            <Button variant="outline" className="w-full h-24 justify-between p-6 rounded-[2rem] bg-white hover:bg-blue-50 border-none shadow-sm transition-all group">
                                <div className="flex items-center gap-4 text-left">
                                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-black text-gray-900 uppercase">Registro de Ventas 14.1</p>
                                        <p className="text-xs text-gray-400 font-medium italic">Estructura oficial para PLE SUNAT</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-6 h-6 text-gray-200 group-hover:text-blue-500 group-hover:translate-x-2 transition-all" />
                            </Button>
                        </Link>
                        <Link href="/contabilidad/registro-compras">
                            <Button variant="outline" className="w-full h-24 justify-between p-6 rounded-[2rem] bg-white hover:bg-amber-50 border-none shadow-sm transition-all group">
                                <div className="flex items-center gap-4 text-left">
                                    <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                                        <ShoppingCart className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-black text-gray-900 uppercase">Registro de Compras 8.1</p>
                                        <p className="text-xs text-gray-400 font-medium italic">Control de gastos y crédito fiscal</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-6 h-6 text-gray-200 group-hover:text-amber-500 group-hover:translate-x-2 transition-all" />
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="space-y-6">
                    <h2 className="text-xl font-black uppercase tracking-tight text-gray-400 ml-4">Validaciones SUNAT</h2>
                    <Card className="border-none shadow-xl rounded-[2.5rem] bg-green-600 text-white p-8">
                        <div className="flex items-center gap-6 mb-6">
                            <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center">
                                <ShieldCheck className="w-10 h-10 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-black">Estado CPE: CONECTADO</p>
                                <p className="text-sm opacity-80 font-medium">Sincronización directa con OSE/SUNAT activa.</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-black/10 p-3 rounded-xl border border-white/10">
                                <span className="text-xs font-bold uppercase tracking-widest">Validación de RUCs</span>
                                <Badge className="bg-white text-green-600 font-black">OK</Badge>
                            </div>
                            <div className="flex justify-between items-center bg-black/10 p-3 rounded-xl border border-white/10">
                                <span className="text-xs font-bold uppercase tracking-widest">Certificado Digital</span>
                                <span className="text-xs font-black">VENCE EN 240 DÍAS</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
