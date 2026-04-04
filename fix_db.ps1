$sql = @"
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_tipo_cliente_check;
ALTER TABLE clientes ADD CONSTRAINT clientes_tipo_cliente_check 
CHECK (tipo_cliente IN ('principal', 'secundario', 'prospecto', 'otro'));
"@
$body = @{ query = $sql } | ConvertTo-Json -Compress
Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/ktvpoafwopcybuvbtmme/database/query" `
    -Method POST `
    -Headers @{ "Authorization" = "Bearer sbp_185f5bb44fdd982c97be0b120eaeb9620355359e" } `
    -Body $body `
    -ContentType "application/json"
