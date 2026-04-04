$sql = "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.clientes'::regclass AND contype = 'c';"
$body = @{ query = $sql } | ConvertTo-Json -Compress
$result = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/ktvpoafwopcybuvbtmme/database/query" `
    -Method POST `
    -Headers @{ "Authorization" = "Bearer sbp_185f5bb44fdd982c97be0b120eaeb9620355359e" } `
    -Body $body `
    -ContentType "application/json"
$result | ConvertTo-Json
