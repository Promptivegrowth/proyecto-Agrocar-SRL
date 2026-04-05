'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
    Receipt, Search, Calendar, User, Printer, Eye,
    FileText, ArrowDownToLine, Filter, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ReciboPagoModal } from '@/components/ReciboPagoModal';

export default function RecibosCajaPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRecibo, setSelectedRecibo] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { data: recibos, isLoading } = useQuery({
        queryKey: ['recibos-caja'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('comprobantes')
                .select('*')
                .eq('tipo', 'RC')
                .order('fecha_emision', { ascending: false })
                .order('correlativo', { ascending: false });

            if (error) throw error;
            return data;
        }
    });

    const filteredRecibos = recibos?.filter(r =>
        r.numero_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.razon_social_cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.num_doc_cliente?.includes(searchTerm)
    );

    const handleVerRecibo = (recibo: any) => {
        // En un entorno real, buscaríamos el pago asociado para tener el método de pago real
        // Aquí construimos el objeto para el modal
        const mockPago = {
            numero_recibo: recibo.numero_completo,
            fecha: recibo.fecha_emision,
            cliente_razon_social: recibo.razon_social_cliente,
            cliente_doc: recibo.num_doc_cliente,
            monto: recibo.total,
            metodo_pago: 'TRANSFERENCIA/EFECTIVO', // Genérico para histórico
            referencia: recibo.direccion_cliente?.replace('COBRANZA DE DOCUMENTO: ', ''),
            comprobante_afectado: recibo.direccion_cliente?.replace('COBRANZA DE DOCUMENTO: ', ''),
            moneda: recibo.moneda,
            monto_letras: `SON: ${recibo.total.toFixed(2)} CON 00/100 SOLES`
        };
        setSelectedRecibo(mockPago);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-xl">
                            <Receipt className="w-8 h-8 text-primary" />
                        </div>
                        Recibos de Caja
                    </h1>
                    <p className="text-slate-500 font-medium">Gestión y control de comprobantes de ingreso por cobranzas</p>
                </div>
            </div>

            {/* Stats/Quick Info (Optional) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all duration-300">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Emitidos</p>
                                <p className="text-3xl font-black text-slate-900 tracking-tighter">{recibos?.length || 0}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-2xl group-hover:bg-primary/10 transition-colors">
                                <FileText className="w-6 h-6 text-slate-400 group-hover:text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters and Table */}
            <Card className="border-none shadow-xl bg-white overflow-hidden">
                <CardHeader className="border-b bg-slate-50/50 p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Buscar por Nro Recibo, Cliente o RUC..."
                                className="pl-10 h-11 border-slate-200 bg-white shadow-sm focus:ring-primary/20"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" className="h-11 font-bold border-slate-200 shadow-sm">
                                <Filter className="w-4 h-4 mr-2 text-slate-400" /> Filtros Avanzados
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/50 border-b hover:bg-transparent">
                                    <TableHead className="py-4 font-black uppercase text-[10px] tracking-widest text-slate-400 pl-6 w-[180px]">Número</TableHead>
                                    <TableHead className="py-4 font-black uppercase text-[10px] tracking-widest text-slate-400">Fecha</TableHead>
                                    <TableHead className="py-4 font-black uppercase text-[10px] tracking-widest text-slate-400">Cliente</TableHead>
                                    <TableHead className="py-4 font-black uppercase text-[10px] tracking-widest text-slate-400">Concepto / Ref</TableHead>
                                    <TableHead className="py-4 font-black uppercase text-[10px] tracking-widest text-slate-400 text-right">Total</TableHead>
                                    <TableHead className="py-4 font-black uppercase text-[10px] tracking-widest text-slate-400 text-center pr-6">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i} className="animate-pulse">
                                            <TableCell className="py-6"><div className="h-4 bg-slate-100 rounded w-24"></div></TableCell>
                                            <TableCell><div className="h-4 bg-slate-100 rounded w-20"></div></TableCell>
                                            <TableCell><div className="h-4 bg-slate-100 rounded w-48"></div></TableCell>
                                            <TableCell><div className="h-4 bg-slate-100 rounded w-32"></div></TableCell>
                                            <TableCell><div className="h-4 bg-slate-100 rounded w-16 float-right"></div></TableCell>
                                            <TableCell><div className="h-8 bg-slate-100 rounded w-24 mx-auto"></div></TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredRecibos?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-12 text-center text-slate-400 font-medium italic">
                                            No se encontraron recibos que coincidan con la búsqueda
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredRecibos?.map((recibo) => (
                                        <TableRow key={recibo.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <TableCell className="py-5 pl-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-primary/5 p-2 rounded-lg group-hover:bg-primary/10 transition-colors">
                                                        <Receipt className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <span className="font-black text-slate-900 tracking-tight">{recibo.numero_completo}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-bold text-slate-600">
                                                {new Date(recibo.fecha_emision).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-0.5">
                                                    <p className="font-black text-slate-900 uppercase text-xs tracking-tight">{recibo.razon_social_cliente}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{recibo.num_doc_cliente}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs font-semibold text-slate-500 italic max-w-[200px] truncate">
                                                {recibo.direccion_cliente}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <p className="font-black text-slate-900 tracking-tighter">
                                                    {recibo.moneda} {recibo.total.toFixed(2)}
                                                </p>
                                            </TableCell>
                                            <TableCell className="text-center pr-6">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleVerRecibo(recibo)}
                                                        className="h-9 border-slate-200 hover:bg-slate-100 font-black text-[11px] uppercase tracking-wider"
                                                    >
                                                        <Eye className="w-3.5 h-3.5 mr-1.5 text-primary" /> Ver e Imprimir
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <ReciboPagoModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                pago={selectedRecibo}
            />
        </div>
    );
}
