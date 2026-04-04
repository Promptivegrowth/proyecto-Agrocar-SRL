'use client';

import { useState } from 'react';
import {
    Search,
    Filter,
    FileDown,
    Printer,
    MoreHorizontal,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Calendar,
    Download,
    Eye
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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

export default function HistorialFacturacionPage() {
    const [searchTerm, setSearchTerm] = useState('');

    const { data: comprobantes, isLoading } = useQuery({
        queryKey: ['comprobantes-historial'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('comprobantes')
                .select('*, pedidos(numero), clientes(razon_social, numero_documento)')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            return data;
        }
    });

    const filteredDocs = comprobantes?.filter(doc =>
        doc.numero_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.razon_social_cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.num_doc_cliente.includes(searchTerm)
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'aceptado': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" /> Aceptado</Badge>;
            case 'rechazado': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100"><XCircle className="w-3 h-3 mr-1" /> Rechazado</Badge>;
            case 'pendiente': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendiente</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6 flex flex-col h-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900">Historial de Documentos</h1>
                    <p className="text-gray-500">Consulta y gestión de todos los comprobantes emitidos.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline"><Printer className="w-4 h-4 mr-2" /> Reporte Diario</Button>
                    <Button className="bg-primary hover:bg-primary/90 text-white font-bold shadow-lg">
                        <Download className="w-4 h-4 mr-2" /> Exportar TXT (PLE)
                    </Button>
                </div>
            </div>

            <Card className="flex-1 overflow-hidden flex flex-col shadow-sm">
                <CardHeader className="py-4 border-b bg-gray-50/50">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Buscar por número, cliente o RUC/DNI..."
                                className="h-9 pl-9 text-sm bg-white"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="h-9">
                                <Calendar className="w-4 h-4 mr-2 text-gray-400" /> Todo este mes
                            </Button>
                            <Button variant="outline" size="sm" className="h-9">
                                <Filter className="w-4 h-4 mr-2 text-gray-400" /> Filtros
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                            <TableRow>
                                <TableHead className="w-[120px]">Fecha</TableHead>
                                <TableHead className="w-[150px]">Número</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-center">Estado SUNAT</TableHead>
                                <TableHead className="text-center">Pago</TableHead>
                                <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-20 text-gray-400">Cargando historial...</TableCell>
                                </TableRow>
                            ) : filteredDocs?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-20 text-gray-400">No se encontraron documentos.</TableCell>
                                </TableRow>
                            ) : filteredDocs?.map((doc) => (
                                <TableRow key={doc.id} className="hover:bg-gray-50 transition-colors">
                                    <TableCell className="text-sm text-gray-600">
                                        {new Date(doc.fecha_emision).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="font-bold text-primary">
                                        {doc.numero_completo}
                                        <p className="text-[9px] text-gray-400 font-normal uppercase">Ref: {doc.pedidos?.numero || 'S/N'}</p>
                                    </TableCell>
                                    <TableCell>
                                        <p className="font-semibold text-gray-700 text-sm line-clamp-1">{doc.razon_social_cliente}</p>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-tighter">{doc.tipo_doc_cliente}: {doc.num_doc_cliente}</p>
                                    </TableCell>
                                    <TableCell className="text-right font-black text-gray-900">
                                        {doc.moneda} {doc.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {getStatusBadge(doc.sunat_estado)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={doc.estado_pago === 'pagado' ? 'default' : 'outline'} className={doc.estado_pago === 'pagado' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : 'text-gray-400'}>
                                            {doc.estado_pago.toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                <DropdownMenuItem className="cursor-pointer">
                                                    <Eye className="w-4 h-4 mr-2" /> Ver Detalle
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="cursor-pointer">
                                                    <Printer className="w-4 h-4 mr-2" /> Imprimir A4/Ticket
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="cursor-pointer text-blue-600">
                                                    <FileDown className="w-4 h-4 mr-2" /> Descargar XML
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="cursor-pointer text-red-600">
                                                    <AlertCircle className="w-4 h-4 mr-2" /> Anular Documento
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
