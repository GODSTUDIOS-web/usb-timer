# USB Timer

App Electron para Windows que alterna automaticamente os dispositivos de
armazenamento USB (pendrives e discos externos):

- Fica **ligado durante 2h** e depois **desliga**
- Fica **desligado durante 1h30** e depois **religa sozinho**
- Pode ligar/desligar **manualmente** a qualquer momento
- Os tempos são configuráveis na própria app

## Como gerar o .exe

1. Instale o Node.js LTS: https://nodejs.org
2. Extraia este zip, abra a pasta e dê duplo clique em `build.bat`
   (ou, no terminal: `npm install` e depois `npm run build`)
3. Os instaladores ficam em `dist/`:
   - `USB Timer Setup 1.0.0.exe` (instalador)
   - `USB Timer 1.0.0.exe` (portátil)

Para testar sem compilar: `npm install` e `npm start` (terminal como Administrador).

## Notas

- A app pede **permissão de Administrador** (necessário para alterar o registo e desativar dispositivos).
- Funciona por: `HKLM\SYSTEM\CurrentControlSet\Services\USBSTOR\Start` (4 = bloqueado, 3 = ativo)
  e desativação dos dispositivos de armazenamento já ligados.
- Teclado, rato e outros dispositivos USB **não** são afetados.
- Fechar a janela minimiza para a bandeja. Use "Sair" no ícone da bandeja para fechar.
- Ao fechar a app, o USB é religado (opção desativável).
- Se algo correr mal, religar manualmente (PowerShell como Admin):
  `Set-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Services\USBSTOR" -Name Start -Value 3`
- Dados guardados em `%APPDATA%\usb-timer\settings.json`.

## Compilar na nuvem (sem instalar nada)

1. Crie um repositório no GitHub e envie todos os ficheiros deste projeto.
2. Abra o separador **Actions**, escolha **Build Windows EXE** e clique em **Run workflow**.
3. Quando terminar (3-5 min), descarregue o ficheiro **USB-Timer-exe** na secção *Artifacts*.
