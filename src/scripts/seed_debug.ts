import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('--- DEBUG SEED START ---');

    // 1. Check Empresa
    const { data: empresa, error: eErr } = await supabase.from('empresas').select('*').limit(1).single();
    console.log('Empresa:', empresa ? 'Found' : 'Not Found', eErr || '');
    if (!empresa) return;

    // 2. Try to insert ONE product
    console.log('Testing single product insert...');
    const product = {
        empresa_id: empresa.id,
        codigo: 'DEBUG-001',
        descripcion: 'Producto de Prueba Debug',
        unidad_medida: 'UND',
        precio_lista_a: 50,
        precio_lista_b: 45,
        precio_compra: 30,
        categoria: 'Carnes',
        stock_minimo: 5
    };

    const { data: pData, error: pErr } = await supabase.from('productos').upsert(product, { onConflict: 'codigo' }).select();
    console.log('Product Result:', pData ? 'Success' : 'Fail', pErr || '');

    // 3. Try to insert ONE client
    console.log('Testing single client insert...');
    const client = {
        empresa_id: empresa.id,
        tipo_documento: 'RUC',
        numero_documento: '20999999999',
        razon_social: 'Cliente Debug SAC',
        direccion: 'Calle Debug 123',
        tipo_cliente: 'mayorista',
        limite_credito: 1000
    };
    const { data: cData, error: cErr } = await supabase.from('clientes').upsert(client, { onConflict: 'numero_documento' }).select();
    console.log('Client Result:', cData ? 'Success' : 'Fail', cErr || '');

    console.log('--- DEBUG SEED END ---');
}

run();
