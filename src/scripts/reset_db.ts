import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const managementToken = "sbp_d4bb36c0daad29f3cdc67adfef95e5eee65cdffb";
const projectRef = "ktvpoafwopcybuvbtmme";

async function runSql(sql: string) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${managementToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ query: sql })
    });
    const text = await res.text();
    if (!res.ok) {
        throw new Error(`SQL Error: ${text}`);
    }
    return JSON.parse(text);
}

async function reset() {
    console.log('🚀 Starting Atomic Database Reset...');

    const schemaPath = resolve(process.cwd(), '../schema.sql');
    if (!fs.existsSync(schemaPath)) {
        console.error('schema.sql not found at', schemaPath);
        return;
    }

    const fullSql = fs.readFileSync(schemaPath, 'utf8');

    // Split by custom marker or just try to run the whole thing if it's cleaned up
    // But better to run DROP separately to avoid dependency issues if one fails
    const drops = fullSql.match(/DROP TABLE IF EXISTS .+ CASCADE;/g) || [];
    const creates = fullSql.split(/-- =============================================/);

    console.log('🗑️ Dropping existing tables...');
    for (const drop of drops) {
        try {
            await runSql(drop);
            console.log(`  ✅ ${drop}`);
        } catch (e: any) {
            console.warn(`  ⚠️ Skip drop: ${e.message.substring(0, 50)}`);
        }
    }

    console.log('🏗️ Creating new tables...');
    for (const section of creates) {
        const sql = section.trim();
        if (!sql) continue;
        if (sql.includes('CREATE EXTENSION')) {
            await runSql(sql).catch(e => console.warn('Extension error:', e.message));
            continue;
        }

        try {
            await runSql(sql);
            console.log('  ✅ Applied section');
        } catch (e: any) {
            console.error('  ❌ Error in section:', e.message);
            // We continue to try subsequent tables unless critical
        }
    }

    console.log('✨ Reset complete. Now you should run the seed script.');
}

reset().catch(console.error);
