import { execSync } from 'child_process';
import process from 'process';

console.log('Verificando processos ativos antes de gerar a release do Volt Browser...');

try {
  const runningApps = [];

  // 1. Detect packaged Volt Browser.exe (always blocked)
  if (process.platform === 'win32') {
    try {
      const psOutput = execSync('powershell -Command "Get-Process -Name \'Volt Browser\' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name"', { encoding: 'utf8' });
      const names = psOutput.split('\r\n').map(l => l.trim()).filter(Boolean);
      if (names.length > 0) {
        runningApps.push('Volt Browser (Production App)');
      }
    } catch (e) {
      // Fallback using tasklist
      const tasklist = execSync('tasklist /NH /FO CSV', { encoding: 'utf8' });
      if (tasklist.toLowerCase().includes('volt browser.exe')) {
        runningApps.push('Volt Browser (Production App)');
      }
    }
  }

  // 2. Detect local electron process running from this directory
  if (process.platform === 'win32') {
    try {
      const cwd = process.cwd().toLowerCase();
      // Find all electron.exe processes and inspect their CommandLines
      const psCommand = `powershell -Command "Get-CimInstance Win32_Process -Filter \\"name = 'electron.exe'\\" | ForEach-Object { $_.CommandLine }"`;
      const cmdOutput = execSync(psCommand, { encoding: 'utf8' });
      
      if (cmdOutput.toLowerCase().includes(cwd)) {
        runningApps.push('electron (Development Server)');
      }
    } catch (e) {
      // If CimInstance is not available or errors out, fallback to checking if any 'electron' is running
      try {
        const psOutput = execSync('powershell -Command "Get-Process -Name \'electron\' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name"', { encoding: 'utf8' });
        const names = psOutput.split('\r\n').map(l => l.trim()).filter(Boolean);
        if (names.length > 0) {
          runningApps.push('electron (Development)');
        }
      } catch (err) {
        // Ignore fallback errors
      }
    }
  } else {
    // macOS / Linux checks
    try {
      const psOutput = execSync('ps aux', { encoding: 'utf8' }).toLowerCase();
      const cwd = process.cwd().toLowerCase();
      if (psOutput.includes('volt browser') || psOutput.includes('volt-browser')) {
        runningApps.push('Volt Browser');
      }
      if (psOutput.includes('electron') && psOutput.includes(cwd)) {
        runningApps.push('electron (Development)');
      }
    } catch (e) {
      // Ignore ps errors
    }
  }

  if (runningApps.length > 0) {
    console.error('\x1b[31m%s\x1b[0m', '================================================================');
    console.error('\x1b[31m%s\x1b[0m', 'ERRO DE COMPILAÇÃO: BLOQUEIO DE PROCESSOS ATIVOS DETECTADO');
    console.error('\x1b[31m%s\x1b[0m', `Processos conflitantes: ${runningApps.join(', ')}`);
    console.error('\x1b[31m%s\x1b[0m', '----------------------------------------------------------------');
    console.error('\x1b[31m%s\x1b[0m', 'Para evitar erros de arquivos travados (EBUSY), feche todas as');
    console.error('\x1b[31m%s\x1b[0m', 'instâncias ativas do Volt Browser e encerre o servidor de');
    console.error('\x1b[31m%s\x1b[0m', 'desenvolvimento antes de compilar a release de produção.');
    console.error('\x1b[31m%s\x1b[0m', '================================================================');
    process.exit(1);
  } else {
    console.log('Nenhum processo conflitante de Volt Browser/Electron detectado. Continuando build...');
  }
} catch (error) {
  console.warn('Aviso: Falha ao verificar processos ativos:', error.message);
  console.log('Continuando execução da compilação...');
}
