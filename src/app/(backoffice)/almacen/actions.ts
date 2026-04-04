'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function registrarIngreso(data: {
    proveedor: string;
    tipoDoc: string;
    serieDoc: string;
    correlativo: string;
    almacenId: string;
    items: any[];
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Sesión expirada' }

    try {
        const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single()

        let targetAlmacenId = data.almacenId;
        if (!targetAlmacenId) {
            const { data: almacen } = await supabase.from('almacenes').select('id').eq('empresa_id', usuario?.empresa_id).limit(1).single()
            targetAlmacenId = almacen?.id;
        }

        if (!targetAlmacenId) throw new Error('No se encontró almacén configurado')

        // 1. Create Compra
        const { data: compra, error: eCompra } = await supabase.from('compras').insert([{
            empresa_id: usuario?.empresa_id,
            usuario_id: user.id,
            proveedor_nombre: data.proveedor || 'Proveedor Genérico',
            tipo_doc: data.tipoDoc,
            serie_doc: data.serieDoc,
            numero_doc: data.correlativo,
            fecha: new Date().toISOString(),
            total: data.items.reduce((acc, it) => acc + (it.cantidad * it.costo), 0)
        }]).select().single()

        if (eCompra) throw eCompra

        // 2. Process items
        for (const it of data.items) {
            // Add to compra_items
            await supabase.from('compra_items').insert([{
                compra_id: compra.id,
                producto_id: it.producto_id,
                cantidad: it.cantidad,
                costo_unitario: it.costo,
                total: it.cantidad * it.costo
            }])

            // Update Stock & Movement
            const { data: currentStock } = await supabase.from('stock')
                .select('id, cantidad')
                .eq('producto_id', it.producto_id)
                .eq('almacen_id', targetAlmacenId)
                .single()

            const nuevaCantidad = (Number(currentStock?.cantidad) || 0) + Number(it.cantidad)

            if (currentStock) {
                await supabase.from('stock').update({ cantidad: nuevaCantidad }).eq('id', currentStock.id)
            } else {
                await supabase.from('stock').insert([{
                    producto_id: it.producto_id,
                    almacen_id: targetAlmacenId,
                    cantidad: it.cantidad,
                    empresa_id: usuario?.empresa_id
                }])
            }

            // Record movement
            await supabase.from('stock_movimientos').insert([{
                empresa_id: usuario?.empresa_id,
                producto_id: it.producto_id,
                almacen_id: targetAlmacenId,
                tipo: 'entrada',
                motivo: 'Compra',
                referencia_id: compra.id,
                referencia_tipo: 'compras',
                cantidad: it.cantidad,
                saldo_posterior: nuevaCantidad,
                usuario_id: user.id
            }])
        }

        revalidatePath('/almacen')
        return { success: true }
    } catch (error: any) {
        console.error('Error en registrarIngreso:', error)
        return { error: error.message }
    }
}

export async function registrarTransferencia(data: {
    producto_id: string;
    almacen_origen_id: string;
    almacen_destino_id: string;
    cantidad: number;
    motivo: string;
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Sesión expirada' }

    try {
        const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single()

        // 1. Decrease from origin
        const { data: stockOrg } = await supabase.from('stock').select('id, cantidad').eq('producto_id', data.producto_id).eq('almacen_id', data.almacen_origen_id).single()
        if (!stockOrg || stockOrg.cantidad < data.cantidad) throw new Error('Stock insuficiente en origen')

        const saldoOrg = Number(stockOrg.cantidad) - Number(data.cantidad)
        await supabase.from('stock').update({ cantidad: saldoOrg }).eq('id', stockOrg.id)

        // 2. Increase in destination
        const { data: stockDest } = await supabase.from('stock').select('id, cantidad').eq('producto_id', data.producto_id).eq('almacen_id', data.almacen_destino_id).single()
        const saldoDest = (Number(stockDest?.cantidad) || 0) + Number(data.cantidad)

        if (stockDest) {
            await supabase.from('stock').update({ cantidad: saldoDest }).eq('id', stockDest.id)
        } else {
            await supabase.from('stock').insert([{
                producto_id: data.producto_id,
                almacen_id: data.almacen_destino_id,
                cantidad: data.cantidad,
                empresa_id: usuario?.empresa_id
            }])
        }

        // 3. Record movements
        await supabase.from('stock_movimientos').insert([
            {
                empresa_id: usuario?.empresa_id,
                producto_id: data.producto_id,
                almacen_id: data.almacen_origen_id,
                tipo: 'salida',
                motivo: 'Transferencia (Salida)',
                cantidad: data.cantidad,
                saldo_posterior: saldoOrg,
                usuario_id: user.id
            },
            {
                empresa_id: usuario?.empresa_id,
                producto_id: data.producto_id,
                almacen_id: data.almacen_destino_id,
                tipo: 'entrada',
                motivo: 'Transferencia (Entrada)',
                cantidad: data.cantidad,
                saldo_posterior: saldoDest,
                usuario_id: user.id
            }
        ])

        revalidatePath('/almacen')
        return { success: true }
    } catch (error: any) {
        return { error: error.message }
    }
}
