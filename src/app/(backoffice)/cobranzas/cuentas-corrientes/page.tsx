'use client';

import { useState, Suspense } from 'react';
import { Search, History, Check, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useSearchParams } from 'next/navigation';

function CuentasCorrientesContent() {
    const params = useSearchParams();
    const clienteId = params.get('cliente_id');

    const [deudas, setDeudas] = useState([
        { id: '1', doc: 'FACT-F001-000452', fecha: '28-03-2026', vencimiento: '04-04-2026', dias_retraso: 0, total: 1540.00, saldo: 540.00 },
        { id: '2', doc: 'FACT-F001-000301', fecha: '12-03-2026', vencimiento: '19-03-2026', dias_retraso: 16, total: 320.00, saldo: 320.00 },
    ]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Cuentas Corrientes</h1>
                <p className="text-gray-500 mt-1">Gestión de créditos, amortizaciones y línea crediticia por cliente</p>
            </div>

            <Card>
                <CardHeader className="bg-gray-50 border-b pb-4">
                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <CardTitle className="text-xl">Bodega La Esquina S.A.C.</CardTitle>
                            <CardDescription>RUC: 20123456789 - Cliente Activo</CardDescription>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-medium text-gray-500">Línea de Crédito: <span className="text-gray-900">S/ 5,000.00</span></div>
                            <div className="text-sm font-medium text-primary mt-1">Crédito Disponible: <span className="font-bold text-lg">S/ 4,140.00</span></div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="p-4 border-b flex justify-between bg-white items-center">
                        <h3 className="font-semibold text-gray-800">Deudas Pendientes</h3>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            <DollarSign className="w-4 h-4 mr-2" /> Registrar Pago
                        </Button>
                    </div>
                    <Table>
                        <TableHeader className="bg-red-50/50">
                            <TableRow>
                                <TableHead>Comprobante</TableHead>
                                <TableHead>Emisión</TableHead>
                                <TableHead>Vencimiento</TableHead>
                                <TableHead className="text-center">Retraso</TableHead>
                                <TableHead className="text-right">Monto Original</TableHead>
                                <TableHead className="text-right font-bold text-red-700">Saldo Deudor</TableHead>
                                <TableHead className="w-[100px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {deudas.map((d) => (
                                <TableRow key={d.id}>
                                    <TableCell className="font-medium">{d.doc}</TableCell>
                                    <TableCell>{d.fecha}</TableCell>
                                    <TableCell>{d.vencimiento}</TableCell>
                                    <TableCell className="text-center">
                                        {d.dias_retraso > 0 ? (
                                            <Badge variant="destructive">{d.dias_retraso} días</Badge>
                                        ) : (
                                            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">Al día</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right text-gray-500">S/ {d.total.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-bold text-red-600">S/ {d.saldo.toFixed(2)}</TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" title="Ver Pagos Aplicados">
                                            <History className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {deudas.length > 0 && (
                                <TableRow className="bg-gray-50 font-bold border-t-2 border-gray-200">
                                    <TableCell colSpan={5} className="text-right uppercase text-sm">Deuda Total Consolidada</TableCell>
                                    <TableCell className="text-right text-red-700 text-lg">
                                        S/ {deudas.reduce((acc, c) => acc + c.saldo, 0).toFixed(2)}
                                    </TableCell>
                                    <TableCell />
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

export default function CuentasCorrientesPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Cargando cuentas...</div>}>
            <CuentasCorrientesContent />
        </Suspense>
    );
}

