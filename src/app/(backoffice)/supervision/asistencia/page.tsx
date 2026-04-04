'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Timer, ArrowUpRight, Flag, MapPin, User, LogIn, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AsistenciaPage() {
    const { data: asistencias, isLoading } = useQuery({
        queryKey: ['asistencia-vendedores'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tracking_gps')
                .select('*, usuarios(nombre_completo)')
                .in('velocidad', [-1, -2])
                .order('hora', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    const { data: visitasActivas } = useQuery({
        queryKey: ['visitas-activas-now'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('visitas_gps')
                .select('*, usuarios(nombre_completo), clientes(razon_social)')
                .is('hora_checkout', null);
            if (error) throw error;
            return data;
        }
    });

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                    Control de Asistencia y Visitas <Timer className="w-8 h-8 text-blue-600" />
                </h1>
                <p className="text-gray-500 font-medium">Registro de ingresos, salidas y actividad en tiempo real.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-xl rounded-[2.5rem] bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase text-gray-400">Vendedores en Ruta (Activos)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-black text-blue-600">{visitasActivas?.length || 0}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                            <span className="text-[10px] font-bold text-green-600 uppercase">Monitoreo GPS Activo</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
                    <CardHeader className="bg-slate-900 text-white p-6">
                        <CardTitle className="text-lg font-black uppercase italic flex items-center gap-2">
                            <Badge className="bg-blue-500 text-white border-none">LIVE</Badge> Visitas Iniciadas (En Curso)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-black text-[10px] uppercase">Vendedor</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase">Cliente</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase">H. Inicio</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visitasActivas?.map((v: any) => (
                                    <TableRow key={v.id} className="hover:bg-blue-50/50 transition-colors">
                                        <TableCell className="font-bold flex items-center gap-2 text-sm">
                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600"><User className="w-4 h-4" /></div>
                                            {v.usuarios?.nombre_completo}
                                        </TableCell>
                                        <TableCell className="font-medium text-gray-500 text-xs truncate max-w-[150px]">{v.clientes?.razon_social}</TableCell>
                                        <TableCell className="font-black text-xs text-blue-600">
                                            {format(new Date(v.hora_checkin), 'HH:mm')}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-[9px] font-black uppercase text-blue-500 border-blue-200">En Visita</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(!visitasActivas || visitasActivas.length === 0) && (
                                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-300 font-bold uppercase text-[10px]">Sin visitas activas</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
                    <CardHeader className="p-6">
                        <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                            Registro de Asistencia (Ingreso/Salida)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-black text-[10px] uppercase text-center w-12">Hito</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase">Vendedor</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase">Fecha y Hora</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {asistencias?.map((a: any) => (
                                    <TableRow key={a.id}>
                                        <TableCell className="text-center">
                                            {a.velocidad === -1 ? <LogIn className="w-4 h-4 text-green-500 mx-auto" /> : <LogOut className="w-4 h-4 text-red-500 mx-auto" />}
                                        </TableCell>
                                        <TableCell className="font-bold text-sm">{a.usuarios?.nombre_completo}</TableCell>
                                        <TableCell className="text-[11px] font-medium text-gray-400 uppercase">
                                            {format(new Date(a.hora), "dd MMM, HH:mm", { locale: es })}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`font-black text-[9px] uppercase ${a.velocidad === -1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {a.velocidad === -1 ? 'INGRESO' : 'SALIDA'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
