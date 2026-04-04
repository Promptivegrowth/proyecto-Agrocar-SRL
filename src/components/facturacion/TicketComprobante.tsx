'use client';

import { FileText, Printer, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TicketProps {
    comprobante: any;
    items: any[];
    empresa: any;
}

export default function TicketComprobante({ comprobante, items, empresa }: TicketProps) {
    if (!comprobante) return null;

    const totalItems = items.reduce((acc, it) => acc + (it.cantidad || 0), 0);

    return (
        <div className="bg-white p-8 max-w-[400px] border shadow-lg mx-auto font-mono text-[11px] leading-tight text-gray-800 printable-ticket">
            {/* Header / Logo Section */}
            <div className="text-center space-y-2 mb-6 border-b pb-4">
                {empresa?.logo_url ? (
                    <img src={empresa.logo_url} alt="Logo" className="w-24 mx-auto mb-2 opacity-80" />
                ) : (
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <FileText className="w-8 h-8 text-primary opacity-50" />
                    </div>
                )}
                <h1 className="text-sm font-black uppercase tracking-tighter">{empresa?.razon_social || 'AGROCAR SRL'}</h1>
                <p className="text-[10px]">RUC: {empresa?.ruc || '20123456789'}</p>
                <p className="text-[9px] text-gray-500 whitespace-pre-line">{empresa?.direccion || 'Av. Principal 123, Lima'}</p>
                <div className="mt-4 pt-2 border-t border-dashed">
                    <p className="text-sm font-bold">{comprobante.tipo === '01' ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA'}</p>
                    <p className="text-lg font-black text-primary">{comprobante.numero_completo}</p>
                </div>
            </div>

            {/* Client Section */}
            <div className="space-y-1 mb-6 text-[10px]">
                <div className="flex justify-between">
                    <span className="font-bold uppercase tracking-tight">Fecha:</span>
                    <span>{new Date(comprobante.fecha_emision).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-bold uppercase tracking-tight">Moneda:</span>
                    <span>{comprobante.moneda === 'PEN' ? 'SOLES' : 'DÓLARES'}</span>
                </div>
                <div className="mt-3 border-t border-gray-100 pt-2">
                    <p className="font-bold uppercase mb-1">Cliente:</p>
                    <p className="font-medium text-gray-700 leading-3">{comprobante.razon_social_cliente}</p>
                    <p className="text-gray-500">{comprobante.tipo_doc_cliente}: {comprobante.num_doc_cliente}</p>
                    <p className="text-gray-400 italic text-[9px] line-clamp-1">{comprobante.direccion_cliente}</p>
                </div>
            </div>

            {/* Items Table */}
            <div className="border-t border-b border-dashed py-3 mb-6">
                <div className="grid grid-cols-12 font-bold mb-2 text-[9px] uppercase tracking-tighter opacity-70">
                    <span className="col-span-8">Descripción</span>
                    <span className="col-span-2 text-right">Cant.</span>
                    <span className="col-span-2 text-right">Total</span>
                </div>
                <div className="space-y-2">
                    {items.map((it, idx) => (
                        <div key={idx} className="grid grid-cols-12 items-start gap-1">
                            <div className="col-span-8">
                                <p className="font-medium text-gray-900 leading-3">{it.descripcion}</p>
                                <p className="text-[8px] text-gray-400">P.U: S/. {parseFloat(it.precio_unitario).toFixed(2)}</p>
                            </div>
                            <span className="col-span-2 text-right">{it.cantidad}</span>
                            <span className="col-span-2 text-right font-bold text-gray-900">{parseFloat(it.precio_total).toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Totals Section */}
            <div className="space-y-1 border-b border-dashed pb-4 mb-4">
                <div className="flex justify-between text-[10px]">
                    <span className="opacity-70 uppercase">Op. Gravada:</span>
                    <span className="font-mono">S/. {(comprobante.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                    <span className="opacity-70 uppercase">IGV (18%):</span>
                    <span className="font-mono">S/. {(comprobante.igv || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-black mt-2 pt-2 border-t text-primary">
                    <span className="uppercase">Importe Total:</span>
                    <span className="font-mono">S/. {(comprobante.total || 0).toFixed(2)}</span>
                </div>
            </div>

            {/* Legal / QR Footer */}
            <div className="text-center space-y-3">
                <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                    <p className="text-[8px] text-gray-500 italic">Representación impresa de la {comprobante.tipo === '01' ? 'Factura' : 'Boleta'} de Venta Electrónica.</p>
                </div>
                <p className="text-[8px] uppercase tracking-widest text-gray-400 font-bold">Resumen Hash: {comprobante.sunat_hash?.substring(0, 16) || 'QWNDRVIzNDU2Nzg5MA=='}</p>

                <div className="w-24 h-24 bg-gray-100 border mx-auto flex items-center justify-center opacity-30 mt-2">
                    <p className="text-[8px]">CÓDIGO QR</p>
                </div>

                <p className="text-[9px] font-bold text-gray-600 mt-6">¡Gracias por su preferencia!</p>
                <p className="text-[7px] text-gray-400 uppercase tracking-tighter">Autorizado mediante Resolución de Intendencia N° 034-005-000</p>
            </div>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .printable-ticket, .printable-ticket * {
                        visibility: visible;
                    }
                    .printable-ticket {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 80mm;
                        padding: 10px;
                        border: none;
                        box-shadow: none;
                    }
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
