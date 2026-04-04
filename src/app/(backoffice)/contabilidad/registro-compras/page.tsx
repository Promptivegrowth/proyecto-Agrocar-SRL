'use client';

import { useState } from 'react';
import { FileSpreadsheet, Download, RefreshCw, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export default function RegistroComprasPage() {
    const [periodo, setPeriodo] = useState({ anio: '2026', mes: '03' });
    const [isExporting, setIsExporting] = useState(false);

    const exportarExcel = async () => {
        try {
            setIsExporting(true);
            const mesSig = Number(periodo.mes) === 12 ? 1 : Number(periodo.mes) + 1;
            const anioSig = Number(periodo.mes) === 12 ? Number(periodo.anio) + 1 : Number(periodo.anio);

            const { data, error } = await supabase
                .from('compras')
                .select('*')
                .gte('fecha', `${periodo.anio}-${periodo.mes}-01`)
                .lt('fecha', `${anioSig}-${String(mesSig).padStart(2, '0')}-01`);

            if (error) throw error;
            if (!data || data.length === 0) {
                toast.error('No hay compras registradas en este periodo.');
                return;
            }

            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "RegistroCompras");
            XLSX.writeFile(workbook, `Registro_Compras_${periodo.anio}_${periodo.mes}.xlsx`);
            toast.success('Excel generado correctamente');
        } catch (err) {
            toast.error('Error al generar Excel');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                    Registro de Compras (PLE) <ShoppingCart className="w-8 h-8 text-amber-600" />
                </h1>
                <p className="text-gray-500 mt-1">Estructura 8.1 - Control de adquisiciones y crédito fiscal.</p>
            </div>

            <Card className="max-w-xl border-none shadow-xl rounded-[2rem] bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-xl font-black uppercase tracking-tight">Generación de Archivos</CardTitle>
                    <CardDescription className="font-medium">Seleccione el periodo tributario para exportar a SUNAT.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-gray-400 ml-1">Año Fiscal</label>
                            <Select value={periodo.anio} onValueChange={(val) => setPeriodo({ ...periodo, anio: val || '' })}>
                                <SelectTrigger className="rounded-xl border-none bg-gray-100 font-bold"><SelectValue placeholder="Año" /></SelectTrigger>
                                <SelectContent className="rounded-xl border-none shadow-2xl"><SelectItem value="2026">2026</SelectItem></SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-gray-400 ml-1">Mes</label>
                            <Select value={periodo.mes} onValueChange={(val) => setPeriodo({ ...periodo, mes: val || '' })}>
                                <SelectTrigger className="rounded-xl border-none bg-gray-100 font-bold"><SelectValue placeholder="Mes" /></SelectTrigger>
                                <SelectContent className="rounded-xl border-none shadow-2xl">
                                    <SelectItem value="02">Febrero</SelectItem>
                                    <SelectItem value="03">Marzo</SelectItem>
                                    <SelectItem value="04">Abril</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="pt-4 flex flex-col gap-3">
                        <Button className="w-full bg-amber-600 hover:bg-amber-700 font-bold h-12 rounded-xl shadow-lg shadow-amber-600/20" onClick={exportarExcel} disabled={isExporting}>
                            {isExporting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                            Descargar Registro Compras (Excel)
                        </Button>
                        <p className="text-[10px] text-gray-400 text-center uppercase font-bold tracking-widest pt-2">Formatos Oficiales SUNAT</p>
                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="outline" className="text-[10px] font-black h-8 rounded-lg" onClick={() => toast.info('Generando Estructura 8.1...')}>
                                PLE 8.1 (Compras)
                            </Button>
                            <Button variant="outline" className="text-[10px] font-black h-8 rounded-lg" onClick={() => toast.info('Generando Estructura 8.2...')}>
                                PLE 8.2 (No Domiciliados)
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
