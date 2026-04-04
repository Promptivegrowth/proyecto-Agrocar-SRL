'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function registrarCheckin(clienteId: string, lat: number, lng: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    try {
        // 1. Verificar si ya hay una visita activa (check both column names)
        const { data: activa } = await supabase
            .from('visitas_gps')
            .select('id')
            .or(`vendedor_id.eq.${user.id},usuario_id.eq.${user.id}`)
            .is('hora_checkout', null)
            .maybeSingle();

        if (activa) return { error: 'Ya tienes una visita activa. Finalízala antes de iniciar otra.' };

        // 2. Crear nueva visita — try vendedor_id first
        const basePayload = {
            cliente_id: clienteId,
            fecha: new Date().toISOString().split('T')[0],
            hora_checkin: new Date().toISOString(),
            latitud_checkin: lat,
            longitud_checkin: lng
        };

        const { data: visita, error: err } = await supabase
            .from('visitas_gps')
            .insert([{ ...basePayload, vendedor_id: user.id }])
            .select().single();

        if (err) {
            // Fallback: try usuario_id column
            const { data: visita2, error: err2 } = await supabase
                .from('visitas_gps')
                .insert([{ ...basePayload, usuario_id: user.id }])
                .select().single();
            if (err2) throw err2;
            await registrarTracking(lat, lng, 0);
            revalidatePath('/app-vendedor');
            return { success: true, data: visita2 };
        }

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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'No autenticado' };

    // Check current state to prevent double ingreso/salida
    const today = new Date().toISOString().split('T')[0];
    const { data: ultimoRegistro } = await supabase
        .from('tracking_gps')
        .select('velocidad')
        .eq('usuario_id', user.id)
        .eq('fecha', today)
        .in('velocidad', [-1, -2])
        .order('hora', { ascending: false })
        .limit(1)
        .maybeSingle();

    const estaIngresado = ultimoRegistro?.velocidad === -1;

    // Prevent duplicate actions
    if (tipo === 'ingreso' && estaIngresado) {
        return { error: 'Ya tienes registrado el ingreso de hoy. Marca tu salida primero.' };
    }
    if (tipo === 'salida' && !estaIngresado) {
        return { error: 'No tienes un ingreso activo. Registra tu ingreso primero.' };
    }

    const { error: insertError } = await supabase.from('tracking_gps').insert([{
        usuario_id: user.id,
        fecha: today,
        hora: new Date().toISOString(),
        latitud: 0,
        longitud: 0,
        velocidad: tipo === 'ingreso' ? -1 : -2
    }]);

    if (insertError) {
        console.error('registrarAsistencia error:', insertError);
        return { error: `Error al registrar ${tipo}: ${insertError.message}` };
    }

    revalidatePath('/app-vendedor');
    return { success: true, tipo };
}

export async function registrarProspecto(data: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    try {
        const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single();
        if (!usuario) return { error: 'Usuario sin empresa vinculada' };

        // Ensure valid fields for the DB
        const payload = {
            ...data,
            empresa_id: usuario.empresa_id,
            vendedor_asignado_id: user.id,
            estado: 'activo',
            tipo_cliente: 'prospecto',
            lista_precio: 'B'
        };

        const { error } = await supabase.from('clientes').insert([payload]);
        if (error) throw error;

        revalidatePath('/app-vendedor');
        return { success: true };
    } catch (e: any) {
        console.error('Prospecto Error:', e);
        return { error: e.message };
    }
}

export async function forzarCheckout() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    try {
        await supabase.from('visitas_gps')
            .update({
                hora_checkout: new Date().toISOString(),
                resultado: 'CANCELADO/FORZADO',
                observaciones: 'Cierre forzado por el usuario'
            })
            .eq('vendedor_id', user.id)
            .is('hora_checkout', null);

        revalidatePath('/app-vendedor');
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}
