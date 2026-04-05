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

            {/* Modal de Detalle - Rediseñado para Formato SUNAT Profesional */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="sm:max-w-4xl max-h-[98vh] overflow-y-auto p-0 border-0 rounded-3xl shadow-2xl bg-white print:shadow-none print:m-0 print:p-0 print:max-h-none print:w-full">
                    {/* Header solo visible en pantalla, oculto en impresión */}
                    <div className="bg-slate-900 p-6 text-white print:hidden">
                        <div className="flex justify-between items-center font-inter">
                            <div className="flex items-center gap-3">
                                <Truck className="w-6 h-6 text-primary" />
                                <span className="font-black uppercase tracking-widest text-xs">Vista Previa de Impresión</span>
                            </div>
                            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 rounded-full h-8 w-8 p-0" onClick={() => setIsDetailOpen(false)}>×</Button>
                        </div>
                    </div>

                    {/* ÁREA IMPRIMIBLE (Formato SUNAT) */}
                    <div className="p-8 md:p-12 space-y-8 bg-white print:p-4 print:text-[12px]">
                        {/* Cabecera Principal: Logo/Empresa y Recuadro RUC */}
                        <div className="flex flex-col md:flex-row justify-between gap-8 items-start border-b-2 border-slate-900 pb-8">
                            <div className="flex flex-col gap-2 max-w-md">
                                <h2 className="text-4xl font-black italic tracking-tighter text-slate-900 leading-none">AGROCAR SRL</h2>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                                    Venta de carnes y embutidos de alta calidad<br />
                                    Av. Central 123, Callao, Lima - Perú<br />
                                    Tel: (01) 456-7890 / Correo: ventas@agrocar.pe
                                </p>
                            </div>

                            {/* Recuadro RUC (Estandar SUNAT) */}
                            <div className="border-4 border-slate-900 p-6 text-center rounded-2xl min-w-[300px] bg-slate-50 print:bg-white">
                                <p className="text-lg font-black text-slate-900">R.U.C. 20123456789</p>
                                <div className="my-2 py-2 bg-slate-900 text-white font-black text-xl uppercase tracking-tighter decoration-primary decoration-4">
                                    GUÍA DE REMISIÓN<br />REMITENTE
                                </div>
                                <p className="text-2xl font-black text-slate-900 tracking-tighter">{selectedGuia?.numero_completo || 'T001-000123'}</p>
                            </div>
                        </div>

                        {/* Bloques de Información (Origen, Destino, Transportista) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            {/* Bloque: Punto de Partida y Llegada */}
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-black uppercase text-primary tracking-[0.2em] border-b pb-1">01. Punto de Partida</h3>
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
                                        <p className="font-bold text-slate-800 text-sm">Av. Central 123, Callao (Sede Central Agrocar)</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-black uppercase text-primary tracking-[0.2em] border-b pb-1">02. Punto de Llegada</h3>
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-5 h-5 text-slate-900 shrink-0" />
                                        <p className="font-black text-slate-900 text-sm">{selectedGuia?.direccion_cliente || 'Dirección no especificada'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Bloque: Destinatario */}
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-black uppercase text-primary tracking-[0.2em] border-b pb-1">03. Datos del Destinatario</h3>
                                    <div className="space-y-1">
                                        <p className="text-xl font-black text-slate-900 tracking-tight leading-tight">{selectedGuia?.razon_social_cliente || 'Cliente de Prueba'}</p>
                                        <p className="text-sm font-bold text-slate-500 uppercase">R.U.C. / D.N.I.: {selectedGuia?.num_doc_cliente || '00000000'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Fecha Emisión</p>
                                        <p className="font-black text-slate-800 text-sm">{new Date(selectedGuia?.fecha_emision || Date.now()).toLocaleDateString()}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Motivo Traslado</p>
                                        <p className="font-black text-slate-800 text-sm uppercase">VENTA</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bloque de Transporte (Crítico para SUNAT) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 border-t border-b border-slate-100 py-6">
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">04. Datos de la Unidad de Transporte</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-3 rounded-xl print:bg-transparent print:p-0">
                                        <p className="text-[8px] font-bold text-slate-400 uppercase">Marca / Placa</p>
                                        <p className="font-black text-slate-800 text-sm">ABC-123</p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl print:bg-transparent print:p-0">
                                        <p className="text-[8px] font-bold text-slate-400 uppercase">Nro. Registro</p>
                                        <p className="font-black text-slate-800 text-sm">MTU-4567-REG</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">05. Datos del Conductor</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-3 rounded-xl print:bg-transparent print:p-0">
                                        <p className="text-[8px] font-bold text-slate-400 uppercase">Nombre Completo</p>
                                        <p className="font-black text-slate-800 text-sm italic truncate">Juan Perez Garcia</p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl print:bg-transparent print:p-0">
                                        <p className="text-[8px] font-bold text-slate-400 uppercase">Licencia de Conducir</p>
                                        <p className="font-black text-slate-800 text-sm font-mono tracking-tighter">Q12345678</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detalle de Mercadería */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-baseline">
                                <h3 className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">06. Detalle de Bienes Transportados</h3>
                                <div className="text-[9px] font-bold text-slate-400 italic">Pesos expresados en Kilogramos (KG)</div>
                            </div>
                            <div className="border-[1.5px] border-slate-900 rounded-2xl overflow-hidden shadow-sm">
                                <Table>
                                    <TableHeader className="bg-slate-900">
                                        <TableRow className="border-none">
                                            <TableHead className="font-black text-[9px] text-white uppercase text-center w-16">Item</TableHead>
                                            <TableHead className="font-black text-[9px] text-white uppercase text-center w-24">Código</TableHead>
                                            <TableHead className="font-black text-[9px] text-white uppercase">Descripción del Producto</TableHead>
                                            <TableHead className="text-right font-black text-[9px] text-white uppercase w-24 pr-6">U.M.</TableHead>
                                            <TableHead className="text-right font-black text-[9px] text-white uppercase w-24 pr-6">Cant.</TableHead>
                                            <TableHead className="text-right font-black text-[9px] text-white uppercase w-28 pr-6">Peso Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow className="border-b-2 border-slate-100">
                                            <TableCell className="text-center font-bold text-slate-400">01</TableCell>
                                            <TableCell className="text-center font-black text-slate-800">P-10023</TableCell>
                                            <TableCell className="font-black text-slate-900 text-sm py-4">CARNE DE RES - CORTE PREMIUM REFRIGERADO</TableCell>
                                            <TableCell className="text-right font-bold text-slate-500 pr-6 uppercase italic">Kilos</TableCell>
                                            <TableCell className="text-right font-black text-slate-900 text-sm pr-6">150.00</TableCell>
                                            <TableCell className="text-right font-black text-primary text-sm pr-6">150.00 KG</TableCell>
                                        </TableRow>
                                        <TableRow className="border-b-2 border-slate-100">
                                            <TableCell className="text-center font-bold text-slate-400">02</TableCell>
                                            <TableCell className="text-center font-black text-slate-800">P-10045</TableCell>
                                            <TableCell className="font-black text-slate-900 text-sm py-4">HOT DOG DE TERNERA GOURMET X 500G</TableCell>
                                            <TableCell className="text-right font-bold text-slate-500 pr-6 uppercase italic">Kilos</TableCell>
                                            <TableCell className="text-right font-black text-slate-900 text-sm pr-6">40.00</TableCell>
                                            <TableCell className="text-right font-black text-primary text-sm pr-6">20.00 KG</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Footer de Firma y QR */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-16 mt-8 print:pt-10">
                            <div className="flex flex-col items-center">
                                <div className="border-t-2 border-slate-300 w-full mt-12 mb-2"></div>
                                <p className="text-[10px] font-black uppercase text-slate-400">Firma del Conductor</p>
                                <p className="text-[9px] font-bold text-slate-300">DNI: ___________</p>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="border-t-2 border-slate-300 w-full mt-12 mb-2"></div>
                                <p className="text-[10px] font-black uppercase text-slate-400">Recibido por (Firma/Sello)</p>
                                <p className="text-[9px] font-bold text-slate-300">DNI: ___________</p>
                            </div>
                            <div className="flex items-center justify-center bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 print:bg-white">
                                <div className="bg-white p-2 border border-slate-200">
                                    <div className="w-24 h-24 bg-slate-100 flex items-center justify-center">
                                        <p className="text-[8px] font-black text-slate-300 uppercase text-center px-4 leading-tight">QR CODE GENERATED BY SUNAT</p>
                                    </div>
                                </div>
                                <div className="ml-4 space-y-1">
                                    <p className="text-[11px] font-black text-slate-900">Validado por SUNAT</p>
                                    <p className="text-[9px] font-bold text-slate-400 leading-tight">Comprobante de Pago electrónico<br />Resolv. N° 0180050002164</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Botones de acción (Solo pantalla) */}
                    <DialogFooter className="px-8 py-6 border-t bg-slate-50 flex gap-4 print:hidden sticky bottom-0 z-50">
                        <Button variant="outline" className="px-8 font-black uppercase text-xs tracking-widest border-2 h-12 rounded-xl" onClick={() => setIsDetailOpen(false)}>
                            Cerrar Vista
                        </Button>
                        <Button className="flex-1 bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest h-12 rounded-xl shadow-xl shadow-primary/20" onClick={() => {
                            toast.info("Generando formato de impresión...");
                            window.print();
                        }}>
                            <Printer className="w-5 h-5 mr-3" />
                            Imprimir / Guardar PDF
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
