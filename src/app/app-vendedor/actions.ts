'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function registrarCheckin(clienteId: string, lat: number, lng: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    try {
        // 1. Verificar si ya hay una visita activa
        const { data: activa } = await supabase
            .from('visitas_gps')
            .select('id')
            .eq('vendedor_id', user.id)
            .is('hora_checkout', null)
            .maybeSingle();

        if (activa) return { error: 'Ya tienes una visita activa. Finalízala antes de iniciar otra.' };

        // 2. Crear nueva visita
        const { data: visita, error } = await supabase
            .from('visitas_gps')
            .insert([{
                vendedor_id: user.id,
                cliente_id: clienteId,
                fecha: new Date().toISOString().split('T')[0],
                hora_checkin: new Date().toISOString(),
                latitud_checkin: lat,
                longitud_checkin: lng
            }])
            .select()
            .single();

        if (error) throw error;

        // 3. Registrar en tracking general
        await registrarTracking(lat, lng, 0);

        revalidatePath('/app-vendedor');
        return { success: true, data: visita };
    } catch (e: any) {
        console.error('Checkin Error:', e);
        return { error: e.message };
    }
}

export async function registrarCheckout(visitaId: string, lat: number, lng: number, resultado: string, observaciones: string) {
    const supabase = await createClient();
    try {
        const { error } = await supabase
            .from('visitas_gps')
            .update({
                hora_checkout: new Date().toISOString(),
                latitud_checkout: lat,
                longitud_checkout: lng,
                resultado,
                observaciones
            })
            .eq('id', visitaId);

        if (error) throw error;

        await registrarTracking(lat, lng, 0);
        revalidatePath('/app-vendedor');
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function registrarTracking(lat: number, lng: number, velocidad: number = 0) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('tracking_gps').insert([{
        usuario_id: user.id,
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toISOString(),
        latitud: lat,
        longitud: lng,
        velocidad
    }]);
}

export async function registrarAsistencia(tipo: 'ingreso' | 'salida') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    try {
        await supabase.from('tracking_gps').insert([{
            usuario_id: user.id,
            fecha: new Date().toISOString().split('T')[0],
            hora: new Date().toISOString(),
            latitud: 0,
            longitud: 0,
            velocidad: tipo === 'ingreso' ? -1 : -2
        }]);

        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function registrarProspecto(data: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    try {
        const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single();
        if (!usuario) return { error: 'Usuario sin empresa vinculada' };

        // Ensure we send valid fields for the DB
        const { error } = await supabase.from('clientes').insert([{
            ...data,
            empresa_id: usuario.empresa_id,
            vendedor_asignado_id: user.id,
            estado: 'activo',
            tipo_cliente: 'prospecto',
            lista_precio: 'B'
        }]);

        if (error) throw error;
        revalidatePath('/app-vendedor');
        return { success: true };
    } catch (e: any) {
        console.error('Prospecto Error:', e);
        return { error: e.message };
    }
}
