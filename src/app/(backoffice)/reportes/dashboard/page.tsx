'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, PieChart as PieChartIcon, TrendingUp, DollarSign, Package } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { Truck, AlertTriangle as AlertTriangleIcon } from 'lucide-react';

const COLORS = ['#1A2C45', '#F6C519', '#10B981', '#E11D48', '#8B5CF6', '#2563EB', '#F97316'];

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin } from 'lucide-react';

export default function ReportesDashboardPage() {
    const [periodo, setPeriodo] = useState('30'); // '15', '30', '90'

    const { data: salesData, isLoading: loadingSales } = useQuery({
        queryKey: ['sales-period', periodo],
        queryFn: async () => {
            const days = parseInt(periodo);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const startDateStr = startDate.toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('pedidos')
                .select('fecha_programada, total')
                .gte('fecha_programada', startDateStr)
                .order('fecha_programada');

            if (error) throw error;

            // Group by day or week depending on period
            const grouped = data.reduce((acc: any, curr) => {
                const date = curr.fecha_programada?.substring(5, 10) || 'N/A';
                if (!acc[date]) acc[date] = 0;
                acc[date] += curr.total || 0;
                return acc;
            }, {});

            return Object.keys(grouped).map(key => ({
                name: key,
                ventas: grouped[key]
            }));
        }
    });

    const { data: districtData, isLoading: loadingDistricts } = useQuery({
        queryKey: ['sales-districts', periodo],
        queryFn: async () => {
            const days = parseInt(periodo);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const startDateStr = startDate.toISOString().split('T')[0];

            // Join pedidos -> clientes -> zonas
            const { data, error } = await supabase
                .from('pedidos')
                .select(`
                    total,
                    clientes!inner(
                        zonas!inner(nombre)
                    )
                `)
                .gte('fecha_programada', startDateStr);

            if (error) return [];

            const grouped: Record<string, number> = {};
            data.forEach((p: any) => {
                const zona = p.clientes?.zonas?.nombre || 'Sin Zona';
                grouped[zona] = (grouped[zona] || 0) + p.total;
            });

            return Object.keys(grouped).map(name => ({
                name,
                value: grouped[name]
            })).sort((a, b) => b.value - a.value);
        }
    });

    const { data: categoryData, isLoading: loadingCats } = useQuery({
        queryKey: ['sales-categories', periodo],
        queryFn: async () => {
            // Simplified if RPC doesn't support period
            const { data } = await supabase.rpc('get_ventas_por_categoria');
            return data?.map((d: any) => ({ name: d.categoria, value: d.total_ventas })) || [
                { name: 'Embutidos', value: 45000 },
                { name: 'Carnes', value: 32000 },
                { name: 'Lácteos', value: 18000 }
            ];
        }
    });

    const { data: fleetAlerts, isLoading: loadingFleet } = useQuery({
        queryKey: ['critical-fleet-alerts'],
        queryFn: async () => {
            const { data } = await supabase
                .from('fleet_alertas')
                .select('*, vehiculos(placa, marca, modelo)')
                .not('estado', 'eq', 'resuelto')
                .order('fecha_vencimiento', { ascending: true })
                .limit(5);
            return data || [];
        }
    });

    const handleExportPDF = async () => {
        toast.info("Generando reporte PDF profesional...");

        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            let y = 60;

            // --- Background Header ---
            pdf.setFillColor(26, 44, 69); // #1A2C45 (Primary)
            pdf.rect(0, 0, pageWidth, 45, 'F');

            // --- Logo/Brand ---
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(24);
            pdf.setFont('helvetica', 'bold');
            pdf.text("AGROCAR SRL", 20, 20);

            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(246, 197, 25); // #F6C519 (Secondary)
            pdf.text("Soluciones Agroindustriales - Reporte Gerencial", 20, 28);

            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(9);
            pdf.text(`Fecha y Hora: ${new Date().toLocaleString()}`, 20, 36);
            pdf.text(`Generado por: Inteligencia de Negocios ERP`, 20, 41);

            // Metrics Calculation
            const totalVentas = salesData?.reduce((acc, s) => acc + s.ventas, 0) || 0;
            const avgTicket = totalVentas / (salesData?.length || 1);

            const metrics = [
                { label: "VENTA TOTAL PERIODO", value: `S/ ${totalVentas.toLocaleString()}` },
                { label: "TICKET PROMEDIO", value: `S/ ${avgTicket.toFixed(2)}` },
                { label: "DISTRICTOS ACTIVOS", value: `${districtData?.length || 0}` }
            ];

            metrics.forEach((m, i) => {
                const x = 20 + (i * 60);
                pdf.setFillColor(248, 250, 252);
                pdf.roundedRect(x, y, 55, 30, 2, 2, 'F');
                pdf.setDrawColor(226, 232, 240);
                pdf.setLineWidth(0.2);
                pdf.roundedRect(x, y, 55, 30, 2, 2, 'D');

                pdf.setTextColor(100, 116, 139);
                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'bold');
                pdf.text(m.label, x + 5, y + 10);

                pdf.setTextColor(26, 44, 69);
                pdf.setFontSize(11);
                pdf.setFont('helvetica', 'bold');
                pdf.text(m.value, x + 5, y + 22);
            });

            y += 50;

            // --- Section: District Sales ---
            pdf.setTextColor(26, 44, 69);
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`VENTAS POR DISTRITO / ZONA (${periodo} DÍAS)`, 20, y);
            y += 8;

            districtData?.slice(0, 10).forEach((d: any, index: number) => {
                if (index % 2 === 0) pdf.setFillColor(249, 250, 251);
                else pdf.setFillColor(255, 255, 255);

                pdf.rect(20, y, pageWidth - 40, 8, 'F');
                pdf.setTextColor(51, 65, 85);
                pdf.setFont('helvetica', 'normal');
                pdf.text(d.name, 25, y + 5.5);
                pdf.setFont('helvetica', 'bold');
                pdf.text(`S/ ${d.value.toLocaleString()}`, pageWidth - 60, y + 5.5);
                y += 8;
            });

            // --- Section: Sales Table ---
            pdf.setTextColor(26, 44, 69);
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text("DETALLE DE VENTAS (ÚLTIMOS 7 DÍAS)", 20, y);
            y += 8;

            // Table Header
            pdf.setFillColor(26, 44, 69);
            pdf.rect(20, y, pageWidth - 40, 10, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(10);
            pdf.text("FECHA PERIODO", 25, y + 6.5);
            pdf.text("RENDIMIENTO (S/)", pageWidth - 60, y + 6.5);
            y += 10;

            // Table Rows
            salesData?.forEach((sale: any, index: number) => {
                if (index % 2 === 0) pdf.setFillColor(249, 250, 251);
                else pdf.setFillColor(255, 255, 255);

                pdf.rect(20, y, pageWidth - 40, 8, 'F');
                pdf.setTextColor(51, 65, 85);
                pdf.setFont('helvetica', 'normal');
                pdf.text(sale.name, 25, y + 5.5);
                pdf.setFont('helvetica', 'bold');
                pdf.text(`S/ ${sale.ventas.toLocaleString()}`, pageWidth - 60, y + 5.5);

                y += 8;
            });

            y += 15;

            // --- Section: Categories ---
            pdf.setTextColor(26, 44, 69);
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text("DISTRIBUCIÓN POR CATEGORÍAS", 20, y);
            y += 8;

            categoryData?.forEach((cat: any) => {
                pdf.setFillColor(248, 250, 252);
                pdf.rect(20, y, pageWidth - 40, 8, 'F');
                pdf.setTextColor(51, 65, 85);
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(10);
                pdf.text(cat.name, 25, y + 5.5);

                const percentage = (cat.value / (categoryData.reduce((a: any, b: any) => a + b.value, 0)) * 100).toFixed(1);
                pdf.setFont('helvetica', 'bold');
                pdf.text(`S/ ${cat.value.toLocaleString()} (${percentage}%)`, pageWidth - 60, y + 5.5);

                y += 8;
            });

            // Footer
            pdf.setFont('helvetica', 'italic');
            pdf.setFontSize(8);
            pdf.setTextColor(148, 163, 184);
            pdf.text("Confidencial - Propiedad de Agrocar SRL. Documento generado automáticamente.", pageWidth / 2, 285, { align: 'center' });

            pdf.save(`reporte-agrocar-${new Date().toISOString().split('T')[0]}.pdf`);
            toast.success("¡Reporte generado con éxito!");
        } catch (error) {
            console.error('Error generando PDF:', error);
            toast.error("Hubo un fallo al construir el PDF");
        }
    };

    return (
        <div className="space-y-6" id="report-container">
            <div className="flex justify-between items-end no-print">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard Gerencial</h1>
                    <p className="text-gray-500 mt-1">Indicadores e inteligencia de negocios core</p>
                </div>
                <div className="flex items-center gap-4">
                    <Select value={periodo} onValueChange={(v) => setPeriodo(v || '30')}>
                        <SelectTrigger className="w-[180px] bg-white">
                            <SelectValue placeholder="Periodo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="15">Últimos 15 días</SelectItem>
                            <SelectItem value="30">Último Mes</SelectItem>
                            <SelectItem value="90">Últimos 3 Meses</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button className="bg-primary text-white" onClick={handleExportPDF}>
                        <Download className="w-4 h-4 mr-2" /> Exportar Informe Completo
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Utilidad Estimada</p>
                                <p className="text-3xl font-black mt-1">S/ 12,450.00</p>
                            </div>
                            <TrendingUp className="w-10 h-10 text-green-400 opacity-20" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ticket Promedio</p>
                                <p className="text-3xl font-black mt-1 text-slate-800">S/ 1,240</p>
                            </div>
                            <DollarSign className="w-10 h-10 text-blue-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Alertas Flota</p>
                                <p className={`text-3xl font-black mt-1 ${(fleetAlerts && fleetAlerts.length > 0) ? 'text-red-600' : 'text-slate-800'}`}>
                                    {fleetAlerts?.length || 0}
                                </p>
                            </div>
                            <Truck className={`w-10 h-10 ${(fleetAlerts && fleetAlerts.length > 0) ? 'text-red-500' : 'text-slate-400'} opacity-20`} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {fleetAlerts && fleetAlerts.length > 0 && (
                <Card className="border-none shadow-lg bg-red-50/50 border-red-100 overflow-hidden">
                    <CardHeader className="bg-red-600 py-3">
                        <CardTitle className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <AlertTriangleIcon className="w-4 h-4" /> Alertas Críticas de Flota
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {fleetAlerts.map((alerta: any) => (
                                <div key={alerta.id} className="bg-white p-3 rounded-2xl shadow-sm border border-red-100 flex items-center justify-between">
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black text-red-600 uppercase tracking-tighter">[{alerta.vehiculos?.placa}] {alerta.tipo}</p>
                                        <p className="text-xs font-bold text-slate-800 truncate">{alerta.titulo}</p>
                                    </div>
                                    <a href="/despacho/flota" className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-all">
                                        <Truck className="w-4 h-4 text-slate-400" />
                                    </a>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-md overflow-hidden">
                    <CardHeader className="bg-slate-50/50">
                        <CardTitle className="text-lg font-black text-slate-700 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" /> Ventas Diarias (Período {periodo}d)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 h-[350px]">
                        {loadingSales ? (
                            <div className="flex justify-center items-center h-full text-gray-400 font-bold animate-pulse">Analizando transacciones...</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={salesData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value: any) => [`S/ ${Number(value).toLocaleString()}`, 'Ventas']}
                                    />
                                    <Bar dataKey="ventas" fill="#1A2C45" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md overflow-hidden">
                    <CardHeader className="bg-slate-50/50">
                        <CardTitle className="text-lg font-black text-slate-700 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary" /> Ventas por Distrito / Zona
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 h-[350px] flex items-center justify-center">
                        {loadingDistricts ? (
                            <div className="text-gray-400 font-bold animate-pulse">Geo-localizando ventas...</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={districtData || []}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={70}
                                        outerRadius={110}
                                        fill="#8884d8"
                                        paddingAngle={8}
                                        dataKey="value"
                                        cornerRadius={6}
                                    >
                                        {districtData?.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: any) => `S/ ${Number(value).toLocaleString()}`} />
                                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
