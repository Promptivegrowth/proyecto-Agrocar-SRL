'use client';

import { useState } from 'react';
import { FileSpreadsheet, Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';

export default function RegistroVentasPage() {
    const [periodo, setPeriodo] = useState({ anio: '2026', mes: '03' });
    const [isExporting, setIsExporting] = useState(false);

    const exportarTXT = async () => {
        try {
            setIsExporting(true);
            const { data, error } = await supabase
                .from('comprobantes')
                .select('*')
                .gte('fecha_emision', `${periodo.anio}-${periodo.mes}-01`)
                .lt('fecha_emision', `${periodo.anio}-${String(Number(periodo.mes) + 1).padStart(2, '0')}-01`);

            if (error) throw error;

            if (!data || data.length === 0) {
                alert('No hay comprobantes emitidos en el periodo seleccionado.');
                return;
            }

            // Simula creación del archivo LE...txt para el PLE de SUNAT
            let pleContent = '';
            data.forEach((comp, idx) => {
                const correlativoM = String(idx + 1).padStart(5, '0');
                const tipo_doc = comp.tipo;
                const serie = comp.serie;
                const numero = String(comp.correlativo).padStart(8, '0');
                const fecha = comp.fecha_emision?.replace(/-/g, '') || '';

                // Formato básico PLE 14.1 - Registro de Ventas - Layout Estructural
                // Este es un formato emulado para fines de demostración
                pleContent += `${periodo.anio}${periodo.mes}00|${correlativoM}|M0001|${comp.fecha_emision}|${comp.fecha_emision}|${tipo_doc}|${serie}|${numero}||${comp.tipo_doc_cliente === 'DNI' ? 1 : 6}|${comp.num_doc_cliente}|${comp.razon_social_cliente}|||${comp.subtotal?.toFixed(2)}||${comp.igv?.toFixed(2)}|||${comp.total?.toFixed(2)}|PEN|1.000|||||20123456789|0|1|\n`;
            });

            const a = document.createElement('a');
            const blob = new Blob([pleContent], { type: 'text/plain' });
            a.href = URL.createObjectURL(blob);
            a.download = `LE20123456789${periodo.anio}${periodo.mes}00140100001111.TXT`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

        } catch (err: any) {
            console.error('Error al exportar txt:', err);
            alert('Ocurrió un error general exportando los datos.');
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
                    <div className="pt-4 flex gap-3">
                        <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={exportarTXT} disabled={isExporting}>
                            {isExporting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
                            Descargar TXT (Estructura 14.1)
                        </Button>
                        <Button variant="outline" className="flex-1 text-primary border-primary hover:bg-primary/5">
                            <Download className="w-4 h-4 mr-2" /> Previsualizar Excel
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
