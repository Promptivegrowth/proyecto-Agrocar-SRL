'use server';
import { createClient } from '@/utils/supabase/server';

export async function checkTipoCliente() {
    const supabase = await createClient();
    const { data } = await supabase.from('clientes').select('tipo_cliente').limit(10);
    return data;
}
