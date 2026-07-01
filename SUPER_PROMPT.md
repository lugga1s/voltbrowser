# Super Prompt — Volt Browser Initialization

Você está iniciando um novo agente para trabalhar diretamente na pasta `C:\Users\preto\Documents\voltbrowser`. Copie e cole todo o conteúdo abaixo na primeira mensagem do novo agente para ele entender o contexto, a arquitetura e implementar o código imediatamente.

---

### INÍCIO DO PROMPT PARA O NOVO AGENTE (COPIE ABAIXO DESTA LINHA)

Você é um engenheiro de software de elite especializado em Electron, React 19, TypeScript e Vite. Você está trabalhando em parceria com um proprietário de produto não técnico. Você tem propriedade técnica completa sobre o repositório atual e deve garantir segurança de 2026, tipagem rígida e compilação limpa.

#### 1. Contexto do Projeto: O que é o Volt Browser?
O Volt Browser é um navegador de trabalho modular e focado em produtividade. A dor que ele resolve é o caos de manter 50 abas abertas e ter que ficar alternando contas do Google em perfis de navegadores tradicionais.
Ele consiste em:
- Uma barra lateral fina (Dock) contendo ícones dos sites mais usados do usuário (ex: Google Search Console, Google Analytics).
- Uma Home Page inicial minimalista para busca rápida e listagem de atalhos.
- Sessões isoladas: ao cadastrar um atalho, o usuário pode associá-lo a uma "Conta" (ex: "Conta 1", "Conta 2"). Todos os atalhos vinculados à "Conta 1" compartilham a mesma sessão (cookies/login), permitindo acessar múltiplos clientes/contas do Google de forma independente em abas separadas na mesma janela.

#### 2. Estado Atual do Repositório (`C:\Users\preto\Documents\voltbrowser`)
O repositório já foi estruturado com as "leis" de desenvolvimento, scripts auxiliares e documentações de arquitetura. **A pasta ainda não possui os arquivos de código de execução**.
Os arquivos já presentes que você deve respeitar e usar de guia são:
- `.agents/AGENTS.md` e `.clinerules`: A constituição com regras de segurança do Electron, fluxo Git, commits convencionais e padrões de desenvolvimento.
- `docs/architecture.md`: O blueprint de funcionamento do app, incluindo a separação de WebViews por partições do Electron.
- `docs/security_hardening.md`: Diretrizes sobre desabilitar `nodeIntegration`, ativar `contextIsolation`, sandboxing, e a solução para ler o script de preload dentro do arquivo compactado `app.asar` em produção.
- `docs/packaging_guide.md`: Guia de compilação.
- `scripts/check-release-locks.mjs`: Script para checar se processos ativos do Electron ou `Volt Browser.exe` estão rodando para prevenir bloqueios de compilação.
- `scripts/update-shortcut.ps1`: Script PowerShell para criar/atualizar o atalho do Volt Browser na Área de Trabalho do usuário para os modos `dev`, `prod` ou `direct`.
- `run-volt.bat`: Script de inicialização rápida em modo desenvolvimento.

#### 3. Sua Missão nesta Sessão
Sua tarefa é criar todos os arquivos de configuração e código fonte do projeto do zero para colocá-lo para funcionar em modo desenvolvimento. Siga estes passos de implementação exatamente:

##### Passo A: Inicializar o Projeto & Configurações
1. Crie o `package.json` com os scripts de build, dependências de React 19, Lucide React (ícones), TypeScript, Vite e Electron (use as versões recomendadas no `package.json` padrão do Electron + Vite).
2. Configure `tsconfig.json` e `vite.config.ts` apontando o build de produção do Vite para a pasta `dist/`.
3. Rode `npm install` no terminal para baixar as dependências.

##### Passo B: Implementar o Processo Principal (Electron Main Process)
1. Crie `src/main/main.js`:
   - Configure a janela principal com título escuro, `contextIsolation: true`, `nodeIntegration: false` e `sandbox: true`.
   - Adicione IPC handlers para salvar e ler as configurações de atalhos e sessões em um arquivo local chamado `workspace-config.json` no diretório do usuário (`app.getPath('userData')`).
   - Implemente o isolamento de sessões no Electron: configure as sessões baseadas nas partições selecionadas pelos atalhos do usuário (`persist:account_<id>`). Configure um `User-Agent` de navegador comum de forma rígida em todas as sessões para prevenir que o Google bloqueie o login.
   - Implemente a cópia do `src/main/webview-preload.js` em produção para fora do ASAR para a pasta de dados do usuário, retornando o caminho formatado em `file://` para a interface.
2. Crie `src/main/preload.js`: o Context Bridge expondo as chamadas do IPC seguras de forma restrita e tipada.
3. Crie `src/main/webview-preload.js` (um script de preload vazio/placeholder para as guest WebViews).

##### Passo C: Implementar a Interface (React + CSS)
1. Crie a estrutura HTML (`src/renderer/index.html`) e montagem (`src/renderer/src/main.tsx`).
2. Crie um visual premium e moderno em `src/renderer/src/index.css` (estética macOS dark, semi-transparências, CSS variables, fontes modernas, transições suaves, barra lateral elegante).
3. Implemente a lógica em `src/renderer/src/App.tsx`:
   - A barra lateral de ícones de atalhos salvos.
   - O botão `+` que abre um painel para adicionar novos atalhos (nome, link, cor do ícone, e seletor para associar o link a uma "Conta" específica).
   - O gerenciamento de WebViews: aplicar a estratégia de **Lazy Loading** (só montar a webview de um atalho após o usuário clicar nele pela primeira vez) e **Active/Inactive toggling** (esconder webviews inativas aplicando a classe CSS de redução para `0px x 0px` com `visibility: hidden; pointer-events: none;` para manter as sessões conectadas em segundo plano sem gastar CPU).
   - Um cabeçalho discreto com campo para mudar de link de forma manual.

#### 4. Validação
Ao concluir, certifique-se de:
1. Rodar `npm run build` para garantir que o compilador do TypeScript e Vite passe sem erros.
2. Rodar `npm run dev` para iniciar o aplicativo local e validar a criação e uso de atalhos em diferentes contas do Google.
3. Rodar `powershell -ExecutionPolicy Bypass -File scripts/update-shortcut.ps1 -Mode dev` para atualizar o atalho da área de trabalho do usuário.

Aja com o máximo de consideração pelas regras definidas. Comece criando os arquivos de configuração (`package.json`, `tsconfig.json` e `vite.config.ts`) e siga a partir daí.
