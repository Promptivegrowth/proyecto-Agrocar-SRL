'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function guardarProducto(data: any, productId?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Sesión expirada' }

    try {
        const { data: usuario } = await supabase
            .from('usuarios')
            .select('empresa_id')
            .eq('id', user.id)
            .single()

        if (!usuario) throw new Error('Usuario no vinculado a empresa')

        const payload: any = {
            ...data,
            empresa_id: usuario.empresa_id,
        }

        if (!productId) {
            payload.activo = true;
            payload.created_at = new Date().toISOString();
        }

        let result;
        if (productId) {
            result = await supabase.from('productos').update(payload).eq('id', productId).select().single()
        } else {
            result = await supabase.from('productos').insert([payload]).select().single()
        }

        if (result.error) {
            console.error('Error en Supabase:', result.error)
            throw result.error
        }

        revalidatePath('/maestros/productos')
        return { success: true }
    } catch (error: any) {
        return { error: error.message }
    }
}

export async function eliminarProducto(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('productos').update({ activo: false }).eq('id', id)
    if (error) return { error: error.message }

    revalidatePath('/maestros/productos')
    return { success: true }
}

export async function guardarCliente(data: any, clienteId?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Sesión expirada' }

    try {
        const { data: usuario } = await supabase
            .from('usuarios')
            .select('empresa_id')
            .eq('id', user.id)
            .single()

        if (!usuario) throw new Error('Usuario no vinculado a empresa')

        const payload = {
            ...data,
            empresa_id: usuario.empresa_id,
        }

        let result;
        if (clienteId) {
            result = await supabase.from('clientes').update(payload).eq('id', clienteId)
        } else {
            result = await supabase.from('clientes').insert([payload])
        }

        if (result.error) throw result.error

        revalidatePath('/maestros/clientes')
        revalidatePath('/(backoffice)/maestros/clientes')
        return { success: true }
    } catch (error: any) {
        return { error: error.message }
    }
}

export async function toggleEstadoCliente(id: string, estado: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('clientes').update({ estado }).eq('id', id)
    if (error) return { error: error.message }

    revalidatePath('/maestros/clientes')
    return { success: true }
}
