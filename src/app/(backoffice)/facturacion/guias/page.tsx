'use client';

import { useState } from 'react';
import { Truck, Search, Plus, Printer, ChevronRight, FileText, AlertCircle, Users, MapPin, Package } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
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

    const [selectedGuia, setSelectedGuia] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

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
                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setSelectedGuia(g); setIsDetailOpen(true); }}><Printer className="w-4 h-4" /></Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 px-3 text-primary font-bold"
                                            onClick={() => { setSelectedGuia(g); setIsDetailOpen(true); }}
                                        >
                                            Ver Detalle <ChevronRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Modal de Detalle */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto p-0 border-0 rounded-3xl shadow-2xl">
                    <div className="bg-slate-900 p-8 text-white">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="bg-primary p-3 rounded-2xl">
                                    <FileText className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black uppercase tracking-tighter italic">Guía de Remisión Electrónica</h2>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">N° {selectedGuia?.numero_completo}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <Badge className={`bg-emerald-500 text-white font-black px-4 py-1.5 uppercase tracking-widest text-[10px] border-0`}>
                                    SUNAT: {selectedGuia?.sunat_estado || 'ACEPTADO'}
                                </Badge>
                                <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">Código Hash: a1b2c3d4e5f6</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 space-y-8 bg-white">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block font-inter">Fecha Emisión</label>
                                <p className="font-bold text-slate-800">{new Date(selectedGuia?.fecha_emision).toLocaleDateString()}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block font-inter">Motivo Traslado</label>
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-black text-[10px]">VENTA</Badge>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block font-inter">Punto de Partida</label>
                                <p className="text-xs font-bold text-slate-600 truncate">Sede Central - Agrocar Lima</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block font-inter">Peso Bruto Total</label>
                                <p className="font-black text-primary text-xl">1.2 TN</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="border-slate-100 bg-slate-50/50 shadow-none">
                                <CardHeader className="py-4 border-b">
                                    <CardTitle className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
                                        <Users className="w-3.5 h-3.5 text-primary" /> Datos del Destinatario
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="py-4 space-y-3">
                                    <div>
                                        <p className="text-lg font-black text-slate-800">{selectedGuia?.razon_social_cliente}</p>
                                        <p className="text-sm font-bold text-slate-500 italic">RUC: {selectedGuia?.num_doc_cliente}</p>
                                    </div>
                                    <div className="flex items-start gap-2 text-xs font-medium text-slate-600">
                                        <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                        <span>{selectedGuia?.direccion_cliente}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-slate-100 bg-slate-50/50 shadow-none">
                                <CardHeader className="py-4 border-b">
                                    <CardTitle className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
                                        <Truck className="w-3.5 h-3.5 text-primary" /> Datos del Transporte
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="py-4 space-y-4">
                                    <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                <Truck className="w-4 h-4 text-slate-500" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Vehículo</p>
                                                <p className="font-black text-slate-800">ABC-123</p>
                                            </div>
                                        </div>
                                        <Badge className="bg-slate-100 text-slate-600 border-slate-200">Placa</Badge>
                                    </div>
                                    <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                <Users className="w-4 h-4 text-slate-500" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Conductor</p>
                                                <p className="font-black text-slate-800 italic">Juan Perez Garcia</p>
                                            </div>
                                        </div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Licencia: Q12345678</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <Package className="w-4 h-4" /> Detalle de Bienes Transportados
                                </h3>
                                <Badge className="bg-slate-100 text-slate-600">3 Ítems</Badge>
                            </div>
                            <div className="border rounded-2xl overflow-hidden shadow-sm">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow>
                                            <TableHead className="font-black text-[10px] uppercase">Cod.</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase">Descripción del Producto</TableHead>
                                            <TableHead className="text-right font-black text-[10px] uppercase">U.M.</TableHead>
                                            <TableHead className="text-right font-black text-[10px] uppercase">Cantidad</TableHead>
                                            <TableHead className="text-right font-black text-[10px] uppercase">Peso Est.</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="font-bold text-slate-400">P001</TableCell>
                                            <TableCell className="font-black text-slate-800 uppercase">Carne de Res - Corte Premium</TableCell>
                                            <TableCell className="text-right font-bold text-slate-500">KG</TableCell>
                                            <TableCell className="text-right font-black text-slate-800">120.00</TableCell>
                                            <TableCell className="text-right font-black text-primary italic">120 KG</TableCell>
                                        </TableRow>
                                        <TableRow className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="font-bold text-slate-400">P002</TableCell>
                                            <TableCell className="font-black text-slate-800 uppercase">Filete de Pollo x 1kg</TableCell>
                                            <TableCell className="text-right font-bold text-slate-500">KG</TableCell>
                                            <TableCell className="text-right font-black text-slate-800">45.00</TableCell>
                                            <TableCell className="text-right font-black text-primary italic">45 KG</TableCell>
                                        </TableRow>
                                        <TableRow className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="font-bold text-slate-400">P003</TableCell>
                                            <TableCell className="font-black text-slate-800 uppercase">Salchicha Frankfurt Ahumada</TableCell>
                                            <TableCell className="text-right font-bold text-slate-500">KG</TableCell>
                                            <TableCell className="text-right font-black text-slate-800">30.00</TableCell>
                                            <TableCell className="text-right font-black text-primary italic">30 KG</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="px-8 py-6 border-t bg-slate-50 flex gap-4">
                        <Button variant="outline" className="px-8 font-black uppercase text-xs tracking-widest border-2 h-12 rounded-xl" onClick={() => setIsDetailOpen(false)}>
                            Cerrar
                        </Button>
                        <Button className="flex-1 bg-slate-900 hover:bg-slate-800 font-black text-xs uppercase tracking-widest h-12 rounded-xl shadow-xl shadow-slate-200" onClick={() => {
                            toast.success("Preparando descarga PDF...");
                            window.print();
                        }}>
                            <FileText className="w-5 h-5 mr-3" />
                            Descargar en PDF
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
