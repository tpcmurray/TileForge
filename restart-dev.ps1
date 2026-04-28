# Kills any process listening on Vite's port and starts the dev server.
# Usage:  .\restart-dev.ps1

param(
    [int]$Port = 5173
)

$ErrorActionPreference = 'Stop'

Write-Host "Checking for existing process on port $Port..." -ForegroundColor Cyan

$conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($conn) {
    $procIds = $conn.OwningProcess | Select-Object -Unique
    foreach ($procId in $procIds) {
        try {
            $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "  Stopping $($proc.ProcessName) (PID $procId)..." -ForegroundColor Yellow
                Stop-Process -Id $procId -Force
            }
        } catch {
            Write-Host "  Could not stop PID ${procId}: $_" -ForegroundColor Red
        }
    }
    Start-Sleep -Seconds 1
} else {
    Write-Host "  Nothing running on port $Port." -ForegroundColor Gray
}

Write-Host "Starting dev server (npm run dev)..." -ForegroundColor Green
npm run dev
