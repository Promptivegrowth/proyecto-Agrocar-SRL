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

        const payload = { ...data, empresa_id: usuario.empresa_id }

        if (productId) {
            const { error } = await supabase.from('productos').update(payload).eq('id', productId)
            if (error) throw error
        } else {
            const { error } = await supabase.from('productos').insert([payload])
            if (error) throw error
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
