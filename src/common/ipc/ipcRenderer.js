const { ipcRenderer } = require('electron');

function log(level, message) {
  ipcRenderer.send('log-message', level, message);
}

async function runCommand(cmd) {
  const res = await ipcRenderer.sendSync('runCommand', cmd);
  return res;
}

function encryptWallet() {
  ipcRenderer.send('encrypt-wallet');
}

function salvageWallet() {
  ipcRenderer.send('salvage-wallet', '-salvagewallet');
}

function rescanBlockchain() {
  ipcRenderer.send('rescan-blockchain', '-rescan');
}

function recoverTxes1() {
  ipcRenderer.send('recover-tx-1', '-zapwallettxes=1');
}

function recoverTxes2() {
  ipcRenderer.send('recover-tx-2', '-zapwallettxes=2');
}

function upgradeWallet() {
  ipcRenderer.send('upgrade-wallet', '-upgradewallet');
}

function reindexBlockchain() {
  ipcRenderer.send('reindex-blockchain', '-reindex');
}

function resyncBlockchain() {
  ipcRenderer.send('resync-blockchain', '-resync');
}

function restartWallet() {
  ipcRenderer.send('restart-wagerrd', null, 'otroargs');
}

function noPeers() {
  ipcRenderer.send('no-peers');
}

function downloadSnapshotError() {
  ipcRenderer.send('download-snapshot-error');
}

async function startDaemon() {
  const res = await ipcRenderer.sendSync('launch');
  return res;
}

async function stopDaemon() {
  const res = await ipcRenderer.sendSync('stopDaemon');
  return res;
}

export default {
  log,
  encryptWallet,
  salvageWallet,
  rescanBlockchain,
  recoverTxes1,
  recoverTxes2,
  upgradeWallet,
  reindexBlockchain,
  resyncBlockchain,
  restartWallet,
  noPeers,
  downloadSnapshotError,
  runCommand,
  stopDaemon,
  startDaemon
};
