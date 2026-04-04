'use client';

import { useState } from 'react';
import {
    History,
    Search,
    Filter,
    Download,
    Eye,
    Calendar,
    User,
    CreditCard,
    MoreHorizontal,
    ArrowUpDown,
    CheckCircle2,
    Clock,
    AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export default function HistorialPagosPage() {
    const [searchTerm, setSearchTerm] = useState('');

    const { data: pagos, isLoading } = useQuery({
        queryKey: ['historial-pagos'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pagos')
                .select('*, clientes(razon_social), usuarios:usuario_cobrador_id(nombres, apellidos), comprobantes(serie, correlativo)')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    const filteredPagos = pagos?.filter(p =>
        p.clientes?.razon_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.metodo_pago?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Historial de Cobranzas</h1>
                    <p className="text-gray-500 font-medium">Registro detallado de todos los ingresos a caja.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="border-2 font-bold h-11 px-6 rounded-xl">
                        <Download className="w-4 h-4 mr-2" /> Exportar EXC
                    </Button>
                </div>
            </div>

            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-white border-b py-4">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Buscar por cliente o método..."
                                className="pl-10 h-11 bg-gray-50 border-none rounded-xl"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="font-bold text-xs uppercase tracking-widest text-gray-400">
                                <Filter className="w-3 h-3 mr-1" /> Filtros Avanzados
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-gray-50/50 uppercase text-[10px] font-black tracking-widest text-gray-400">
                            <TableRow>
                                <TableHead>Fecha / Hora</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Referencia</TableHead>
                                <TableHead>Método</TableHead>
                                <TableHead>Cobrador</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                                <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 animate-pulse font-bold text-gray-300">Cargando historial...</TableCell>
                                </TableRow>
                            ) : filteredPagos?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-gray-400 italic font-medium">No se encontraron registros de cobranza.</TableCell>
                                </TableRow>
                            ) : filteredPagos?.map((p: any) => (
                                <TableRow key={p.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <TableCell className="text-[11px] font-bold text-gray-400">
                                        <div className="flex flex-col">
                                            <span>{new Date(p.created_at).toLocaleDateString()}</span>
                                            <span className="text-[9px]">{new Date(p.created_at).toLocaleTimeString()}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-black text-xs text-gray-800 uppercase tracking-tight">
                                        {p.clientes?.razon_social}
                                    </TableCell>
                                    <TableCell className="text-[11px] font-medium text-gray-500">
                                        {p.comprobantes ? `${p.comprobantes.serie}-${p.comprobantes.correlativo}` : 'S/R'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`text-[9px] font-black uppercase ${p.metodo_pago === 'efectivo' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                            {p.metodo_pago}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-[11px] font-bold text-gray-500 uppercase">
                                        {p.usuarios?.nombres} {p.usuarios?.apellidos?.charAt(0)}.
                                    </TableCell>
                                    <TableCell className="text-right font-black text-gray-900 text-sm">
                                        S/ {Number(p.monto).toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 rounded-xl font-bold">
                                                <DropdownMenuLabel className="text-[10px] uppercase text-gray-400">Acciones del Pago</DropdownMenuLabel>
                                                <DropdownMenuItem className="text-xs uppercase flex items-center gap-2">
                                                    <Eye className="w-3 h-3" /> Ver Detalle
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-xs uppercase flex items-center gap-2">
                                                    <Download className="w-3 h-3" /> Descargar Voucher
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-xs uppercase text-red-600 focus:text-red-700 flex items-center gap-2">
                                                    <AlertCircle className="w-3 h-3" /> Anular Pago
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
