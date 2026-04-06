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
    Eye,
    RefreshCcw,
    ShieldCheck,
    ChevronDown,
    RotateCcw
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem
} from '@/components/ui/dropdown-menu';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ComprobanteDetalleModal } from '@/components/ComprobanteDetalleModal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

export default function HistorialFacturacionPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDoc, setSelectedDoc] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Filtros
    const [filterMonthOnly, setFilterMonthOnly] = useState(true);
    const [statusFilter, setStatusFilter] = useState('todos');
    const [typeFilter, setTypeFilter] = useState('todos');

    const { data: comprobantes, isLoading } = useQuery({
        queryKey: ['comprobantes-historial'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('comprobantes')
                .select('*, pedidos(numero), clientes(razon_social, numero_documento, direccion, distrito)')
                .order('fecha_emision', { ascending: false })
                .limit(500); // Aumentado para permitir mejor filtrado en cliente

            if (error) throw error;
            return data;
        }
    });

    const filteredDocs = comprobantes?.filter((doc: any) => {
        // 1. Buscador (Search)
        const matchesSearch =
            doc.numero_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.razon_social_cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.num_doc_cliente?.includes(searchTerm);

        if (!matchesSearch) return false;

        // 2. Filtro de Mes ("Todo este mes")
        if (filterMonthOnly) {
            const docDate = new Date(doc.fecha_emision);
            const now = new Date();
            // Comparamos mes y año (usamos UTC para evitar desfases de zona horaria en fechas de solo día)
            const dMonth = docDate.getUTCMonth();
            const dYear = docDate.getUTCFullYear();
            const nMonth = now.getUTCMonth();
            const nYear = now.getUTCFullYear();

            if (dMonth !== nMonth || dYear !== nYear) return false;
        }

        // 3. Filtro de Estado SUNAT
        if (statusFilter !== 'todos' && doc.sunat_estado !== statusFilter) {
            return false;
        }

        // 4. Filtro de Tipo (Factura/Boleta)
        if (typeFilter !== 'todos') {
            const isFactura = doc.numero_completo.startsWith('F');
            if (typeFilter === 'factura' && !isFactura) return false;
            if (typeFilter === 'boleta' && isFactura) return false;
        }

        return true;
    });

    const handleViewDetail = async (doc: any) => {
        if (!doc.items || doc.items.length === 0) {
            const { data: items } = await supabase
                .from('comprobante_items')
                .select('*')
                .eq('comprobante_id', doc.id);
            doc.items = items || [];
        }
        setSelectedDoc(doc);
        setIsModalOpen(true);
    };

    const handleDailyReport = () => {
        const today = new Date().toISOString().split('T')[0];
        const todayDocs = filteredDocs?.filter((d: any) => d.fecha_emision === today) || [];

        if (todayDocs.length === 0) {
            toast.error("No hay ventas registradas el día de hoy.");
            return;
        }

        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text("REPORTE DIARIO DE VENTAS - AGROCAR SRL", 105, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Fecha del Reporte: ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' });

        const tableData = todayDocs.map((d: any) => [
            d.numero_completo,
            d.razon_social_cliente,
            d.moneda,
            d.total.toFixed(2),
            d.sunat_estado.toUpperCase()
        ]);

        autoTable(doc, {
            head: [['Número', 'Cliente', 'Moneda', 'Total', 'Estado SUNAT']],
            body: tableData,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] }
        });

        const finalY = (doc as any).lastAutoTable.finalY || 50;
        const total = todayDocs.reduce((acc: number, d: any) => acc + d.total, 0);
        doc.setFontSize(12);
        doc.text(`TOTAL DEL DÍA: S/. ${total.toFixed(2)}`, 140, finalY + 15);

        doc.save(`Reporte_Diario_${today}.pdf`);
        toast.success("Reporte generado con éxito.");
    };

    const handleExportPLE = async () => {
        if (!filteredDocs || filteredDocs.length === 0) {
            toast.error("No hay documentos para exportar.");
            return;
        }

        toast.info("Generando archivo PLE 14.1...");
        const period = new Date().toISOString().substring(0, 7).replace('-', '') + '00';
        let content = '';

        filteredDocs.forEach((c: any, idx: number) => {
            const cuo = `M${String(idx + 1).padStart(5, '0')}`;
            const date = new Date(c.fecha_emision).toLocaleDateString('es-PE');
            const type = c.tipo === 'factura' || c.numero_completo.startsWith('F') ? '01' : '03';
            const [serie, numero] = c.numero_completo.split('-');
            const docType = c.num_doc_cliente?.length === 11 ? '6' : '1';

            const fields = [
                period, cuo, 'M0001', date, '', type, serie.padStart(4, '0'),
                numero.padStart(8, '0'), '', docType, c.num_doc_cliente,
                c.razon_social_cliente, c.total ? (c.total / 1.18).toFixed(2) : '0.00',
                '', (c.total - (c.total / 1.18)).toFixed(2), '', '', '', '', '', '', '', '',
                c.total.toFixed(2), 'PEN', '1.000', '', '', '', '', '1', ''
            ];
            content += fields.join('|') + '|\n';
        });

        const filename = `LE20123456789${period}140100001111.txt`;
        const blob = new Blob([content], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        toast.success("PLE 14.1 descargado.");
    };

    const getStatusBadge = (status: string, doc: any) => {
        const handleClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            handleViewDetail(doc);
        };

        switch (status) {
            case 'aceptado': return <Badge onClick={handleClick} className="bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer transition-colors"><CheckCircle2 className="w-3 h-3 mr-1" /> Aceptado</Badge>;
            case 'rechazado': return <Badge onClick={handleClick} className="bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer transition-colors"><XCircle className="w-3 h-3 mr-1" /> Rechazado</Badge>;
            case 'pendiente': return <Badge onClick={handleClick} variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 cursor-pointer transition-colors">Pendiente</Badge>;
            default: return <Badge onClick={handleClick} variant="secondary" className="cursor-pointer">{status}</Badge>;
        }
    };

    const resetFilters = () => {
        setStatusFilter('todos');
        setTypeFilter('todos');
        setFilterMonthOnly(true);
        setSearchTerm('');
        toast.info("Filtros restablecidos");
    };

    return (
        <div className="space-y-6 flex flex-col h-full p-4 md:p-8 bg-gray-50/30">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase underline decoration-primary decoration-4 underline-offset-8">Historial de Documentos</h1>
                    <div className="flex items-center gap-2 text-slate-500 mt-5 font-bold bg-white w-fit px-4 py-1.5 rounded-full shadow-sm border border-slate-100 hover:border-primary/20 transition-colors">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <p className="text-[10px] uppercase tracking-widest">Sincronizado con SUNAT (Facturación Propia)</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={handleDailyReport} className="shadow-sm border-2 font-bold h-12 px-6 rounded-2xl hover:bg-white transition-all hover:border-slate-300">
                        <Printer className="w-4 h-4 mr-2 text-primary" /> Reporte Diario
                    </Button>
                    <Button onClick={handleExportPLE} className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest shadow-xl h-12 px-8 rounded-2xl transition-all hover:scale-105 active:scale-95 group">
                        <Download className="w-4 h-4 mr-2 group-hover:animate-bounce" /> Exportar TXT (PLE)
                    </Button>
                </div>
            </div>

            <Card className="flex-1 overflow-hidden flex flex-col shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border-slate-200 border-2 rounded-[2.5rem] bg-white/80 backdrop-blur-md">
                <CardHeader className="py-8 border-b bg-slate-50/50">
                    <div className="flex flex-col md:flex-row justify-between gap-6 px-4">
                        <div className="relative w-full md:w-[500px]">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                            <Input
                                placeholder="Buscar por número, cliente o RUC/DNI..."
                                className="h-14 pl-14 text-sm bg-white border-2 border-slate-100 focus:border-primary focus:ring-0 transition-all rounded-[1.5rem] shadow-sm font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant={filterMonthOnly ? "default" : "outline"}
                                onClick={() => setFilterMonthOnly(!filterMonthOnly)}
                                className={`h-14 px-8 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest border-2 transition-all shadow-sm ${filterMonthOnly
                                    ? 'bg-primary text-white border-primary shadow-primary/20 scale-105'
                                    : 'text-slate-500 border-slate-100 hover:bg-white'
                                    }`}
                            >
                                <Calendar className={`w-4 h-4 mr-3 ${filterMonthOnly ? 'text-white' : 'text-primary'}`} />
                                {filterMonthOnly ? 'Solo este mes' : 'Todo el tiempo'}
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger className={`h-14 px-8 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest border-2 hover:bg-white transition-all shadow-sm flex items-center justify-center ${(statusFilter !== 'todos' || typeFilter !== 'todos') ? 'border-primary/50 bg-primary/5' : 'text-slate-500 border-slate-100'
                                    }`}>
                                    <Filter className="w-4 h-4 mr-3 text-primary" /> Filtros Avanzados
                                    <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-72 p-5 rounded-[2rem] shadow-2xl border-2 border-slate-100 bg-white/95 backdrop-blur-xl">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 px-2 py-2 tracking-[0.2em] flex justify-between items-center">
                                            Criterios de Búsqueda
                                            {(statusFilter !== 'todos' || typeFilter !== 'todos') && (
                                                <Button variant="ghost" size="sm" onClick={resetFilters} className="h-6 px-2 text-[8px] text-red-500 hover:text-red-700 hover:bg-red-50">
                                                    <RotateCcw className="w-2 h-2 mr-1" /> Reset
                                                </Button>
                                            )}
                                        </DropdownMenuLabel>
                                    </DropdownMenuGroup>

                                    <DropdownMenuSeparator className="my-3 h-0.5 bg-slate-50" />

                                    <div className="space-y-4 pt-2">
                                        <div className="px-2">
                                            <p className="text-[9px] font-black uppercase text-slate-400 mb-3 tracking-widest">Estado de Documento</p>
                                            <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                                                <DropdownMenuRadioItem value="todos" className="text-[11px] font-bold uppercase rounded-xl h-10">Todos los Estados</DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="aceptado" className="text-[11px] font-bold uppercase rounded-xl h-10 text-green-600">Aceptados</DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="pendiente" className="text-[11px] font-bold uppercase rounded-xl h-10 text-yellow-600">Pendientes</DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="rechazado" className="text-[11px] font-bold uppercase rounded-xl h-10 text-red-600">Rechazados</DropdownMenuRadioItem>
                                            </DropdownMenuRadioGroup>
                                        </div>

                                        <div className="px-2">
                                            <p className="text-[9px] font-black uppercase text-slate-400 mb-3 tracking-widest">Tipo de Documento</p>
                                            <DropdownMenuRadioGroup value={typeFilter} onValueChange={setTypeFilter}>
                                                <DropdownMenuRadioItem value="todos" className="text-[11px] font-bold uppercase rounded-xl h-10">Cualquier tipo</DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="factura" className="text-[11px] font-bold uppercase rounded-xl h-10">Facturas</DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="boleta" className="text-[11px] font-bold uppercase rounded-xl h-10">Boletas</DropdownMenuRadioItem>
                                            </DropdownMenuRadioGroup>
                                        </div>
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 bg-white/95 backdrop-blur-2xl z-20 border-b-2 shadow-sm">
                            <TableRow className="hover:bg-transparent border-none">
                                <TableHead className="w-[140px] font-black uppercase text-[10px] tracking-widest text-slate-400 pl-12 py-6 text-center">Fecha Emisión</TableHead>
                                <TableHead className="w-[200px] font-black uppercase text-[10px] tracking-widest text-slate-400">Número Correlativo</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Razón Social del Cliente</TableHead>
                                <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-slate-400 pr-10">Monto Total</TableHead>
                                <TableHead className="text-center font-black uppercase text-[10px] tracking-widest text-slate-400">SUNAT</TableHead>
                                <TableHead className="text-center font-black uppercase text-[10px] tracking-widest text-slate-400">Pago</TableHead>
                                <TableHead className="w-[100px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-48">
                                        <div className="flex flex-col items-center gap-6">
                                            <div className="relative">
                                                <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                                                <RefreshCcw className="w-6 h-6 text-primary/30 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Sincronizando registros</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase italic">Conexión directa con Agrocars Cloud...</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredDocs?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-48">
                                        <div className="bg-slate-50 w-28 h-28 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border-2 border-dashed border-slate-200">
                                            <AlertCircle className="w-12 h-12 text-slate-200" />
                                        </div>
                                        <p className="text-sm font-black text-slate-300 uppercase tracking-widest italic">No se han encontrado resultados para los filtros seleccionados</p>
                                        <Button variant="ghost" onClick={resetFilters} className="mt-4 text-xs font-bold uppercase tracking-widest text-primary hover:bg-primary/5">Limpiar filtros</Button>
                                    </TableCell>
                                </TableRow>
                            ) : filteredDocs?.map((doc: any) => (
                                <TableRow key={doc.id} className="hover:bg-slate-50/50 transition-all group border-b border-slate-50/50">
                                    <TableCell className="text-sm font-black text-slate-400 pl-12 py-8 text-center bg-slate-50/20">
                                        {new Date(doc.fecha_emision).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell
                                        className="cursor-pointer"
                                        onClick={() => handleViewDetail(doc)}
                                    >
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-3">
                                                <span className="font-black text-primary text-base tracking-tighter group-hover:underline decoration-2 underline-offset-4">{doc.numero_completo}</span>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-primary/10 p-1.5 rounded-lg shadow-inner">
                                                    <Eye className="w-3.5 h-3.5 text-primary" />
                                                </div>
                                            </div>
                                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter mt-1">Ref: {doc.pedidos?.numero || 'Sin Pedido'}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <p className="font-black text-slate-800 text-sm leading-tight uppercase group-hover:text-primary transition-colors">{doc.razon_social_cliente || 'Venta de Mostrador'}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1.5 flex items-center gap-2">
                                            <span className="bg-slate-100 px-2.5 py-0.5 rounded text-[9px] text-slate-500 border border-slate-200">{doc.tipo_doc_cliente || 'DNI'}</span>
                                            {doc.num_doc_cliente || '00000000'}
                                        </p>
                                    </TableCell>
                                    <TableCell className="text-right pr-10">
                                        <div className="bg-slate-900 text-white inline-flex items-center px-5 py-2.5 rounded-2xl shadow-xl shadow-slate-200/50 group-hover:scale-105 transition-all border border-slate-700">
                                            <span className="text-[9px] font-black text-slate-500 mr-3 uppercase tracking-widest underline decoration-primary decoration-2 pb-0.5">{doc.moneda}</span>
                                            <span className="font-black text-base tracking-tight">{doc.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {getStatusBadge(doc.sunat_estado, doc)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge
                                            variant={doc.estado_pago === 'pagado' ? 'default' : 'outline'}
                                            onClick={() => handleViewDetail(doc)}
                                            className={`cursor-pointer transition-all hover:scale-110 active:scale-95 px-5 h-9 rounded-xl shadow-md border-2 ${doc.estado_pago === 'pagado'
                                                ? 'bg-blue-600 text-white hover:bg-blue-500 border-transparent shadow-blue-100'
                                                : 'text-slate-400 border-slate-100 hover:bg-slate-50 shadow-none'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 font-black text-[9px] uppercase tracking-[0.15em]">
                                                {doc.estado_pago === 'pagado' ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5 opacity-50" />}
                                                {doc.estado_pago?.toUpperCase() || 'PENDIENTE'}
                                            </div>
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="pr-12 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger className="h-12 w-12 p-0 rounded-2xl hover:bg-slate-100/80 hover:rotate-90 transition-all duration-500 flex items-center justify-center group-hover:bg-white shadow-sm ring-1 ring-slate-100">
                                                <MoreHorizontal className="h-7 w-7 text-slate-300 group-hover:text-primary transition-colors" />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-72 p-4 rounded-[2rem] shadow-2xl border-2 border-slate-50 bg-white/95 backdrop-blur-xl">
                                                <DropdownMenuGroup>
                                                    <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 px-5 py-4 tracking-[0.25em]">Acciones Rápidas</DropdownMenuLabel>
                                                </DropdownMenuGroup>
                                                <DropdownMenuItem className="cursor-pointer font-black text-xs uppercase tracking-tight rounded-2xl h-14 px-5 focus:bg-primary/5 focus:text-primary transition-all mb-1" onClick={() => handleViewDetail(doc)}>
                                                    <Eye className="w-6 h-6 mr-4 text-primary" /> Ver Comprobante
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="cursor-pointer font-black text-xs uppercase tracking-tight rounded-2xl h-14 px-5 transition-all mb-1">
                                                    <Printer className="w-6 h-6 mr-4 text-slate-400" /> Imprimir Formato A4
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator className="my-3 bg-slate-50 h-1" />
                                                <DropdownMenuItem className="cursor-pointer font-black text-xs uppercase tracking-tight rounded-2xl h-14 px-5 text-blue-600 hover:bg-blue-50 focus:bg-blue-50/50 transition-all mb-1">
                                                    <FileDown className="w-6 h-6 mr-4" /> Bajar Archivo XML
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="cursor-not-allowed font-black text-xs uppercase tracking-tight rounded-2xl h-14 px-5 text-red-200 opacity-40 bg-red-50/10">
                                                    <XCircle className="w-6 h-6 mr-4" /> Solicitar Anulación
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

            <ComprobanteDetalleModal
                isOpen={isModalOpen}
                onClose={setIsModalOpen}
                doc={selectedDoc}
            />
        </div>
    );
}
