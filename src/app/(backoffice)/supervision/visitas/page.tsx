'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Calendar, MapPin, CheckCircle2, Clock, User, Building2, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';

export default function VisitasPage() {
    const { data: visitas, isLoading } = useQuery({
        queryKey: ['visitas_gps'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('visitas_gps')
                .select(`
                    *,
                    usuarios:vendedor_id(nombres),
                    clientes(razon_social)
                `)
                .order('hora_checkin', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    const formatDuration = (start: string, end: string | null) => {
        if (!end) return 'En curso...';
        const d1 = new Date(start);
        const d2 = new Date(end);
        const diffMs = d2.getTime() - d1.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 60) return `${diffMins} min`;
        return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
    };

    const exportarExcel = () => {
        if (!visitas || visitas.length === 0) return;
        const data = visitas.map(v => ({
            Fecha: v.fecha,
            Vendedor: v.usuarios?.nombres,
            Cliente: v.clientes?.razon_social,
            CheckIn: v.hora_checkin ? format(new Date(v.hora_checkin), 'HH:mm:ss') : '-',
            CheckOut: v.hora_checkout ? format(new Date(v.hora_checkout), 'HH:mm:ss') : '-',
            Duracion: formatDuration(v.hora_checkin, v.hora_checkout),
            Resultado: v.resultado || 'pendiente',
            Observaciones: v.observaciones || ''
        }));
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Visitas");
        XLSX.writeFile(workbook, `Reporte_Visitas_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                    Visitas de Vendedores
                    <Badge variant="outline" className="text-sm bg-blue-50 text-blue-700 border-blue-200">En Tiempo Real</Badge>
                </h1>
                <Button onClick={exportarExcel} variant="outline" className="font-bold gap-2">
                    <Download className="w-4 h-4" /> Exportar Reporte
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-50 border-none shadow-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                            <CheckCircle2 className="w-3 h-3" /> Total Visitas Hoy
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-black text-slate-900">
                            {visitas?.filter(v => v.fecha === new Date().toISOString().split('T')[0]).length || 0}
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-green-50 border-none shadow-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase text-green-600 tracking-widest flex items-center gap-2">
                            <MapPin className="w-3 h-3" /> Clientes Visitados
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-black text-green-700">
                            {new Set(visitas?.map(v => v.cliente_id)).size || 0}
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-amber-50 border-none shadow-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase text-amber-600 tracking-widest flex items-center gap-2">
                            <Clock className="w-3 h-3" /> Visitas Activas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-black text-amber-700">
                            {visitas?.filter(v => !v.hora_checkout).length || 0}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50/80">
                        <TableRow>
                            <TableHead className="font-bold uppercase text-[10px] tracking-wider text-gray-500">Fecha / Hora</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] tracking-wider text-gray-500">Vendedor</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] tracking-wider text-gray-500">Cliente</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] tracking-wider text-gray-500">Duración</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] tracking-wider text-gray-500">Resultado</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] tracking-wider text-gray-500">Observaciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-12 text-gray-400">Cargando historial de visitas...</TableCell></TableRow>
                        ) : visitas?.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-12 text-gray-400">No se registran visitas aún.</TableCell></TableRow>
                        ) : (
                            visitas?.map((v) => (
                                <TableRow key={v.id} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-900">{format(new Date(v.hora_checkin), 'dd MMM, yyyy', { locale: es })}</span>
                                            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">
                                                {format(new Date(v.hora_checkin), 'HH:mm')} - {v.hora_checkout ? format(new Date(v.hora_checkout), 'HH:mm') : '...'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-700">
                                                <User className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="font-bold text-sm text-gray-700 capitalize">{v.usuarios?.nombres || 'Desconocido'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                            <span className="font-medium text-sm text-gray-900">{v.clientes?.razon_social || 'Prospecto Nuevo'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className={`font-black text-[10px] uppercase border-none ${v.hora_checkout ? 'bg-slate-100' : 'bg-amber-100 text-amber-700 animate-pulse'}`}>
                                            {formatDuration(v.hora_checkin, v.hora_checkout)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {v.resultado ? (
                                            <Badge className={`uppercase text-[9px] font-black tracking-widest ${v.resultado === 'venta' ? 'bg-green-500' :
                                                v.resultado === 'cobranza' ? 'bg-blue-500' :
                                                    'bg-slate-500'
                                                }`}>
                                                {v.resultado}
                                            </Badge>
                                        ) : (
                                            <span className="text-xs text-gray-300 font-bold italic lowercase">pendiente</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate">
                                        <span className="text-xs text-gray-600 font-medium">{v.observaciones || '-'}</span>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
