'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Printer, Download, X, CheckCircle2, Wallet, Calendar, Hash, User, FileText, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ReciboPagoModalProps {
    isOpen: boolean;
    onClose: () => void;
    pago: {
        id?: string;
        numero_recibo?: string;
        fecha?: string;
        cliente_razon_social?: string;
        cliente_doc?: string;
        monto: number;
        metodo_pago: string;
        referencia?: string;
        comprobante_afectado?: string; // e.g. F001-00001234
        moneda?: string;
        monto_letras?: string;
    } | null;
}

export function ReciboPagoModal({ isOpen, onClose, pago }: ReciboPagoModalProps) {
    if (!pago) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl p-0 overflow-hidden border-none shadow-2xl bg-slate-50 max-h-[95vh] flex flex-col">
                <style jsx global>{`
                    @media print {
                        body * {
                            visibility: hidden !important;
                        }
                        #printable-receipt, #printable-receipt * {
                            visibility: visible !important;
                        }
                        #printable-receipt {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background: white !important;
                            box-shadow: none !important;
                            border: none !important;
                        }
                        /* Hide everything else explicitly just in case */
                        .print\\:hidden, [role="dialog"] > :not(#printable-receipt) {
                            display: none !important;
                        }
                    }
                `}</style>
                <DialogHeader className="p-6 bg-white border-b flex flex-row items-center justify-between space-y-0 shrink-0 print:hidden">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-lg">
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold text-slate-900">Recibo de Ingreso</DialogTitle>
                            <p className="text-sm text-slate-500">Documento de confirmación de pago</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handlePrint} className="h-9 font-bold">
                            <Printer className="w-4 h-4 mr-2" /> Imprimir
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100 print:p-0 print:bg-white flex justify-center">
                    <div id="printable-receipt" className="bg-white p-10 rounded-2xl shadow-xl border border-slate-200 w-full max-w-[850px] print:m-0 print:shadow-none print:border-none print:max-w-full">
                        {/* Header Documento */}
                        <div className="flex justify-between items-start mb-10">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-3xl font-black tracking-tighter text-slate-900 italic">AGROCAR</span>
                                    <span className="text-3xl font-light tracking-tighter text-primary italic">SRL</span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                                    VENTA DE CARNES Y EMBUTIDOS DE ALTA CALIDAD<br />
                                    AV. CENTRAL 123, CALLAO, LIMA - PERÚ<br />
                                    TEL: (01) 456-7890 / VENTAS@AGROCAR.PE
                                </div>
                            </div>
                            <div className="border-4 border-slate-900 p-4 min-w-[240px] text-center rounded-xl bg-slate-50">
                                <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-1">R.U.C. 20123456789</p>
                                <div className="bg-slate-900 text-white py-2 px-4 mb-2 rounded-md">
                                    <p className="text-sm font-black tracking-widest uppercase">RECIBO DE CAJA</p>
                                </div>
                                <p className="text-2xl font-black text-slate-900 tracking-tighter">{pago.numero_recibo || 'RC01-00000000'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 mb-10">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1 mb-1">
                                        <User className="w-3 h-3" /> Recibimos de
                                    </label>
                                    <p className="font-black text-slate-900 text-lg leading-tight uppercase">{pago.cliente_razon_social || 'Publico General'}</p>
                                    <p className="text-sm font-bold text-slate-500">R.U.C. / D.N.I.: {pago.cliente_doc || '-'}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1 mb-1">
                                            <Calendar className="w-3 h-3" /> Fecha de Pago
                                        </label>
                                        <p className="font-black text-slate-900">{pago.fecha || new Date().toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1 mb-1">
                                            <Wallet className="w-3 h-3" /> Método
                                        </label>
                                        <Badge className="bg-slate-100 text-slate-900 hover:bg-slate-100 font-black border-slate-200 uppercase text-[10px]">
                                            {pago.metodo_pago}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detalle del Pago */}
                        <div className="border-2 border-slate-900 rounded-xl overflow-hidden mb-6">
                            <Table>
                                <TableHeader className="bg-slate-900">
                                    <TableRow className="hover:bg-transparent border-none">
                                        <TableHead className="text-white font-black uppercase text-[10px] tracking-widest">Concepto de Pago</TableHead>
                                        <TableHead className="text-right text-white font-black uppercase text-[10px] tracking-widest">Referencia</TableHead>
                                        <TableHead className="text-right text-white font-black uppercase text-[10px] tracking-widest">Importe</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow className="border-b-2 border-slate-100">
                                        <TableCell className="py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-slate-100 p-2 rounded-lg">
                                                    <FileText className="w-5 h-5 text-slate-600" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 text-sm">Cancelación / Amortización de Documento</p>
                                                    <p className="text-xs font-bold text-slate-500 uppercase italic">Referencia: {pago.comprobante_afectado || 'Sin documento'}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-slate-500 italic pr-6">
                                            {pago.referencia || 'Pago Directo'}
                                        </TableCell>
                                        <TableCell className="text-right font-black text-slate-900 text-xl pr-6">
                                            {pago.moneda || 'S/'} {pago.monto.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Importe en letras</p>
                            <p className="font-bold text-slate-700 italic uppercase underline decoration-slate-300 decoration-2 underline-offset-4">
                                SON: {pago.monto_letras || 'CERO CON 00/100 SOLES'}
                            </p>
                        </div>

                        <div className="flex justify-between items-end pt-10">
                            <div className="text-center space-y-2">
                                <div className="w-48 border-b-2 border-slate-300 mx-auto" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Firma del Cliente</p>
                            </div>
                            <div className="text-center space-y-2">
                                <div className="w-48 border-b-2 border-slate-900 mx-auto" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Agrocar SRL - Caja</p>
                            </div>
                        </div>

                        <div className="mt-12 text-center">
                            <p className="text-[8px] text-slate-300 font-black uppercase tracking-[0.3em]">www.agrocar.pe - Sistema de Gestión ERP</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-900 flex justify-between items-center shrink-0 print:hidden">
                    <p className="text-white/50 text-xs font-medium italic">
                        Este documento es un comprobante interno de recepción de fondos.
                    </p>
                    <div className="flex gap-3">
                        <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={onClose}>
                            Cerrar
                        </Button>
                        <Button className="bg-primary hover:bg-primary/90 text-white font-bold px-8 shadow-lg shadow-primary/20" onClick={handlePrint}>
                            <Printer className="w-4 h-4 mr-2" /> Imprimir Recibo
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
