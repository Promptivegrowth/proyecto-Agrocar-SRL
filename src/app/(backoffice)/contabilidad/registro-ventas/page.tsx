'use client';

import { FileSpreadsheet, Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function RegistroVentasPage() {
    const exportarTXT = () => {
        // Simula creación del archivo LE...txt para el PLE de SUNAT
        const a = document.createElement('a');
        const blob = new Blob(['14.1\n001|2026-03-25|01|F001|000125|...'], { type: 'text/plain' });
        a.href = URL.createObjectURL(blob);
        a.download = 'LE2012345678920260300140100001111.TXT';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
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
                            <Select defaultValue="2026">
                                <SelectTrigger><SelectValue placeholder="Año" /></SelectTrigger>
                                <SelectContent><SelectItem value="2026">2026</SelectItem></SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Mes</label>
                            <Select defaultValue="03">
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
                        <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={exportarTXT}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" /> Descargar TXT (Estructura 14.1)
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
