import { spawn } from 'child_process';
import net from 'net';
import process from 'process';

console.log('Iniciando o servidor Vite...');

// Start Vite dev server
const vite = spawn('npx', ['vite'], { shell: true, stdio: 'inherit' });

// Keep track of processes to terminate cleanly on exit
const cleanExit = () => {
  try {
    vite.kill();
  } catch (e) {}
  process.exit();
};

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);
process.on('exit', cleanExit);

function checkPort() {
  const socket = new net.Socket();
  socket.connect(5173, 'localhost', () => {
    socket.destroy();
    console.log('\nVite está ativo! Iniciando o Electron...');
    
    // Start Electron process
    const electron = spawn('npx', ['electron', '.'], { shell: true, stdio: 'inherit' });
    
    electron.on('close', () => {
      console.log('Electron encerrado. Parando o servidor Vite...');
      vite.kill();
      process.exit();
    });
  });

  socket.on('error', () => {
    // Retry connection after a short delay
    setTimeout(checkPort, 200);
  });
}

// Start checking if the port is ready after 500ms
setTimeout(checkPort, 500);
