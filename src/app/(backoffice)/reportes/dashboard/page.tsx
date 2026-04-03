'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, PieChart as PieChartIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard Gerencial</h1>
                    <p className="text-gray-500 mt-1">Indicadores e inteligencia de negocios</p>
                </div>
                <Button className="bg-primary text-white">
                    <Download className="w-4 h-4 mr-2" /> Exportar Informe PDF
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Ventas Últimos 7 Días</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {loadingSales ? (
                            <div className="flex justify-center items-center h-full text-gray-400">Cargando gráficos...</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={salesData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: 'transparent' }} formatter={(value: any) => `S/ ${Number(value).toFixed(2)}`} />
                                    <Line type="monotone" dataKey="ventas" stroke="#1A2C45" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Distribución por Categorías</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData || []}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                    label
                                >
                                    {categoryData?.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: any) => `S/ ${Number(value).toFixed(2)}`} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
