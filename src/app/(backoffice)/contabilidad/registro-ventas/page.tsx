'use client';

import { useState } from 'react';
import { FileSpreadsheet, Download, RefreshCw, Table as TableIcon, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { exportToExcel } from '@/lib/exportUtils';

export default function RegistroVentasPage() {
    const [periodo, setPeriodo] = useState({ anio: '2026', mes: '03' });
    const [isExporting, setIsExporting] = useState(false);

    const fetchData = async () => {
        const mesSig = Number(periodo.mes) === 12 ? 1 : Number(periodo.mes) + 1;
        const anioSig = Number(periodo.mes) === 12 ? Number(periodo.anio) + 1 : Number(periodo.anio);

        const { data, error } = await supabase
            .from('comprobantes')
            .select('*')
            .gte('fecha_emision', `${periodo.anio}-${periodo.mes}-01`)
            .lt('fecha_emision', `${anioSig}-${String(mesSig).padStart(2, '0')}-01`);

        if (error) throw error;
        return data;
    };

    const exportarExcelGeneral = async () => {
        try {
            setIsExporting(true);
            const data = await fetchData();
            if (!data || data.length === 0) {
                toast.error('No hay datos para exportar.');
                return;
            }

            await exportToExcel(data, `Registro_Ventas_${periodo.anio}_${periodo.mes}`, "Ventas");
            toast.success('Excel generado correctamente');
        } catch (err) {
            toast.error('Error al generar Excel');
        } finally {
            setIsExporting(false);
        }
    };

    const exportarPLE141 = async () => {
        try {
            setIsExporting(true);
            const data = await fetchData();
            if (!data || data.length === 0) {
                toast.error('No hay datos para exportar.');
                return;
            }

            const mapped = data.map((c, i) => {
                const total = Number(c.total) || 0;
                const base = total / 1.18;
                const igv = total - base;

                return {
                    "PERIODO": `${periodo.anio}${periodo.mes}00`,
                    "CUO": `V${c.id.substring(0, 8).toUpperCase()}`,
                    "CORRELATIVO": `M${String(i + 1).padStart(4, '0')}`,
                    "FECHA EMISION": c.fecha_emision,
                    "FECHA VENC": c.fecha_vencimiento || c.fecha_emision,
                    "TIPO CP": c.tipo || '01',
                    "SERIE": c.serie || 'F001',
                    "NUMERO": c.numero || '000000',
                    "TIPO DOC CLI": c.num_doc_cliente?.length === 11 ? '6' : '1',
                    "NUM DOC CLI": c.num_doc_cliente || '00000000',
                    "RAZON SOCIAL": c.razon_social_cliente || 'CLIENTE VARIOS',
                    "EXP": 0.00,
                    "BASE IMP": Number(base.toFixed(2)),
                    "IGV": Number(igv.toFixed(2)),
                    "ISC": 0.00,
                    "OTROS": 0.00,
                    "TOTAL": Number(total.toFixed(2)),
                    "MON": "PEN",
                    "TC": 1.00,
                    "ESTADO": 1
                };
            });

            await exportToExcel(mapped, `PLE_14_1_VENTAS_${periodo.anio}_${periodo.mes}`, "Format 14.1");
            toast.success('PLE 14.1 generado con éxito');
        } catch (err) {
            toast.error('Error al generar PLE 14.1');
        } finally {
            setIsExporting(false);
        }
    };

    const exportarPLE142 = async () => {
        try {
            setIsExporting(true);
            const data = await fetchData();
            if (!data || data.length === 0) {
                toast.error('No hay datos para exportar.');
                return;
            }

            const mapped = data.map((c, i) => ({
                "PERIODO": `${periodo.anio}${periodo.mes}00`,
                "CUO": `SV${c.id.substring(0, 8).toUpperCase()}`,
                "CORRELATIVO": `M${String(i + 1).padStart(4, '0')}`,
                "FECHA EMISION": c.fecha_emision,
                "TIPO CP": c.tipo || '01',
                "SERIE": c.serie || 'F001',
                "NUMERO": c.numero || '000000',
                "NUM DOC CLI": c.num_doc_cliente || '00000000',
                "RAZON SOCIAL": c.razon_social_cliente || 'CLIENTE VARIOS',
                "BASE IMP": Number(((c.total || 0) / 1.18).toFixed(2)),
                "IGV": Number(((c.total || 0) - ((c.total || 0) / 1.18)).toFixed(2)),
                "TOTAL": Number((c.total || 0).toFixed(2)),
                "ESTADO": 1
            }));

            await exportToExcel(mapped, `PLE_14_2_SIMPLIFICADO_${periodo.anio}_${periodo.mes}`, "Format 14.2");
            toast.success('PLE 14.2 generado con éxito');
        } catch (err) {
            toast.error('Error al generar PLE 14.2');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Registro de Ventas e Ingresos (PLE)</h1>
                <p className="text-gray-500 mt-1">Exportación de Estructuras 14.1 Formato SUNAT</p>
            </div>

            <Card className="max-w-xl">
                <CardHeader>
                    <CardTitle>Generación de Archivos PLE</CardTitle>
                    <CardDescription>Seleccione el periodo tributario para exportar los TXT estructurados.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Año</label>
                            <Select value={periodo.anio} onValueChange={(val) => setPeriodo({ ...periodo, anio: val || '' })}>
                                <SelectTrigger><SelectValue placeholder="Año" /></SelectTrigger>
                                <SelectContent><SelectItem value="2026">2026</SelectItem></SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Mes</label>
                            <Select value={periodo.mes} onValueChange={(val) => setPeriodo({ ...periodo, mes: val || '' })}>
                                <SelectTrigger><SelectValue placeholder="Mes" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="02">Febrero</SelectItem>
                                    <SelectItem value="03">Marzo</SelectItem>
                                    <SelectItem value="04">Abril</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="pt-4 flex flex-col gap-3">
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 font-bold" onClick={exportarExcelGeneral} disabled={isExporting}>
                            {isExporting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                            Descargar Registro en Excel
                        </Button>
                        <p className="text-[10px] text-gray-400 text-center uppercase font-bold tracking-widest pt-2">Formatos Oficiales SUNAT</p>
                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="outline" className="text-[10px] font-black h-8 hover:bg-slate-50" onClick={exportarPLE141} disabled={isExporting}>
                                <FileText className="w-3 h-3 mr-1 text-red-600" /> PLE 14.1 (Ventas)
                            </Button>
                            <Button variant="outline" className="text-[10px] font-black h-8 hover:bg-slate-50" onClick={exportarPLE142} disabled={isExporting}>
                                <FileText className="w-3 h-3 mr-1 text-red-600" /> PLE 14.2 (Simplificado)
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
