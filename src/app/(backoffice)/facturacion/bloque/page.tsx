'use client';

import { useState } from 'react';
import { FileDown, RefreshCcw, CheckCircle2, XCircle, Search, Play } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function FacturacionBloquePage() {
    const [consolidados, setConsolidados] = useState([
        { id: '1', numero: 'CONS-2026-001', vehiculo: 'ABC-123', pedidos_count: 14, total: 3240.50, estado_despacho: 'entregado', status_facturacion: 'pendiente' },
        { id: '2', numero: 'CONS-2026-002', vehiculo: 'DEF-456', pedidos_count: 8, total: 1850.00, estado_despacho: 'entregado', status_facturacion: 'procesando' },
        { id: '3', numero: 'CONS-2026-003', vehiculo: 'GHI-789', pedidos_count: 22, total: 5400.20, estado_despacho: 'entregado', status_facturacion: 'completado' },
    ]);

    const procesarBloque = (id: string) => {
        // Simula procesamiento asíncrono hacia SUNAT
        alert('Iniciando procesamiento a SUNAT para el consolidado...');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Facturación Electrónica</h1>
                    <p className="text-gray-500 mt-1">Generación masiva de comprobantes XML UBL 2.1 a SUNAT/OSE</p>
                </div>
                <Button variant="outline" className="text-gray-600">
                    <RefreshCcw className="w-4 h-4 mr-2" /> Actualizar Estados SUNAT
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="col-span-2">
                    <CardHeader className="border-b bg-white pb-4">
                        <div className="flex justify-between items-center">
                            <CardTitle>Consolidados Pendientes de Facturar</CardTitle>
                            <div className="relative w-64">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input placeholder="Buscar consolidado..." className="h-8 pl-8 text-sm" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead>Número</TableHead>
                                    <TableHead>Vehículo</TableHead>
                                    <TableHead className="text-right">Pedidos</TableHead>
                                    <TableHead className="text-right">Monto Total</TableHead>
                                    <TableHead className="text-center">Estado SUNAT</TableHead>
                                    <TableHead className="w-[140px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {consolidados.map((cons) => (
                                    <TableRow key={cons.id}>
                                        <TableCell className="font-medium text-blue-600 cursor-pointer hover:underline">
                                            {cons.numero}
                                        </TableCell>
                                        <TableCell>{cons.vehiculo}</TableCell>
                                        <TableCell className="text-right">{cons.pedidos_count}</TableCell>
                                        <TableCell className="text-right font-medium">S/ {cons.total.toFixed(2)}</TableCell>
                                        <TableCell className="text-center">
                                            {cons.status_facturacion === 'pendiente' && <Badge variant="outline">Pendiente</Badge>}
                                            {cons.status_facturacion === 'procesando' && <Badge className="bg-yellow-100 text-yellow-800">En Proceso...</Badge>}
                                            {cons.status_facturacion === 'completado' && <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Completado</Badge>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {cons.status_facturacion === 'pendiente' ? (
                                                <Button size="sm" onClick={() => procesarBloque(cons.id)} className="bg-primary hover:bg-primary/90 text-white w-full">
                                                    <Play className="w-3 h-3 mr-2" /> Emitir Bloque
                                                </Button>
                                            ) : (
                                                <Button size="sm" variant="outline" className="w-full">
                                                    <FileDown className="w-3 h-3 mr-2" /> Ver ZIP XML
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="border-l-4 border-l-green-500 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Comprobantes Exitosos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-700 font-mono">1,245</div>
                            <p className="text-xs text-gray-500 mt-1">Documentos con CDR activo</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-red-500 shadow-sm bg-red-50/30">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
                                <XCircle className="w-4 h-4" /> Rechazados (Errores)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-700 font-mono">2</div>
                            <p className="text-xs font-medium text-red-600 mt-1 hover:underline cursor-pointer">Ver detalle de errores (Cód 1033)</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
