'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function ProductosPage() {
    const queryClient = useQueryClient();
    const [busqueda, setBusqueda] = useState('');
    const [mostrarInactivos, setMostrarInactivos] = useState(false);
    const [categoria, setCategoria] = useState('ALL');

    // Form State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentCode, setCurrentCode] = useState('');
    const [currentProduct, setCurrentProduct] = useState<any>(null);

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

    const mutationSave = useMutation({
        mutationFn: async (product: any) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error('Sesión expirada. Por favor, inicie sesión nuevamente.');
                window.location.href = '/login';
                return;
            }

            const { data: usuario, error: userError } = await supabase
                .from('usuarios')
                .select('empresa_id')
                .eq('id', user.id)
                .single();

            if (userError || !usuario) {
                console.error('Error fetching user data:', userError);
                throw new Error('No se pudo encontrar la empresa vinculada al usuario.');
            }

            const payload = { ...product, empresa_id: usuario.empresa_id };

            if (currentProduct) {
                const { error } = await supabase.from('productos').update(payload).eq('id', currentProduct.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('productos').insert([payload]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['productos'] });
            toast.success(currentProduct ? 'Producto actualizado' : 'Producto creado correctamente');
            setIsDialogOpen(false);
            setCurrentProduct(null);
        },
        onError: (error: any) => {
            toast.error('Error al guardar: ' + (error.message || 'Error desconocido'));
        }
    });

    const mutationDelete = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('productos').update({ activo: false }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['productos'] });
            toast.success('Producto desactivado');
        },
        onError: (error: any) => {
            toast.error('Error al eliminar: ' + error.message);
        }
    });

    const openEdit = (p: any) => {
        setCurrentProduct(p);
        setIsDialogOpen(true);
    };

    const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const data = {
            codigo: fd.get('codigo'),
            descripcion: fd.get('descripcion'),
            categoria: fd.get('categoria'),
            unidad_medida: fd.get('unidad_medida'),
            precio_lista_a: parseFloat(fd.get('precio_lista_a') as string),
            precio_lista_b: parseFloat(fd.get('precio_lista_b') as string),
            stock_minimo: parseFloat(fd.get('stock_minimo') as string),
        };
        mutationSave.mutate(data);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                        Productos
                        <Badge variant="secondary" className="text-sm">{productos?.length || 0} listados</Badge>
                    </h1>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger
                        render={
                            <Button className="bg-primary hover:bg-primary/90 text-white font-medium" onClick={() => setCurrentProduct(null)}>
                                <Plus className="w-4 h-4 mr-2" /> Nuevo Producto
                            </Button>
                        }
                    />
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{currentProduct ? 'Editar Producto' : 'Crear Producto'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSave} className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Código</Label>
                                    <Input name="codigo" defaultValue={currentProduct?.codigo} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Unidad Medida</Label>
                                    <Input name="unidad_medida" defaultValue={currentProduct?.unidad_medida || 'UND'} required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Descripción</Label>
                                <Input name="descripcion" defaultValue={currentProduct?.descripcion} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Categoría</Label>
                                    <Input name="categoria" defaultValue={currentProduct?.categoria} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Stock Mínimo</Label>
                                    <Input name="stock_minimo" type="number" step="0.01" defaultValue={currentProduct?.stock_minimo || '10'} required />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Precio A</Label>
                                    <Input name="precio_lista_a" type="number" step="0.01" defaultValue={currentProduct?.precio_lista_a || ''} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Precio B</Label>
                                    <Input name="precio_lista_b" type="number" step="0.01" defaultValue={currentProduct?.precio_lista_b || ''} required />
                                </div>
                            </div>
                            <DialogFooter className="mt-4">
                                <Button type="submit" disabled={mutationSave.isPending} className="w-full bg-[#1A2C45] text-white">
                                    {mutationSave.isPending ? 'Guardando...' : 'Guardar Producto'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
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
                <Select value={categoria} onValueChange={(v) => v && setCategoria(v)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todas las categorías</SelectItem>
                        <SelectItem value="Carnes">Carnes</SelectItem>
                        <SelectItem value="Lácteos">Lácteos</SelectItem>
                        <SelectItem value="Pescados">Pescados</SelectItem>
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
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => openEdit(p)}><Edit2 className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => mutationDelete.mutate(p.id)} disabled={mutationDelete.isPending}><Trash2 className="h-4 w-4" /></Button>
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

