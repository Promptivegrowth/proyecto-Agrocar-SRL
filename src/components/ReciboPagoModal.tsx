'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Printer, Download, X, CheckCircle2, Wallet, Calendar, Hash, User, FileText, CreditCard, QrCode, FileCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ReciboPagoModalProps {
    isOpen: boolean;
    onClose: () => void;
    pago: {
        id: string;
        numero_recibo?: string;
        fecha?: string;
        monto?: number;
        metodo_pago?: string;
        cliente_razon_social?: string;
        cliente_doc?: string;
        referencia?: string;
        comprobante_afectado?: string;
        moneda?: string;
        monto_letras?: string;
    } | null;
}

export function ReciboPagoModal({ isOpen, onClose, pago }: ReciboPagoModalProps) {
    if (!pago) return null;

    const [isPrinting, setIsPrinting] = useState(false);
    const handlePrint = () => {
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 1200);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-6xl p-0 overflow-hidden border-none shadow-2xl bg-slate-50 max-h-[90vh] flex flex-col">
                <style jsx global>{`
                    @media print {
                        /* Super strict print reset */
                        body, html {
                            height: auto !important;
                            overflow: visible !important;
                            background: white !important;
                            margin: 0 !important;
                            padding: 0 !important;
                        }
                        /* Hide everything */
                        header, nav, aside, footer,
                        [role="dialog"] [data-slot="dialog-close"],
                        .print\\:hidden,
                        [data-slot="dialog-overlay"],
                        [role="dialog"] > :not(.print-content-container) {
                            display: none !important;
                        }
                        /* Position the receipt at the very top left */
                        #printable-receipt {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            margin: 0 !important;
                            padding: 2cm !important;
                            visibility: visible !important;
                            display: block !important;
                            box-shadow: none !important;
                            border: none !important;
                            z-index: 99999 !important;
                            background: white !important;
                        }
                        /* Fix for some browsers showing modal backgrounds */
                        [role="presentation"], .fixed, .absolute {
                            display: none !important;
                        }
                        #printable-receipt, #printable-receipt * {
                            visibility: visible !important;
                        }
                    }
                `}</style>

                <div className="bg-white border-b px-6 py-4 flex items-center justify-between print:hidden shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-900 p-2 rounded-lg">
                            <FileCheck className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">Vista Previa de Recibo</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{pago.numero_recibo}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handlePrint}
                            disabled={isPrinting}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-black px-6 rounded-xl h-11"
                        >
                            {isPrinting ? "Generando..." : <><Printer className="w-4 h-4 mr-2" /> Imprimir Recibo</>}
                        </Button>
                        <Button variant="outline" onClick={onClose} className="border-slate-200 px-6 rounded-xl h-11 font-bold">
                            Cerrar
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100 print:p-0 print:bg-white flex justify-center print-content-container">
                    <div id="printable-receipt" className="bg-white p-12 rounded-2xl shadow-xl border border-slate-200 w-full max-w-[950px] print:m-0 print:shadow-none print:border-none print:max-w-full flex flex-col gap-8">
                        {/* Header Documento horizontal-style */}
                        <div className="flex justify-between items-center pb-8 border-b-2 border-slate-100">
                            <div className="flex items-center gap-6">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-4xl font-black tracking-tighter text-slate-900 italic">AGROCAR</span>
                                        <span className="text-4xl font-light tracking-tighter text-primary italic">SRL</span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                                        VENTA DE CARNES Y EMBUTIDOS DE ALTA CALIDAD<br />
                                        AV. CENTRAL 123, CALLAO, LIMA - PERÚ
                                    </div>
                                </div>
                            </div>
                            <div className="border-4 border-slate-900 p-6 min-w-[280px] text-center rounded-2xl bg-slate-50">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">R.U.C. 20123456789</p>
                                <div className="bg-slate-900 text-white py-3 px-6 mb-3 rounded-lg">
                                    <p className="text-lg font-black tracking-[0.2em] uppercase">RECIBO DE CAJA</p>
                                </div>
                                <p className="text-3xl font-black text-slate-900 tracking-tighter italic">{pago.numero_recibo || 'RC01-00000000'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-12 gap-10">
                            <div className="col-span-7 space-y-6">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 mb-2">
                                        <User className="w-3.5 h-3.5" /> Recibimos de
                                    </label>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <p className="font-black text-slate-900 text-xl leading-tight uppercase tracking-tight">{pago.cliente_razon_social || 'Publico General'}</p>
                                        <p className="text-sm font-bold text-slate-500 mt-1">R.U.C. / D.N.I.: <span className="text-slate-700">{pago.cliente_doc || '-'}</span></p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 mb-2">
                                            <FileText className="w-3.5 h-3.5" /> Por concepto de
                                        </label>
                                        <p className="text-slate-700 font-bold leading-relaxed border-b border-dashed border-slate-200 pb-2">
                                            {pago.referencia || 'CANCELACION DE DEUDA PENDIENTE'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-span-1 border-r border-slate-100 hidden md:block"></div>
                            <div className="col-span-4 space-y-6">
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1 mb-1">
                                            <Calendar className="w-3 h-3" /> Fecha de Pago
                                        </label>
                                        <p className="font-black text-slate-900">{pago.fecha || new Date().toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1 mb-1">
                                            <Wallet className="w-3 h-3" /> Método de Pago
                                        </label>
                                        <Badge className="bg-slate-900 text-white hover:bg-slate-900 font-black border-none uppercase text-[10px] px-3 py-1">
                                            {pago.metodo_pago}
                                        </Badge>
                                    </div>
                                    <div className="pt-4 border-t border-slate-200">
                                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-2 block">Monto Total</label>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-xl font-bold text-slate-400">S/</span>
                                            <span className="text-4xl font-black text-slate-900 tracking-tighter">
                                                {pago.monto?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-end pt-10 border-t border-slate-100 gap-10">
                            <div className="flex-1">
                                <div className="flex items-center gap-4 text-slate-400 mb-8">
                                    <Hash className="w-4 h-4" />
                                    <span className="text-[11px] font-bold uppercase tracking-[0.2em]">{pago.monto_letras || '---------------------------------------------------'}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-10 mt-12">
                                    <div className="text-center">
                                        <div className="border-t border-slate-300 pt-3">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Firma Cajero</p>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="border-t border-slate-300 pt-3">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Firma Cliente</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="w-32 h-32 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center">
                                <div className="text-slate-200">
                                    <QrCode className="w-20 h-20 opacity-20" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
