'use client';
import { useState, useEffect } from 'react';
import { ArrowLeft, Save, FileCheck, Minus, Plus as PlusIcon, AlertTriangle, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function MobilePedidoPage({ params }: { params: { clienteId: string } }) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [gpsData, setGpsData] = useState<{ lat: number, lng: number } | null>(null);

    // Cart State
    const [cart, setCart] = useState<{ product: any, cantidad: number }[]>([]);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                setGpsData({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            });
        }
    }, []);

    // Load Client Info
    const { data: cliente } = useQuery({
        queryKey: ['cliente', params.clienteId],
        queryFn: async () => {
            const { data, error } = await supabase.from('clientes').select('*').eq('id', params.clienteId).single();
            if (error) throw error;
            return data;
        }
    });

    // Load available products
    const { data: productos } = useQuery({
        queryKey: ['productos'],
        queryFn: async () => {
            const { data, error } = await supabase.from('productos').select('*').eq('activo', true);
            if (error) throw error;
            return data;
        }
    });

    const agregarAlCarrito = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const prodId = e.target.value;
        if (!prodId) return;
        const producto = productos?.find(p => p.id === prodId);
        if (!producto) return;

        const existing = cart.find(c => c.product.id === prodId);
        if (existing) {
            setCart(cart.map(c => c.product.id === prodId ? { ...c, cantidad: c.cantidad + 1 } : c));
        } else {
            setCart([...cart, { product: producto, cantidad: 1 }]);
        }
    };

    const updateCantidad = (prodId: string, delta: number) => {
        setCart(cart.map(c => {
            if (c.product.id === prodId) {
                const newQty = Math.max(0, c.cantidad + delta);
                return { ...c, cantidad: newQty };
            }
            return c;
        }).filter(c => c.cantidad > 0));
    };

    const total = cart.reduce((acc, c) => acc + (c.cantidad * c.product.precio_lista_a), 0);

    const mutationConfirm = useMutation({
        mutationFn: async () => {
            if (cart.length === 0) throw new Error("Carrito vacío");
            const userRes = await supabase.auth.getUser();
            const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', userRes.data.user?.id).single();

            // Insert Pedido
            const { data: pedido, error: errPed } = await supabase.from('pedidos').insert([{
                empresa_id: usuario?.empresa_id,
                vendedor_id: userRes.data.user?.id,
                cliente_id: params.clienteId,
                numero: 'P-' + Math.floor(Math.random() * 100000),
                fecha_pedido: new Date().toISOString().split('T')[0],
                fecha_entrega_programada: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
                estado: 'pendiente',
                subtotal: total,
                total: total,
                latitud_pedido: gpsData?.lat,
                longitud_pedido: gpsData?.lng
            }]).select().single();

            if (errPed) throw errPed;

            // Insert Items
            const itemsToInsert = cart.map(c => ({
                pedido_id: pedido.id,
                producto_id: c.product.id,
                descripcion: c.product.descripcion,
                cantidad: c.cantidad,
                unidad_medida: c.product.unidad_medida,
                precio_unitario: c.product.precio_lista_a,
                valor_venta: c.cantidad * c.product.precio_lista_a,
                precio_total: c.cantidad * c.product.precio_lista_a
            }));

            const { error: errItems } = await supabase.from('pedido_items').insert(itemsToInsert);
            if (errItems) throw errItems;
        },
        onSuccess: () => {
            router.push('/app-vendedor');
        }
    });

    return (
        <div className="flex-1 bg-gray-50 flex flex-col h-[calc(100vh-60px)]">
            <div className="bg-white px-4 py-3 border-b flex items-center justify-between sticky top-0 z-20 shadow-sm shrink-0">
                <Link href="/app-vendedor">
                    <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8">
                        <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </Button>
                </Link>
                <span className="font-semibold grow text-center text-sm truncate mr-6">{cliente?.razon_social || 'Cargando...'}</span>
            </div>

            <div className="flex-1 overflow-y-auto pb-6">
                {(cliente?.estado === 'deuda' || cliente?.estado === 'bloqueado') && (
                    <div className="bg-red-50 p-3 border-b border-red-100 flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div className="flex flex-col text-sm text-red-800">
                            <strong>⚠️ CLIENTE BLOQUEADO O CON DEUDA</strong>
                            <span>Generar un pedido requiere autorización gerencial.</span>
                        </div>
                    </div>
                )}

                <div className="p-4 space-y-4">
                    <Card>
                        <CardContent className="p-4 flex flex-col gap-2 bg-gray-100/50">
                            <span className="text-sm font-medium flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Agregar Productos</span>
                            <select className="w-full h-10 px-2 rounded border border-gray-300" onChange={agregarAlCarrito} value="">
                                <option value="" disabled>Seleccione un producto...</option>
                                {productos?.map(p => (
                                    <option key={p.id} value={p.id}>{p.descripcion} - S/ {p.precio_lista_a}</option>
                                ))}
                            </select>
                        </CardContent>
                    </Card>

                    <h3 className="font-semibold text-gray-800 mt-4">Carrito de Productos ({cart.length})</h3>
                    <div className="space-y-3">
                        {cart.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                                El carrito está vacío. Agregue productos arriba.
                            </div>
                        ) : cart.map(c => (
                            <Card key={c.product.id} className="shadow-sm">
                                <CardContent className="p-3">
                                    <div className="flex justify-between font-medium text-gray-900 mb-2">
                                        <span className="truncate pr-2">{c.product.descripcion}</span>
                                        <span>S/ {(c.cantidad * c.product.precio_lista_a).toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                                        <div className="flex flex-col">
                                            <span className="text-sm text-gray-500">S/ {c.product.precio_lista_a.toFixed(2)} c/u</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Button variant="outline" size="icon" className="w-7 h-7 rounded-full" onClick={() => updateCantidad(c.product.id, -1)}><Minus className="w-3 h-3" /></Button>
                                            <span className="w-8 text-center text-sm font-semibold">{c.cantidad}</span>
                                            <Button variant="outline" size="icon" className="w-7 h-7 rounded-full" onClick={() => updateCantidad(c.product.id, 1)}><PlusIcon className="w-3 h-3" /></Button>
                                            <Button variant="ghost" size="icon" className="w-7 h-7 ml-2 text-red-500" onClick={() => updateCantidad(c.product.id, -c.cantidad)}><Trash2 className="w-4 h-4" /></Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white border-t border-gray-200 p-4 shrink-0 pb-safe">
                <div className="flex justify-between items-center mb-4 text-lg font-bold">
                    <span>Total a Pagar</span>
                    <span className="text-primary text-xl">S/ {total.toFixed(2)}</span>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 border-gray-300">
                        <Save className="w-4 h-4 mr-2 text-gray-500" /> Borrador
                    </Button>
                    <Button className="flex-[2] bg-primary hover:bg-primary/90" onClick={() => mutationConfirm.mutate()} disabled={cart.length === 0 || mutationConfirm.isPending}>
                        <FileCheck className="w-4 h-4 mr-2" />
                        {mutationConfirm.isPending ? 'Confirmando...' : 'Confirmar Pedido'}
                    </Button>
                </div>
                {gpsData && (
                    <div className="text-[10px] text-center text-gray-400 mt-2">
                        📍 GPS registrado: {gpsData.lat.toFixed(4)}, {gpsData.lng.toFixed(4)}
                    </div>
                )}
            </div>
        </div>
    );
}
