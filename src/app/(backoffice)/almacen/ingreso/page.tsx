'use client';

import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';

export default function IngresoMercaderia() {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/almacen">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ingreso de Mercadería (Compras)</h1>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-4 border-b">
                    <CardTitle className="text-lg">Datos del Documento</CardTitle>
                    <CardDescription>Factura o Guía del Proveedor</CardDescription>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Proveedor (RUC / Razón Social)</label>
                        <Input placeholder="Buscar proveedor proveedor..." />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Almacén Destino</label>
                        <Input value="Almacén Principal (Refrigerado)" readOnly className="bg-gray-50 text-gray-600" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Tipo Documento</label>
                        <Input placeholder="FACTURA" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Serie</label>
                            <Input placeholder="F001" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Correlativo</label>
                            <Input placeholder="000123" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2 border-b flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">Detalle de Productos</CardTitle>
                    </div>
                    <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                        <Plus className="w-4 h-4 mr-2" /> Agregar Item
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-gray-50/80">
                            <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead className="w-32">Cantidad</TableHead>
                                <TableHead className="w-32">Costo Unit.</TableHead>
                                <TableHead className="w-24 text-right">Subtotal</TableHead>
                                <TableHead className="w-16"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell>
                                    <Input placeholder="Buscar producto..." defaultValue="Jamón del País B/N" className="h-8" />
                                </TableCell>
                                <TableCell>
                                    <Input type="number" defaultValue="150" className="h-8 text-right" />
                                </TableCell>
                                <TableCell>
                                    <Input type="number" defaultValue="14.50" className="h-8 text-right" />
                                </TableCell>
                                <TableCell className="text-right font-medium align-middle">S/ 2175.00</TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-3 mt-8">
                <Button variant="outline" size="lg">Cancelar</Button>
                <Button size="lg" className="bg-green-600 hover:bg-green-700">
                    <Save className="w-5 h-5 mr-2" /> Registrar Ingreso
                </Button>
            </div>

        </div>
    );
}
