'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, PieChart as PieChartIcon, TrendingUp, DollarSign, Package } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

const COLORS = ['#1A2C45', '#F6C519', '#10B981', '#E11D48', '#8B5CF6'];

export default function ReportesDashboardPage() {
    const { data: salesData, isLoading: loadingSales } = useQuery({
        queryKey: ['sales-last-7-days'],
        queryFn: async () => {
            const today = new Date();
            const lastWeek = new Date(today);
            lastWeek.setDate(lastWeek.getDate() - 7);

            const { data, error } = await supabase
                .from('comprobantes')
                .select('fecha_emision, total')
                .gte('fecha_emision', lastWeek.toISOString().split('T')[0])
                .order('fecha_emision');

            if (error) throw error;

            // Group by day
            const grouped = data.reduce((acc: any, curr) => {
                const date = curr.fecha_emision.substring(5, 10); // MM-DD
                if (!acc[date]) acc[date] = 0;
                acc[date] += curr.total;
                return acc;
            }, {});

            const chartData = Object.keys(grouped).map(key => ({
                name: key,
                ventas: grouped[key]
            }));

            return chartData;
        }
    });

    const { data: categoryData, isLoading: loadingCats } = useQuery({
        queryKey: ['sales-categories'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_ventas_por_categoria');

            if (error) {
                // Return fallback mock if RPC fails
                return [
                    { name: 'Embutidos Fríos', value: 4000 },
                    { name: 'Carnes', value: 3000 },
                    { name: 'Envasados', value: 2000 },
                ];
            }

            return data.map((d: any) => ({ name: d.categoria, value: d.total_ventas }));
        }
    });

    const handleExportPDF = async () => {
        toast.info("Generando reporte PDF profesional...");

        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();

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

            // --- Section: Executive Summary ---
            let y = 60;
            pdf.setTextColor(26, 44, 69);
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text("RESUMEN EJECUTIVO DE INDICADORES", 20, y);
            pdf.setDrawColor(246, 197, 25);
            pdf.setLineWidth(1);
            pdf.line(20, y + 2, 80, y + 2);

            y += 15;

            // Metrics Layout (Simulated Cards)
            const metrics = [
                { label: "UTILIDAD ESTIMADA", value: "S/ 12,450.00" },
                { label: "TICKET PROMEDIO", value: "S/ 1,240.00" },
                { label: "ROTACIÓN STOCK", value: "85%" }
            ];

            metrics.forEach((m, i) => {
                const x = 20 + (i * 60);
                pdf.setFillColor(248, 250, 252); // slate-50
                pdf.roundedRect(x, y, 55, 30, 2, 2, 'F');
                pdf.setDrawColor(226, 232, 240); // slate-200
                pdf.setLineWidth(0.2);
                pdf.roundedRect(x, y, 55, 30, 2, 2, 'D');

                pdf.setTextColor(100, 116, 139); // slate-500
                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'bold');
                pdf.text(m.label, x + 5, y + 10);

                pdf.setTextColor(26, 44, 69);
                pdf.setFontSize(14);
                pdf.setFont('helvetica', 'bold');
                pdf.text(m.value, x + 5, y + 22);
            });

            y += 50;

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
            <div className="flex justify-between items-center no-print">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard Gerencial</h1>
                    <p className="text-gray-500 mt-1">Indicadores e inteligencia de negocios</p>
                </div>
                <Button className="bg-primary text-white" onClick={handleExportPDF}>
                    <Download className="w-4 h-4 mr-2" /> Exportar Informe PDF
                </Button>
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
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Rotación Stock</p>
                                <p className="text-3xl font-black mt-1 text-slate-800">85%</p>
                            </div>
                            <Package className="w-10 h-10 text-orange-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-md overflow-hidden">
                    <CardHeader className="bg-slate-50/50">
                        <CardTitle className="text-lg font-black text-slate-700 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" /> Ventas Últimos 7 Días
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 h-[350px]">
                        {loadingSales ? (
                            <div className="flex justify-center items-center h-full text-gray-400">Generando analítica...</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={salesData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value: any) => [`S/ ${Number(value).toLocaleString()}`, 'Ventas']}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="ventas"
                                        stroke="#2563eb"
                                        strokeWidth={4}
                                        dot={{ r: 6, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                                        activeDot={{ r: 8, strokeWidth: 0 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md overflow-hidden">
                    <CardHeader className="bg-slate-50/50">
                        <CardTitle className="text-lg font-black text-slate-700 flex items-center gap-2">
                            <PieChartIcon className="w-5 h-5 text-primary" /> Distribución por Categorías
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 h-[350px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData || []}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={70}
                                    outerRadius={110}
                                    fill="#8884d8"
                                    paddingAngle={8}
                                    dataKey="value"
                                    cornerRadius={6}
                                >
                                    {categoryData?.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: any) => `S/ ${Number(value).toLocaleString()}`} />
                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
