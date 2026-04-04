'use client';

import { useState } from 'react';
import {
    Truck,
    Search,
    Plus,
    FileText,
    Printer,
    ChevronRight,
    AlertCircle,
    CheckCircle2,
    Clock
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function GuiasRemisionPage() {
    const [searchTerm, setSearchTerm] = useState('');

    const { data: guias, isLoading } = useQuery({
        queryKey: ['guias-remision'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('comprobantes')
                .select('*, clientes(razon_social, numero_documento)')
                .eq('tipo', '09')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        }
    });

    const filteredGuias = guias?.filter(g =>
        g.numero_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.razon_social_cliente?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <Truck className="w-10 h-10 text-primary" /> Guías de Remisión
                    </h1>
                    <p className="text-gray-500 mt-2 text-lg">Traslado de bienes y control de despachos (Remitente).</p>
                </div>
                <Button className="bg-primary hover:bg-primary/90 h-12 px-6 rounded-xl font-bold shadow-lg shadow-primary/20">
                    <Plus className="w-5 h-5 mr-2" /> Nueva Guía
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-none shadow-sm bg-blue-50/50">
                    <CardContent className="p-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Pendientes</p>
                        <p className="text-3xl font-black text-blue-900">12</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-green-50/50">
                    <CardContent className="p-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-1">Entregadas</p>
                        <p className="text-3xl font-black text-green-900">450</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-amber-50/50">
                    <CardContent className="p-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">En Ruta</p>
                        <p className="text-3xl font-black text-amber-900">5</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-white border-b py-4">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">Historial de Guías</CardTitle>
                        <div className="relative w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Buscar por número o cliente..."
                                className="pl-10 h-10 bg-slate-50 border-none rounded-xl"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow>
                                <TableHead className="font-bold">Número</TableHead>
                                <TableHead className="font-bold">Cliente</TableHead>
                                <TableHead className="font-bold">Fecha</TableHead>
                                <TableHead className="font-bold">Estado SUNAT</TableHead>
                                <TableHead className="text-right font-bold pr-6">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-20 text-gray-400">Sincronizando guías...</TableCell>
                                </TableRow>
                            ) : filteredGuias?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-20 text-gray-400">
                                        <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-10" />
                                        No se encontraron guías emitidas.
                                    </TableCell>
                                </TableRow>
                            ) : filteredGuias?.map((g) => (
                                <TableRow key={g.id} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="font-black text-gray-700">{g.numero_completo}</TableCell>
                                    <TableCell>
                                        <p className="font-bold text-gray-900">{g.razon_social_cliente}</p>
                                        <p className="text-[10px] text-gray-400 uppercase">{g.num_doc_cliente}</p>
                                    </TableCell>
                                    <TableCell className="text-gray-600">{new Date(g.fecha_emision).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <Badge className={`uppercase text-[9px] font-black ${g.sunat_estado === 'aceptado' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {g.sunat_estado || 'PENDIENTE'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-6 space-x-2">
                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Printer className="w-4 h-4" /></Button>
                                        <Button size="sm" variant="ghost" className="h-8 px-3 text-primary font-bold">Ver Detalle <ChevronRight className="w-4 h-4 ml-1" /></Button>
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
