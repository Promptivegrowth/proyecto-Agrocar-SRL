const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(url, key);

async function seed() {
    console.log('=== AGROCAR SEED ===');

    // 1. Get empresa_id and some clients
    const { data: empresa } = await supabase.from('empresas').select('id').limit(1).single();
    const empresaId = empresa?.id;
    if (!empresaId) { console.error('No empresa found!'); return; }
    console.log('empresa_id:', empresaId);

    const { data: clientes } = await supabase
        .from('clientes')
        .select('id, razon_social, numero_documento, tipo_documento')
        .limit(6);
    console.log('Clients found:', clientes?.length);

    // 2. Update credit limits for first 4 clients (so data makes sense)
    const creditLimits = [5000, 3000, 8000, 2000, 0, 1500];
    for (let i = 0; i < Math.min(clientes?.length || 0, 6); i++) {
        await supabase.from('clientes').update({ limite_credito: creditLimits[i] }).eq('id', clientes[i].id);
        console.log(`Updated credit limit for ${clientes[i].razon_social}: S/ ${creditLimits[i]}`);
    }

    // 3. Check existing comprobantes to avoid duplicates
    const { data: existingComp } = await supabase.from('comprobantes').select('numero_completo').eq('tipo', 'DI').limit(5);
    console.log('Existing DI comprobantes:', existingComp?.length || 0);

    // 4. Insert pending debt comprobantes (invoices) for clients
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);
    const twoWeeksAgo = new Date(today); twoWeeksAgo.setDate(today.getDate() - 14);
    const monthAgo = new Date(today); monthAgo.setDate(today.getDate() - 30);

    const fmt = (d) => d.toISOString().split('T')[0];

    const pendingInvoices = [
        { cli: clientes?.[0], serie: 'F001', corr: 901, monto: 2450.80, fecha: fmt(weekAgo), tipo_doc: 'RUC' },
        { cli: clientes?.[0], serie: 'F001', corr: 902, monto: 1899.50, fecha: fmt(monthAgo), tipo_doc: 'RUC' },
        { cli: clientes?.[1], serie: 'F001', corr: 903, monto: 3200.00, fecha: fmt(twoWeeksAgo), tipo_doc: 'RUC' },
        { cli: clientes?.[2], serie: 'B001', corr: 904, monto: 780.30, fecha: fmt(yesterday), tipo_doc: 'DNI' },
        { cli: clientes?.[2], serie: 'B001', corr: 905, monto: 1540.00, fecha: fmt(weekAgo), tipo_doc: 'DNI' },
        { cli: clientes?.[3], serie: 'F001', corr: 906, monto: 910.75, fecha: fmt(monthAgo), tipo_doc: 'RUC' },
        { cli: clientes?.[4], serie: 'B001', corr: 907, monto: 475.20, fecha: fmt(yesterday), tipo_doc: 'DNI' },
        { cli: clientes?.[5], serie: 'F001', corr: 908, monto: 2100.00, fecha: fmt(twoWeeksAgo), tipo_doc: 'RUC' },
    ];

    for (const inv of pendingInvoices) {
        if (!inv.cli) continue;
        const numCompleto = `${inv.serie}-${String(inv.corr).padStart(8, '0')}`;
        const tipoDoc = inv.serie.startsWith('F') ? '01' : '03';
        const baseImponible = +(inv.monto / 1.18).toFixed(2);
        const igv = +(inv.monto - baseImponible).toFixed(2);

        const { error } = await supabase.from('comprobantes').insert({
            empresa_id: empresaId,
            tipo: tipoDoc,
            serie: inv.serie,
            correlativo: inv.corr,
            numero_completo: numCompleto,
            fecha_emision: inv.fecha,
            cliente_id: inv.cli.id,
            tipo_doc_cliente: inv.tipo_doc,
            num_doc_cliente: inv.cli.numero_documento,
            razon_social_cliente: inv.cli.razon_social,
            moneda: 'PEN',
            subtotal: baseImponible,
            base_imponible: baseImponible,
            igv: igv,
            descuento: 0,
            total: inv.monto,
            condicion_pago: 'credito',
            estado_pago: 'pendiente',
            monto_pagado: 0,
            sunat_estado: 'pendiente',
        });
        if (error) console.error(`Error inserting ${numCompleto}:`, error.message);
        else console.log(`Inserted pending invoice: ${numCompleto} for ${inv.cli.razon_social} - S/ ${inv.monto}`);
    }

    // 5. Insert sample DI receipts (simulating past payments)
    const diReceipts = [
        { cli: clientes?.[0], corr: 1, monto: 800.00, fecha: fmt(twoWeeksAgo), ref: 'F001-00000850' },
        { cli: clientes?.[1], corr: 2, monto: 1500.00, fecha: fmt(weekAgo), ref: 'F001-00000820' },
        { cli: clientes?.[2], corr: 3, monto: 350.50, fecha: fmt(yesterday), ref: 'B001-00000790' },
        { cli: clientes?.[3], corr: 4, monto: 200.00, fecha: fmt(today), ref: 'F001-00000870' },
    ];

    for (const rc of diReceipts) {
        if (!rc.cli) continue;
        const numCompleto = `RC01-${String(rc.corr).padStart(8, '0')}`;
        const { error } = await supabase.from('comprobantes').insert({
            empresa_id: empresaId,
            tipo: 'DI',
            serie: 'RC01',
            correlativo: rc.corr,
            numero_completo: numCompleto,
            fecha_emision: rc.fecha,
            cliente_id: rc.cli.id,
            tipo_doc_cliente: 'DNI',
            num_doc_cliente: rc.cli.numero_documento,
            razon_social_cliente: rc.cli.razon_social,
            direccion_cliente: 'COBRANZA DE DOCUMENTO: ' + rc.ref,
            moneda: 'PEN',
            subtotal: rc.monto,
            base_imponible: rc.monto,
            igv: 0,
            descuento: 0,
            total: rc.monto,
            condicion_pago: 'contado',
            monto_pagado: rc.monto,
            estado_pago: 'pagado',
            sunat_estado: 'pendiente',
        });
        if (error) console.error(`Error inserting DI ${numCompleto}:`, error.message);
        else console.log(`Inserted DI receipt: ${numCompleto} for ${rc.cli.razon_social} - S/ ${rc.monto}`);
    }

    // 6. Verify
    const { data: diCheck } = await supabase.from('comprobantes').select('id,numero_completo,total').eq('tipo', 'DI').limit(10);
    console.log('\n=== VERIFICATION ===');
    console.log(`DI records in DB: ${diCheck?.length || 0}`);
    diCheck?.forEach(d => console.log(` - ${d.numero_completo}: S/ ${d.total}`));
    console.log('=== SEED DONE ===');
}

seed().catch(console.error);
