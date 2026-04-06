const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(url, key);

async function seed() {
    console.log('=== SEEDING FRESH FLEET DATA ===');

    const { data: empresa } = await supabase.from('empresas').select('id').limit(1).single();
    if (!empresa) { console.error('No empresa found'); return; }

    const today = new Date();
    const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
    const lastMonth = new Date(today); lastMonth.setMonth(today.getMonth() - 1);
    const fmt = (d) => d.toISOString().split('T')[0];

    const vehiclesToAdd = [
        {
            empresa_id: empresa.id,
            placa: 'AGR-101',
            marca: 'HINO',
            modelo: '300 Series',
            anio: 2022,
            km_actual: 15200,
            ultimo_km_aceite: 10000,
            objetivo_km_aceite: 5000,
            venc_soat: fmt(nextWeek),
            venc_revision: fmt(nextWeek),
            tiene_papeletas: true,
            monto_papeletas: 450.00,
            activo: true,
            capacidad_kg: 5000
        },
        {
            empresa_id: empresa.id,
            placa: 'AGR-202',
            marca: 'TOYOTA',
            modelo: 'Hilux',
            anio: 2023,
            km_actual: 8450,
            ultimo_km_aceite: 8000,
            objetivo_km_aceite: 5000,
            venc_soat: fmt(lastMonth), // ALERTA: Vencido
            venc_revision: '2026-10-15',
            tiene_papeletas: false,
            monto_papeletas: 0,
            activo: true,
            capacidad_kg: 1000
        },
        {
            empresa_id: empresa.id,
            placa: 'AGR-303',
            marca: 'MERCEDES',
            modelo: 'Sprinter',
            anio: 2021,
            km_actual: 28500,
            ultimo_km_aceite: 28000,
            objetivo_km_aceite: 5000,
            venc_soat: '2026-12-31',
            venc_revision: '2027-01-15',
            tiene_papeletas: true,
            monto_papeletas: 120.50,
            activo: true,
            capacidad_kg: 2500
        }
    ];

    for (const v of vehiclesToAdd) {
        const { error } = await supabase.from('vehiculos').insert(v);
        if (error) console.error(`Error inserting ${v.placa}:`, error.message);
        else console.log(`Inserted vehicle: ${v.placa}`);
    }

    // 3. Insert specific alerts into fleet_alertas
    const { data: vList } = await supabase.from('vehiculos').select('id, placa').in('placa', ['AGR-101', 'AGR-202', 'AGR-303']);

    if (vList) {
        const alertsToAdd = [
            {
                empresa_id: empresa.id,
                vehiculo_id: vList.find(v => v.placa === 'AGR-101').id,
                tipo: 'mantenimiento',
                titulo: 'Cambio de Aceite Requerido',
                descripcion: 'El vehículo ha superado los 5000km desde el último cambio.',
                prioridad: 'alta',
                estado: 'pendiente'
            },
            {
                empresa_id: empresa.id,
                vehiculo_id: vList.find(v => v.placa === 'AGR-202').id,
                tipo: 'soat',
                titulo: 'SOAT Vencido',
                descripcion: 'Renovación inmediata requerida.',
                prioridad: 'critica',
                fecha_vencimiento: fmt(lastMonth),
                estado: 'vencido'
            },
            {
                empresa_id: empresa.id,
                vehiculo_id: vList.find(v => v.placa === 'AGR-303').id,
                tipo: 'multa',
                titulo: 'Papeleta Pendiente',
                descripcion: 'Monto: S/ 120.50 - Pago pendiente.',
                prioridad: 'media',
                monto: 120.50,
                estado: 'pendiente'
            }
        ];

        for (const a of alertsToAdd) {
            await supabase.from('fleet_alertas').insert(a);
        }
    }

    console.log('Fleet and alerts seeded successfully.');
}

seed().catch(console.error);
