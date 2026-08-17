# Claude Code - set global permission mode: auto -> bypassPermissions
# (ASCII only, to avoid console codepage issues)

$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '=========================================================='
Write-Host '  Claude Code - global permission mode'
Write-Host '  defaultMode : auto  -->  bypassPermissions'
Write-Host '=========================================================='
Write-Host ''

$path = Join-Path $env:USERPROFILE '.claude\settings.json'

if (-not (Test-Path $path)) {
    Write-Host '[ERROR] settings.json not found:' -ForegroundColor Red
    Write-Host "        $path"
    exit 1
}

Write-Host "Target : $path"
Write-Host ''

try {
    # 1) backup
    $backup = "$path.bak"
    Copy-Item $path $backup -Force
    Write-Host "Backup : $backup"

    # 2) parse json
    $json = Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json

    if ($null -eq $json.permissions) {
        $json | Add-Member -NotePropertyName 'permissions' -NotePropertyValue ([pscustomobject]@{}) -Force
    }

    $before = $json.permissions.defaultMode
    if ([string]::IsNullOrEmpty($before)) { $before = '(not set)' }
    Write-Host "Before : $before"

    # 3) change only this key
    $json.permissions | Add-Member -NotePropertyName 'defaultMode' -NotePropertyValue 'bypassPermissions' -Force

    # 4) save as UTF-8 without BOM
    $out = $json | ConvertTo-Json -Depth 20
    [System.IO.File]::WriteAllText($path, $out, (New-Object System.Text.UTF8Encoding($false)))

    # 5) verify
    $check = Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json
    Write-Host "After  : $($check.permissions.defaultMode)"
    Write-Host ''

    if ($check.permissions.defaultMode -eq 'bypassPermissions') {
        Write-Host '[OK] Setting applied successfully.' -ForegroundColor Green
        Write-Host ''
        Write-Host '----------------------------------------------------------'
        Write-Host ' * Restart Claude Code completely to apply globally.'
        Write-Host ''
        Write-Host ' * To revert, copy the backup file back:'
        Write-Host "   $backup"
        Write-Host '----------------------------------------------------------'
        exit 0
    }
    else {
        Write-Host '[FAIL] Value was not applied.' -ForegroundColor Red
        Write-Host "       Restore from backup: $backup"
        exit 1
    }
}
catch {
    Write-Host ''
    Write-Host '[ERROR] Exception occurred.' -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host ''
    Write-Host "If a backup exists, restore it: $path.bak"
    exit 1
}
