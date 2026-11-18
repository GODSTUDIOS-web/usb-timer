const $ = (id) => document.getElementById(id);
let formLoaded = false;

function fmt(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

function render(s) {
  const on = s.phase === 'on';
  $('statusCard').className = 'card status ' + (on ? 'on' : 'off');
  $('phase').textContent = on ? 'LIGADO' : 'DESLIGADO';
  $('auto').checked = s.auto;

  if (s.auto) {
    $('countdown').textContent = fmt(s.phaseEndsAt - s.now);
    $('nextAction').textContent = on ? 'até desligar automaticamente' : 'até religar automaticamente';
  } else {
    $('countdown').textContent = '--:--:--';
    $('nextAction').textContent = 'Automação pausada (modo manual)';
  }

  $('btnOn').disabled = s.busy;
  $('btnOff').disabled = s.busy;
  $('error').textContent = s.lastError || '';

  if (!formLoaded) {
    $('onMin').value = s.onMinutes;
    $('offMin').value = s.offMinutes;
    $('login').checked = s.launchAtLogin;
    $('exitOn').checked = s.enableOnExit;
    formLoaded = true;
  }
}

window.api.onState(render);
window.api.getState().then(render);

$('btnOn').onclick = () => window.api.usbOn();
$('btnOff').onclick = () => window.api.usbOff();
$('auto').onchange = (e) => window.api.toggleAuto(e.target.checked);
$('btnRestart').onclick = () => window.api.restartCycle();
$('btnSave').onclick = () => window.api.saveSettings({
  onMinutes: $('onMin').value,
  offMinutes: $('offMin').value,
  launchAtLogin: $('login').checked,
  enableOnExit: $('exitOn').checked
});
