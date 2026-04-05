'use client';

import { useState } from 'react';
import {
    FileText,
    RefreshCcw,
    CheckCircle2,
    XCircle,
    Search,
    Play,
    Truck,
    Calendar,
    ChevronRight,
    AlertCircle,
    Download,
    Printer
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { GuiaDetalleModal } from '@/components/GuiaDetalleModal';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { emitirComprobantesBloque } from '../actions';

export default function FacturacionBloquePage() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedConsolidado, setSelectedConsolidado] = useState<any>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isGuiaModalOpen, setIsGuiaModalOpen] = useState(false);
    const [selectedGuia, setSelectedGuia] = useState<any>(null);

    // 1. Fetch Consolidados con lógica de join manual para evitar error 400 por falta de FK en Pedidos
    const { data: consolidados, isLoading } = useQuery({
        queryKey: ['consolidados-facturacion'],
        queryFn: async () => {
            // 1. Fetch Consolidados
            const { data: consData, error: consError } = await supabase
                .from('consolidados_despacho')
                .select('*')
                .neq('estado', 'cerrado')
                .order('created_at', { ascending: false });

            if (consError) throw consError;
            if (!consData || consData.length === 0) return [];

            const consIds = consData.map(c => c.id);
            const vehIds = consData.map(c => c.vehiculo_id).filter(Boolean);

            // 2. Fetch Vehículos (Join Manual)
            const { data: vehData } = await supabase
                .from('vehiculos')
                .select('id, placa')
                .in('id', vehIds);

            // 3. Fetch Pedidos (Join Manual)
            const { data: pedData, error: pedError } = await supabase
                .from('pedidos')
                .select('id, total, estado, consolidado_id, cliente_id')
                .in('consolidado_id', consIds);

            if (pedError) throw pedError;

            // 4. Fetch Clientes (para saber si es Boleta o Factura)
            const clienteIds = pedData?.map(p => p.cliente_id).filter(Boolean) || [];
            const { data: cliData } = await supabase
                .from('clientes')
                .select('id, tipo_documento')
                .in('id', clienteIds);

            return consData.map(c => {
                const placa = vehData?.find(v => v.id === c.vehiculo_id)?.placa || 'Sin Placa';
                const pedidosDelConsolidado = pedData?.filter((p: any) => p.consolidado_id === c.id) || [];
                const pedidosParaFacturar = pedidosDelConsolidado.filter((p: any) => p.estado !== 'facturado');

                const totalMonto = pedidosParaFacturar.reduce((acc: number, p: any) => acc + (p.total || 0), 0);

                // Mapear clientes a pedidos
                const pedidosConCliente = pedidosParaFacturar.map(p => ({
                    ...p,
                    cliente: cliData?.find(cli => cli.id === p.cliente_id)
                }));

                const boletasCount = pedidosConCliente.filter((p: any) => p.cliente?.tipo_documento === 'DNI').length;
                const facturasCount = pedidosConCliente.filter((p: any) => p.cliente?.tipo_documento === 'RUC').length;

                return {
                    ...c,
                    pedidos_count: c.total_pedidos || pedidosDelConsolidado.length,
                    pedidos_pendientes: pedidosParaFacturar.length,
                    monto_total: totalMonto,
                    boletas_count: boletasCount,
                    facturas_count: facturasCount,
                    vehiculo_placa: placa
                };
            });
        }
    });



    // 2. Mutation for Emission
    const mutationEmitir = useMutation({
        mutationFn: async (consId: string) => {
            const result = await emitirComprobantesBloque(consId);
            if (!result.success) throw new Error(result.error);
            return result;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['consolidados-facturacion'] });
            toast.success(`Éxito: Se generaron ${data?.comprobantes?.length || 0} comprobantes electrónicos.`);
            setIsPreviewOpen(false);
            setSelectedConsolidado(null);
        },
        onError: (error: any) => {
            toast.error(`Error al emitir: ${error.message}`);
        }
    });

    const filteredConsolidados = consolidados?.filter(c =>
        c.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.vehiculo_placa.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalFacturarHoy = consolidados?.reduce((acc, c) => acc + c.monto_total, 0) || 0;
    const totalDocsHoy = consolidados?.reduce((acc, c) => acc + c.pedidos_pendientes, 0) || 0;

    return (
        <div className="h-full flex flex-col space-y-6">
            {/* Header Profesional */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border shadow-sm shrink-0">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                        <FileText className="w-8 h-8 text-primary" /> Facturación por Bloques
                    </h1>
                    <p className="text-gray-500 mt-1 flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Gestión masiva de Comprobantes Electrónicos (UBL 2.1)
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-100 text-center">
                        <p className="text-[10px] uppercase font-bold text-green-600">Total a Facturar</p>
                        <p className="text-xl font-black text-green-700">S/. {totalFacturarHoy.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 text-center">
                        <p className="text-[10px] uppercase font-bold text-blue-600">Docs. Pendientes</p>
                        <p className="text-xl font-black text-blue-700">{totalDocsHoy}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0 overflow-hidden">
                {/* Listado Principal */}
                <Card className="lg:col-span-3 flex flex-col shadow-sm border-gray-200">
                    <CardHeader className="py-4 border-b bg-gray-50/50">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-lg">Consolidados de Despacho</CardTitle>
                                <CardDescription>Seleccione un bloque para procesar la emisión masiva</CardDescription>
                            </div>
                            <div className="relative w-72">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Buscar placa o número..."
                                    className="h-9 pl-9 text-sm bg-white"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-white shadow-sm z-10">
                                <TableRow>
                                    <TableHead className="w-[150px]">Consolidado</TableHead>
                                    <TableHead>Vehículo / Chofer</TableHead>
                                    <TableHead className="text-right">Pedidos</TableHead>
                                    <TableHead className="text-right">Total (S/.)</TableHead>
                                    <TableHead className="text-center">Estado</TableHead>
                                    <TableHead className="w-[160px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-20 text-gray-400">
                                            <RefreshCcw className="w-8 h-8 animate-spin mx-auto mb-2 opacity-20" />
                                            Cargando datos maestros...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredConsolidados?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-20 text-gray-400">
                                            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                            No se encontraron bloques pendientes de facturación.
                                        </TableCell>
                                    </TableRow>
                                ) : filteredConsolidados?.map((cons) => (
                                    <TableRow key={cons.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <TableCell className="font-bold text-gray-900">
                                            {cons.numero}
                                            <p className="text-[10px] text-gray-400 font-normal">{new Date(cons.fecha).toLocaleDateString()}</p>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Truck className="w-4 h-4 text-gray-400" />
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-700">{cons.vehiculo_placa}</p>
                                                    <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Chofer ID: {cons.chofer_id?.split('-')[0]}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {cons.pedidos_pendientes} / {cons.pedidos_count}
                                        </TableCell>
                                        <TableCell className="text-right font-black text-gray-800">
                                            {cons.monto_total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {cons.pedidos_pendientes > 0 ? (
                                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                                    Pendiente
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Facturado
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {cons.pedidos_pendientes > 0 ? (
                                                <Button
                                                    size="sm"
                                                    className="bg-primary hover:bg-primary/90 shadow-sm"
                                                    onClick={() => {
                                                        setSelectedConsolidado(cons);
                                                        setIsPreviewOpen(true);
                                                    }}
                                                >
                                                    Emitir Bloque <ChevronRight className="w-3 h-3 ml-1" />
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-xs group-hover:bg-white"
                                                    onClick={() => {
                                                        setSelectedGuia({
                                                            numero: cons.numero,
                                                            fecha_emision: cons.fecha,
                                                            direccion_cliente: 'Destino Final (Consolidado)',
                                                            razon_social_cliente: 'Varios Clientes (Bloque)',
                                                            num_doc_cliente: '-',
                                                            // Aquí se podrían pasar más datos si el consolidado los tiene
                                                        });
                                                        setIsGuiaModalOpen(true);
                                                    }}
                                                >
                                                    <Printer className="w-3 h-3 mr-2" /> Guía Remisión
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Sidebar de Resumen */}
                <div className="space-y-6">
                    <Card className="bg-gray-900 text-white border-none shadow-xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <FileText className="w-24 h-24 rotate-12" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-blue-400">Estado SUNAT Hoy</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-end border-b border-white/10 pb-4">
                                <div>
                                    <p className="text-3xl font-black">2,451</p>
                                    <p className="text-[10px] text-gray-400 uppercase">Documentos Aceptados</p>
                                </div>
                                <CheckCircle2 className="w-8 h-8 text-green-500 mb-1" />
                            </div>
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-xl font-bold text-red-400">0</p>
                                    <p className="text-[10px] text-gray-400 uppercase">Rechazados / Errores</p>
                                </div>
                                <XCircle className="w-6 h-6 text-red-500 mb-1 opacity-50" />
                            </div>
                            <Button className="w-full bg-blue-600 hover:bg-blue-500 text-[10px] h-8 mt-2" variant="secondary">
                                <Download className="w-3 h-3 mr-2" /> Descargar reporte PLE
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-dashed">
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm">Parámetros de Emisión</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs">
                            <div className="flex justify-between py-1 border-b italic text-gray-500">
                                <span>Certificado Digital:</span>
                                <span className="text-green-600 font-bold">ACTIVO</span>
                            </div>
                            <div className="flex justify-between py-1 border-b italic text-gray-500">
                                <span>Proveedor OSE:</span>
                                <span>NUBEFACT</span>
                            </div>
                            <div className="flex justify-between py-1 text-gray-400 italic">
                                <span>Última Sincronización:</span>
                                <span>Hace 5 min</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Modal de Vista Previa y Emisión */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Play className="w-5 h-5 text-primary" />
                            Pre-Emisión Electrónica
                        </DialogTitle>
                        <DialogDescription>
                            Resumen del consolidado <strong>{selectedConsolidado?.numero}</strong>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 rounded-xl border text-center">
                                <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Boletas (03)</p>
                                <p className="text-2xl font-black text-gray-800">{selectedConsolidado?.boletas_count}</p>
                                <p className="text-[9px] text-gray-400">(Clientes DNI)</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl border text-center">
                                <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Facturas (01)</p>
                                <p className="text-2xl font-black text-gray-800">{selectedConsolidado?.facturas_count}</p>
                                <p className="text-[9px] text-gray-400">(Clientes RUC)</p>
                            </div>
                        </div>

                        <div className="bg-blue-600 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                            <div className="absolute -right-4 -bottom-4 opacity-10">
                                <FileText className="w-24 h-24" />
                            </div>
                            <p className="text-[10px] uppercase font-bold opacity-80 mb-1 tracking-widest">Total a Emitir SUNAT</p>
                            <p className="text-4xl font-black">
                                S/. {selectedConsolidado?.monto_total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                            </p>
                        </div>

                        <div className="flex items-start gap-3 bg-amber-50 p-4 rounded-lg border border-amber-200 text-amber-800 text-xs">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p>
                                Al proceder, los comprobantes serán firmados digitalmente y el estado de los pedidos cambiará a <strong>FACTURADO</strong>. Esta acción no se puede deshacer.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Cancelar</Button>
                        <Button
                            className="bg-primary hover:bg-primary/90 px-8"
                            onClick={() => mutationEmitir.mutate(selectedConsolidado.id)}
                            disabled={mutationEmitir.isPending}
                        >
                            {mutationEmitir.isPending ? (
                                <>
                                    <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
                                    Emitiendo...
                                </>
                            ) : (
                                "Firmar y Emitir Bloque"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <GuiaDetalleModal
                isOpen={isGuiaModalOpen}
                onClose={setIsGuiaModalOpen}
                guia={selectedGuia}
            />
        </div>
    );
}
