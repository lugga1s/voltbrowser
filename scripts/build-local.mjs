import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, '..');
const releaseDir = path.join(rootDir, 'release', 'win-unpacked');
const appDir = path.join(releaseDir, 'resources', 'app');

console.log('Iniciando empacotamento local do Volt Browser...');

try {
  // 1. Compilar os assets do Vite + TypeScript
  console.log('Compilando assets com Vite e TypeScript...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

  // 2. Verificar processos ativos antes de substituir os arquivos
  console.log('Verificando processos ativos...');
  execSync('node scripts/check-release-locks.mjs', { cwd: rootDir, stdio: 'inherit' });

  // 3. Limpar a pasta release/win-unpacked antiga
  if (fs.existsSync(releaseDir)) {
    console.log('Limpando diretório release anterior...');
    fs.rmSync(releaseDir, { recursive: true, force: true });
  }

  // 4. Criar a estrutura do diretório
  fs.mkdirSync(releaseDir, { recursive: true });

  // 5. Copiar os binários do Electron
  console.log('Copiando binários do Electron local...');
  const electronDist = path.join(rootDir, 'node_modules', 'electron', 'dist');
  fs.cpSync(electronDist, releaseDir, { recursive: true });

  // 6. Renomear o executável para o nome do produto
  console.log('Renomeando executável para Volt Browser.exe...');
  fs.renameSync(
    path.join(releaseDir, 'electron.exe'),
    path.join(releaseDir, 'Volt Browser.exe')
  );

  // 7. Excluir o app padrão do Electron welcome screen
  const defaultAppAsar = path.join(releaseDir, 'resources', 'default_app.asar');
  if (fs.existsSync(defaultAppAsar)) {
    fs.unlinkSync(defaultAppAsar);
  }

  // 8. Criar a pasta do aplicativo
  fs.mkdirSync(appDir, { recursive: true });

  // 9. Copiar a build final do Vite e os fontes principais
  console.log('Copiando código compilado para os recursos do Electron...');
  fs.cpSync(path.join(rootDir, 'dist'), path.join(appDir, 'dist'), { recursive: true });
  fs.cpSync(path.join(rootDir, 'src', 'main'), path.join(appDir, 'src', 'main'), { recursive: true });
  fs.copyFileSync(path.join(rootDir, 'package.json'), path.join(appDir, 'package.json'));

  console.log('\n==================================================');
  console.log('COMPILAÇÃO LOCAL REALIZADA COM SUCESSO!');
  console.log(`Diretório: ${releaseDir}`);
  console.log('==================================================\n');
} catch (error) {
  console.error('Falha no empacotamento local:', error);
  process.exit(1);
}
