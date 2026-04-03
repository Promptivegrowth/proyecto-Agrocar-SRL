'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function ProductosPage() {
    const [busqueda, setBusqueda] = useState('');
    const [mostrarInactivos, setMostrarInactivos] = useState(false);
    const [categoria, setCategoria] = useState('ALL');

    const { data: productos, isLoading } = useQuery({
        queryKey: ['productos', busqueda, mostrarInactivos, categoria],
        queryFn: async () => {
            let q = supabase.from('productos').select(`*, stock(cantidad, almacen_id)`);
            if (!mostrarInactivos) q = q.eq('activo', true);
            if (categoria !== 'ALL') q = q.eq('categoria', categoria);
            if (busqueda) q = q.ilike('descripcion', `%${busqueda}%`);
            const { data, error } = await q.order('descripcion');
            if (error) throw error;
            return data;
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                        Productos
                        <Badge variant="secondary" className="text-sm">{productos?.length || 0} activos</Badge>
                    </h1>
                </div>
                <Button className="bg-primary hover:bg-primary/90 text-white font-medium">
                    <Plus className="w-4 h-4 mr-2" /> Nuevo Producto
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Buscar por código o descripción..."
                        className="pl-9"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
                <Select value={categoria} onValueChange={(v) => setCategoria(v)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todas las categorías</SelectItem>
                        <SelectItem value="embutido_frio">Embutido Frío</SelectItem>
                        <SelectItem value="empacado">Empacado</SelectItem>
                        <SelectItem value="otros">Otros</SelectItem>
                    </SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-600 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={mostrarInactivos}
                        onChange={(e) => setMostrarInactivos(e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    Mostrar inactivos
                </label>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50/80">
                        <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Unidad</TableHead>
                            <TableHead className="text-right">Precio A</TableHead>
                            <TableHead className="text-right">Precio B</TableHead>
                            <TableHead className="text-right">Stock</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-500">Cargando...</TableCell></TableRow>
                        ) : productos?.length === 0 ? (
                            <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-500">No se encontraron productos.</TableCell></TableRow>
                        ) : (
                            productos?.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-medium text-gray-900">{p.codigo}</TableCell>
                                    <TableCell>
                                        {p.descripcion}
                                        <div className="text-xs text-gray-400 mt-1">{p.categoria}</div>
                                    </TableCell>
                                    <TableCell>{p.unidad_medida}</TableCell>
                                    <TableCell className="text-right">S/ {p.precio_lista_a?.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">S/ {p.precio_lista_b?.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-medium text-blue-600">
                                        {p.stock?.[0]?.cantidad || 0}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={p.activo ? 'default' : 'destructive'} className={p.activo ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}>
                                            {p.activo ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600"><Edit2 className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600"><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
