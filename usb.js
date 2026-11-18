const { execFile } = require('child_process');

function ps(command) {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command],
      { windowsHide: true, timeout: 90000 },
      (err, stdout, stderr) => {
        if (err) reject(new Error((stderr || err.message || 'Erro desconhecido').trim()));
        else resolve((stdout || '').trim());
      }
    );
  });
}

// Seleciona dispositivos de armazenamento USB (pendrives, discos externos)
const SELECT = `
Get-PnpDevice | Where-Object {
  $_.InstanceId -like 'USBSTOR\\*' -or
  ($_.Class -eq 'USB' -and $_.FriendlyName -like '*Mass Storage*')
}
`;

const DISABLE = `
$ErrorActionPreference = 'Stop'
Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USBSTOR' -Name Start -Value 4
${SELECT} | ForEach-Object {
  try { Disable-PnpDevice -InstanceId $_.InstanceId -Confirm:$false -ErrorAction Stop } catch {}
}
'ok'
`;

const ENABLE = `
$ErrorActionPreference = 'Stop'
Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USBSTOR' -Name Start -Value 3
${SELECT} | ForEach-Object {
  try { Enable-PnpDevice -InstanceId $_.InstanceId -Confirm:$false -ErrorAction Stop } catch {}
}
'ok'
`;

const STATUS = `(Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USBSTOR' -Name Start).Start`;

async function disableUsb() { return ps(DISABLE); }
async function enableUsb() { return ps(ENABLE); }
async function usbStatus() {
  const v = await ps(STATUS);
  return v === '4' ? 'off' : 'on';
}

module.exports = { disableUsb, enableUsb, usbStatus };
