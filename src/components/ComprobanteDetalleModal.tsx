'use client';

import {
    FileText,
    User,
    Calendar,
    Printer,
    X,
    CheckCircle2,
    ShieldCheck,
    MapPin,
    Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ComprobanteDetalleModalProps {
    isOpen: boolean;
    onClose: (open: boolean) => void;
    doc: any;
}

export function ComprobanteDetalleModal({ isOpen, onClose, doc }: ComprobanteDetalleModalProps) {
    if (!doc) return null;

    const isFactura = doc.tipo === '01' || doc.numero_completo?.startsWith('F');
    const tipoDocLabel = isFactura ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto p-0 border-0 rounded-3xl shadow-2xl bg-white print:shadow-none print:m-0 print:p-0 print:max-h-none print:w-full">
                {/* Header Premium (Screen Only) */}
                <div className="bg-slate-900 p-6 text-white flex justify-between items-center print:hidden">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/20 p-2 rounded-xl">
                            <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <span className="font-black uppercase tracking-widest text-[10px] opacity-50 block">Vista Previa Oficial</span>
                            <span className="font-bold text-lg">{doc.numero_completo}</span>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/10 rounded-full h-10 w-10 p-0"
                        onClick={() => onClose(false)}
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* AREA IMPRIMIBLE */}
                <div className="p-10 space-y-10 bg-white print:p-6 print:text-[11px]">
                    {/* Encabezado: Logo y RUC */}
                    <div className="flex flex-col md:flex-row justify-between gap-10 items-start">
                        <div className="space-y-4 max-w-sm">
                            <h2 className="text-4xl font-black italic tracking-tighter text-slate-900 leading-none">AGROCAR SRL</h2>
                            <div className="space-y-1 text-xs font-bold text-slate-500 uppercase tracking-tight">
                                <p className="flex items-center gap-2"><MapPin className="w-3 h-3" /> Av. Central 123, Callao, Lima</p>
                                <p className="flex items-center gap-2"><Smartphone className="w-3 h-3" /> (01) 456-7890 / 999-888-777</p>
                                <p className="flex items-center gap-2 text-primary">www.agrocar.pe</p>
                            </div>
                        </div>

                        <div className="border-4 border-slate-900 p-6 text-center rounded-2xl min-w-[280px] bg-slate-50 print:bg-white">
                            <p className="text-lg font-black text-slate-900">R.U.C. 20123456789</p>
                            <div className="my-3 py-2 bg-slate-900 text-white font-black text-lg uppercase tracking-tight">
                                {tipoDocLabel}
                            </div>
                            <p className="text-2xl font-black text-slate-900 tracking-tighter">{doc.numero_completo}</p>
                        </div>
                    </div>

                    {/* Información del Cliente y Venta */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 border-y-2 border-slate-100 py-8">
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase text-primary tracking-widest border-b pb-1">Datos del Adquiriente</h3>
                            <div className="space-y-2">
                                <p className="text-xl font-black text-slate-900 leading-tight uppercase">{doc.razon_social_cliente || 'Cliente Varios'}</p>
                                <p className="text-sm font-bold text-slate-500">{doc.tipo_doc_cliente || 'DNI'}: {doc.num_doc_cliente || '00000000'}</p>
                                <p className="text-[11px] text-slate-400 font-medium italic">{doc.direccion_cliente || 'Dirección no registrada'}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase text-primary tracking-widest border-b pb-1">Detalle del Comprobante</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Fecha Emisión</p>
                                    <p className="font-black text-slate-800 text-sm">{new Date(doc.fecha_emision).toLocaleDateString()}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Moneda</p>
                                    <p className="font-black text-slate-800 text-sm">{doc.moneda === 'PEN' ? 'SOLES (S/.)' : 'DOLARES ($)'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Condición</p>
                                    <p className="font-black text-slate-800 text-sm uppercase">{doc.condicion_pago || 'CONTADO'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Estado Pago</p>
                                    <p className={`font-black text-sm uppercase ${doc.estado_pago === 'pagado' ? 'text-green-600' : 'text-red-600'}`}>
                                        {doc.estado_pago || 'PENDIENTE'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabla de Items */}
                    <div className="space-y-4">
                        <div className="border-[1.5px] border-slate-900 rounded-2xl overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-slate-900">
                                    <TableRow className="border-none hover:bg-slate-900">
                                        <TableHead className="font-black text-[9px] text-white uppercase w-16 text-center">Cant.</TableHead>
                                        <TableHead className="font-black text-[9px] text-white uppercase w-20 text-center">U.M.</TableHead>
                                        <TableHead className="font-black text-[9px] text-white uppercase">Descripción</TableHead>
                                        <TableHead className="text-right font-black text-[9px] text-white uppercase w-28 pr-6">P. Unitario</TableHead>
                                        <TableHead className="text-right font-black text-[9px] text-white uppercase w-28 pr-6">Importe</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {doc.items && doc.items.length > 0 ? (
                                        doc.items.map((item: any, idx: number) => (
                                            <TableRow key={idx} className="border-b-2 border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="text-center font-black text-slate-900">{Number(item.cantidad).toFixed(2)}</TableCell>
                                                <TableCell className="text-center font-bold text-slate-400 text-[10px] uppercase">{item.unidad_medida || 'NIU'}</TableCell>
                                                <TableCell className="font-bold text-slate-800 text-xs py-3 uppercase">{item.descripcion}</TableCell>
                                                <TableCell className="text-right font-bold text-slate-500 pr-6">{Number(item.precio_unitario).toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-black text-slate-900 pr-6">{Number(item.precio_total).toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-10">
                                                <div className="flex flex-col items-center gap-2 opacity-20">
                                                    <ShieldCheck className="w-10 h-10" />
                                                    <p className="text-xs font-bold uppercase italic">Detalle de items protegido por SUNAT</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Resumen de Totales y QR */}
                    <div className="flex flex-col md:flex-row justify-between items-end gap-10 pt-4">
                        <div className="flex-1 space-y-4 w-full">
                            <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 space-y-2 print:bg-white print:border-slate-200">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Observaciones</p>
                                <p className="text-xs font-bold text-slate-600 italic">
                                    Representación impresa del Comprobante de Pago Electrónico.
                                    Consulte la validez de este documento en el portal de la SUNAT.
                                </p>
                            </div>

                            <div className="flex items-center gap-6 p-4">
                                <div className="w-24 h-24 bg-white border-4 border-slate-900 p-1 flex items-center justify-center shrink-0">
                                    {/* Placeholder QR */}
                                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-400 text-center uppercase px-2 leading-none">
                                        SUNAT<br />QR VALIDATION<br />ACTIVE
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-black text-slate-900">Validado por SUNAT</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-tight">
                                        Firma Digital: {doc.hash || 'AGROCAR-SRL-PROPIO-CERT-2026'}<br />
                                        Autorizado mediante Resolución N° 0180050002164
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="w-full md:w-80 space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-bold text-slate-400 uppercase tracking-tighter">Op. Gravada</span>
                                <span className="font-black text-slate-700">S/. {Number(doc.base_imponible || (doc.total / 1.18)).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-bold text-slate-400 uppercase tracking-tighter">I.G.V. (18%)</span>
                                <span className="font-black text-slate-700">S/. {Number(doc.igv || (doc.total - (doc.total / 1.18))).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-3 border-t-2 border-slate-900">
                                <span className="text-lg font-black text-slate-900 uppercase tracking-tighter">Total a Pagar</span>
                                <span className="text-2xl font-black text-primary">S/. {Number(doc.total).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Modal (Screen Only) */}
                <DialogFooter className="p-8 bg-slate-50 border-t flex flex-col sm:flex-row gap-4 print:hidden rounded-b-3xl">
                    <Button variant="outline" className="flex-1 h-12 font-black uppercase text-xs tracking-widest border-2 rounded-xl" onClick={() => onClose(false)}>
                        Cerrar Detalle
                    </Button>
                    <Button
                        className="flex-1 h-12 bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-xl shadow-primary/20"
                        onClick={() => {
                            toast.info("Preparando impresión...");
                            window.print();
                        }}
                    >
                        <Printer className="w-4 h-4 mr-3" /> Imprimir Documento
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
