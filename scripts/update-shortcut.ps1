<#
.SYNOPSIS
    Atualiza o atalho do Volt Browser na Área de Trabalho.
.DESCRIPTION
    Cria ou atualiza o atalho do Volt Browser na Área de Trabalho.
    Três modos disponíveis:
    - dev    : Modo Desenvolvimento. Aponta para run-volt.bat. Recomendado para programar
               e debugar com Hot-Reload ativo (Vite Dev Server + Electron dev).
    - prod   : Modo Produção. Aponta para o executável final empacotado pelo instalador
               em release/win-unpacked/ ou para a versão instalada no sistema.
               Recomendado para testar o comportamento idêntico ao cliente final.
    - direct : Modo Direto. Aponta para electron.exe rodando o build estático local
               (pasta dist/ gerada pelo npm run build) diretamente, sem abrir terminal CMD.
               Recomendado para testes rápidos de build de produção antes de empacotar.
.PARAMETER Mode
    Modo do atalho: "dev", "prod", ou "direct"
.EXAMPLE
    .\scripts\update-shortcut.ps1 -Mode dev
    .\scripts\update-shortcut.ps1 -Mode prod
    .\scripts\update-shortcut.ps1 -Mode direct
#>

param(
    [ValidateSet("dev", "prod", "direct")]
    [string]$Mode = "prod"
)

$desktopPath = [Environment]::GetFolderPath("Desktop")
$projectPath = "C:\Users\preto\Documents\voltbrowser"
$shortcutPath = Join-Path $desktopPath "Volt Browser.lnk"
$iconPath = Join-Path $projectPath "assets\icon.ico"
$installedExe = "$env:LOCALAPPDATA\Programs\volt-browser\Volt Browser.exe"
$unpackedExe = Join-Path $projectPath "release\win-unpacked\Volt Browser.exe"

$ws = New-Object -ComObject WScript.Shell

# Remove atalho existente se houver
if (Test-Path $shortcutPath) {
    Remove-Item $shortcutPath -Force
    Write-Output "Atalho antigo removido."
}

# Cria novo atalho
$sc = $ws.CreateShortcut($shortcutPath)

if ($Mode -eq "dev") {
    $batchPath = Join-Path $projectPath "run-volt.bat"
    $sc.TargetPath = $batchPath
    $sc.WorkingDirectory = $projectPath
    $sc.Description = "Volt Browser - Modo Desenvolvimento (Vite + Electron)"
    $sc.WindowStyle = 1
    Write-Output "Modo: DESENVOLVIMENTO"
    Write-Output "Alvo: $batchPath"

} elseif ($Mode -eq "prod") {
    # Prioridade 1: executável compilado via npm run dist (win-unpacked)
    if (Test-Path $unpackedExe) {
        $sc.TargetPath = $unpackedExe
        $sc.WorkingDirectory = Split-Path $unpackedExe -Parent
        $sc.Description = "Volt Browser - O Navegador de Trabalho Modular (Compilado)"
        $sc.WindowStyle = 1
        Write-Output "Modo: PRODUÇÃO (compilado local)"
        Write-Output "Alvo: $unpackedExe"
    }
    # Prioridade 2: executável instalado via NSIS
    elseif (Test-Path $installedExe) {
        $sc.TargetPath = $installedExe
        $sc.WorkingDirectory = Split-Path $installedExe -Parent
        $sc.Description = "Volt Browser - O Navegador de Trabalho Modular (Instalado)"
        $sc.WindowStyle = 1
        Write-Output "Modo: PRODUÇÃO (instalado)"
        Write-Output "Alvo: $installedExe"
    }
    # Se nenhum existir, mostra erro
    else {
        Write-Warning "AVISO: Nenhum executável encontrado!"
        Write-Warning ""
        Write-Warning "Opção 1 - Gerar compilado local (recomendado):"
        Write-Warning "  npm run dist"
        Write-Warning ""
        Write-Warning "Opção 2 - Instalar via NSIS:"
        Write-Warning "  Execute o instalador gerado na pasta release/"
        Write-Warning ""
        Write-Warning "Criando atalho temporário com instruções..."
        
        $sc.TargetPath = "C:\Windows\System32\cmd.exe"
        $sc.Arguments = "/c echo Volt Browser - Execute 'npm run dist' primeiro && pause"
        $sc.WorkingDirectory = $projectPath
        $sc.Description = "Volt Browser - EXECUTÁVEL NÃO ENCONTRADO"
        $sc.WindowStyle = 1
    }

} elseif ($Mode -eq "direct") {
    # Modo direct: aponta para o Electron rodando o build atual
    $batchPath = Join-Path $projectPath "run-volt-prod.bat"
    
    # Cria o batch file se não existir
    if (-not (Test-Path $batchPath)) {
        $batchContent = @'
@echo off
title Volt Browser — Modo Direto (Build)
cd /d "%~dp0"
echo ============================================
echo   Volt Browser (Modo Direto)
echo   Executa o build compilado sem instalador
echo ============================================
echo.
echo Para encerrar, feche esta janela.
echo.

:: Verifica se o build existe
if not exist "dist\index.html" (
    echo ERRO: Build não encontrado! Execute primeiro:
    echo   npm run build
    echo.
    pause
    exit /b 1
)

:: Executa o Electron em modo produção apontando para o diretório do projeto
npx electron .

echo.
echo Volt Browser encerrado.
pause
'@
        Set-Content -Path $batchPath -Value $batchContent -Encoding ASCII
        Write-Output "Arquivo run-volt-prod.bat criado."
    }
    
    $sc.TargetPath = $batchPath
    $sc.WorkingDirectory = $projectPath
    $sc.Description = "Volt Browser - Modo Direto (build local)"
    $sc.WindowStyle = 1
    Write-Output "Modo: DIRETO (build local via Electron)"
    Write-Output "Alvo: $batchPath"

    # Evita abrir janela de CMD: o atalho final aponta direto para o Electron local.
    $electronExe = Join-Path $projectPath "node_modules\electron\dist\electron.exe"
    if (Test-Path $electronExe) {
        $sc.TargetPath = $electronExe
        $sc.Arguments = "."
        $sc.WorkingDirectory = $projectPath
        $sc.Description = "Volt Browser - Modo Direto (build local, sem CMD)"
        Write-Output "Alvo final sem CMD: $electronExe"
        Write-Output "Args: ."
        if (Test-Path $batchPath) {
            Remove-Item -LiteralPath $batchPath -Force
            Write-Output "Arquivo temporário run-volt-prod.bat removido."
        }
    }
}

if (Test-Path $iconPath) {
    $sc.IconLocation = "$iconPath,0"
}

$sc.Save()
Write-Output ""
Write-Output "Atalho do Volt Browser atualizado com sucesso:"
Write-Output "  Local: $shortcutPath"
Write-Output "  Alvo:  $($sc.TargetPath)"
Write-Output "  Dir:   $($sc.WorkingDirectory)"
Write-Output "  Desc:  $($sc.Description)"
if ($sc.IconLocation) {
    Write-Output "  Ícone: $($sc.IconLocation)"
}
