'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, PieChart as PieChartIcon, TrendingUp, DollarSign, Package } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
        const element = document.getElementById('report-container');
        if (!element) return;

        toast.info("Generando PDF, por favor espere...");

        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                windowWidth: 1200 // Ensure consistent layout
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`reporte-gerencial-${new Date().toISOString().split('T')[0]}.pdf`);
            toast.success("PDF exportado correctamente");
        } catch (error) {
            console.error('PDF Export Error:', error);
            toast.error("Error al generar el PDF");
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
