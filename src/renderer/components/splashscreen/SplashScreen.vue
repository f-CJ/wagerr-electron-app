<template>
  <div class="splash">
    <div class="row text-center">
      <div class="col s12 splash-image"></div>

      <div class="col s12 version">Wagerr Electron App {{ walletVersion }}</div>

      <div class="col s12">
        <transition name="slide-fade" mode="out-in">
          <div :key="initText">
            <h5>{{ initText }}{{ myText }}</h5>
          </div>
        </transition>
      </div>

      <div class="col s12 splash-loading-container">
        <div class="slider">
          <div class="line"></div>
          <div class="break dot1"></div>
          <div class="break dot2"></div>
          <div class="break dot3"></div>
        </div>
      </div>

<!-- style="margin-bottom: 20px; height: 85px" -->
      <div class="col s12" >
        <download-snapshot 
          v-if="mayDownloadSnapshot"
          :sync-method="syncMethod" 
          v-on:download="onDownloadSnapshot"
          v-on:cancel="onDownloadSnapshotCancel"
        />
        </div>
    </div>
    <div class="splash-wallet-repair text-center">
        <div>
          <a href="#" @click="restartWallet">Restart Wallet</a>
        </div>

        <div>
          <a href="#" @click="rescanBlockchain">Rescan Blockchain Files</a>
        </div>

        <div>
          <a href="#" @click="reindexBlockchain">Reindex Blockchain</a>
        </div>

        <div>
          <a href="#" @click="resyncBlockchain">Resync Blockchain</a>
        </div>

        <div>
          <a href="#" @click="onOpenConf">Wagerr.Conf</a>
        </div>
      </div>
  </div>
</template>

<script>
import { remote, shell } from 'electron';
import moment from 'moment';
import { path } from 'path'
import fs from 'fs';
import { mapActions, mapGetters } from 'vuex';
import blockchainRPC from '../../services/api/blockchain_rpc';
import networkRPC from '../../services/api/network_rpc';
import ipcRenderer from '../../../common/ipc/ipcRenderer';
import { getWagerrConfPath } from '../../../main/blockchain/blockchain';
import DownloadSnapshot from './DownloadSnapshot.vue';
import { blockchainSnapshot, syncMethods } from '../../../main/constants/constants';
import { reconnect } from '../../services/api/wagerrRPC';


const HOUR_IN_SECONDS = 60 * 60;
const DAY_IN_SECONDS = 24 * 60 * 60;
const WEEK_IN_SECONDS = 7 * 24 * 60 * 60;
const YEAR_IN_SECONDS = 31556952; // Average length of year in Gregorian calendar.

export default {
  name: 'SplashScreen',
  components: { DownloadSnapshot },

  data() {
    return {
      confPath: getWagerrConfPath(),
      syncMethod: syncMethods.SCAN_BLOCKS,
      syncMethods: syncMethods,
      mayDownloadSnapshot: false,
      myText: ''
    };
  },

  computed: {
    ...mapGetters([
      'balance',
      'initText',
      'walletLoaded',
      'walletSynced',
      'walletUnlocked',
      'walletVersion'
    ])
  },

  methods: {
    ...mapActions([
      'syncWallet',
      'updateInfo',
      'updateBlocks',
      'walletBalance',
      'updateInitText',
      'updateNetworkType',
      'updateWalletLoaded',
      'updateWalletSynced',
      'updateNumMasternodes',
      'updateNumConnections',
      'walletExtendedBalance',
      'getWGRTransactionList',
      'getPLBetTransactionList',
      'getCGBetTransactionList',
      'getWGRTransactionRecords',
      'loadUserSettings'
    ]),

    rescanBlockchain: function() {
      ipcRenderer.rescanBlockchain();
    },

    reindexBlockchain: function() {
      ipcRenderer.reindexBlockchain();
    },

    resyncBlockchain: function() {
      ipcRenderer.resyncBlockchain();
    },

    restartWallet: function() {
      ipcRenderer.restartWallet();
    },

    closeWallet: function() {
      ipcRenderer.closeWallet();
    },

    onDownloadSnapshotCancel: async function() {      
      this.updateInitText('Starting daemon...');
      this.syncMethod = null;

      // Without the timeout the app freezes before updating the init text to 'Starting dameon...'
      // setTimeout(async function() { 
        try {
          console.log('start daemon');
          await ipcRenderer.startDaemon();  
          reconnect();
          console.log('daemon started');
          this.syncMethod = syncMethods.SCAN_BLOCKS;
          
        } catch(e) {        
          remote.dialog.showMessageBox(remote.BrowserWindow.getFocusedWindow(), {
            type: 'error',
            title: 'Wagerr Daemon Error',
            buttons: ['Ok'],
            message: 'An error occurred when starting the daemon.',
            detail: 'Please restart the application'
          });

          ipcRenderer.log('error', e);
        }
      // }.bind(this), 100);      
    },


    onDownloadSnapshot: function() {      
      this.updateInitText('Stopping daemon...');
      this.syncMethod = null;

      // Without the timeout the app freezes before updating the init text to 'Stopping dameon...'
      setTimeout(async function() { 
        try {
          await ipcRenderer.stopDaemon();  
          this.syncMethod = syncMethods.DOWNLOAD_SNAPSHOT;

        } catch(e) {        
          this.syncMethod = syncMethods.SCAN_BLOCKS;

          remote.dialog.showMessageBox(remote.BrowserWindow.getFocusedWindow(), {
            type: 'error',
            title: 'Wagerr Daemon Error',
            buttons: ['Ok'],
            message: 'An error occurred when stopping the daemon.',
            detail: ''
          });

          ipcRenderer.log('error', e);
        }
      }.bind(this), 100);      
    },    

    getTimeBehindText: function(seconds, blockHeight) {      
      let timeBehindText;
      let years;
      let remainder;

      if (seconds < 2 * DAY_IN_SECONDS) {
        timeBehindText =
          Math.round(seconds / HOUR_IN_SECONDS) +
          ' hours behind';
      } else if (seconds < 2 * WEEK_IN_SECONDS) {
        timeBehindText =
          Math.round(seconds / DAY_IN_SECONDS) +
          ' days behind';
      } else if (seconds < YEAR_IN_SECONDS) {
        timeBehindText =
          Math.round(seconds / WEEK_IN_SECONDS) +
          ' weeks behind';
      } else {
        years = seconds / YEAR_IN_SECONDS;
        remainder = seconds % YEAR_IN_SECONDS;

        timeBehindText =
          Math.round(years) +
          ' year and ' +
          Math.round(remainder / WEEK_IN_SECONDS) +
          ' weeks behind';
      }

      return timeBehindText;
    },

    sleep: function(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Check for peers.
    checkPeerStatus: async function() {
      let count = 0;
      let connections = 0;
      let peersFound = false;

      this.updateInitText('Connecting to peers... this may take some time!');
      ipcRenderer.log('info', 'Waiting for daemon to find peers');

      // While no peers have connected to the daemon keep looping.
      while (!peersFound) {
        let peerInfo = await networkRPC.getPeerInfo();
        connections = peerInfo.length;

        // If we have successfully connected to peers break out of the loop.
        if (connections > 0) {
          peersFound = true;
          break;
        }

        count++;

        // Give the daemon an arbitrary 101 loops to find peers. If not show an error to the user.
        if (count === 100) {
          ipcRenderer.log(
            'warn',
            'No peers could be found, please review your Wagerr Core logs'
          );
          ipcRenderer.noPeers();
          return 1;
        }

        // Sleep for 1 second between loops to lessen the burden on contiously making calls to the daemon and updating the UI.
        await this.sleep(1000);
      }

      // Once peers have been found resolve the Promise.
      if (peersFound) {
        ipcRenderer.log('info', 'Connected to network');
        return 1;
      }
    },

    // Show the blockchain sync status information.
    syncBlockchainStatus: async function() {
      let bestBlockHash;
      let bestBlockHeight;
      let bestBlockTime;
      let bestBlockTimeDifference;
      let synced = false;
      let verificationProgress;
      let userAnswer;
      ipcRenderer.log('info', 'Syncing blockchain');
      
      while (!synced) {        
        if (this.syncMethod === syncMethods.SCAN_BLOCKS) {
          let blockchainInfo = await blockchainRPC.getBlockchainInfo();
          bestBlockHash = blockchainInfo.bestblockhash;
          bestBlockHeight = blockchainInfo.blocks;
          verificationProgress = blockchainInfo.verificationprogress;

          let blockInfo = await blockchainRPC.getBlockInfo(bestBlockHash);
          bestBlockTime = blockInfo.time;
          bestBlockTimeDifference = moment().diff(bestBlockTime * 1000, 'seconds');

          if (Math.round(bestBlockTimeDifference / HOUR_IN_SECONDS) === 0) {
            // Wallet is synced enough to allow user access.
            this.updateWalletLoaded(true);

          } else {
            let timeBehindText = this.getTimeBehindText(bestBlockTimeDifference, bestBlockHeight);
            this.updateInitText(timeBehindText + ', Scanning block ' + bestBlockHeight);


            let weeksBehind = Math.round(bestBlockTimeDifference / WEEK_IN_SECONDS);
            if (weeksBehind > blockchainSnapshot.TRESHOLD_IN_WEEKS) {
              this.mayDownloadSnapshot = true;        
              if (userAnswer === undefined) {
                userAnswer = remote.dialog.showMessageBox(remote.BrowserWindow.getFocusedWindow(), {
                    type: 'question',
                    buttons: ['Yes, download snapshot', 'No, sync normally'],
                    message: `Your Wagerr wallet is ${timeBehindText}. \n\nDo you want us to download a snapshot of the blockchain to speed things up?\n`,
                    cancelId: 1,
                    defaultId: 0,
                    detail: 'You can change your snapshot preferences in the settings section'
                });
      console.log('answer ' + userAnswer);


              }
            }
          }
        }

        // If verification progress is 1 or above it means the daemon is synced.
        if (verificationProgress >= 1) {
          synced = true;
          break;
        }

        // Sleep for 1 second between loops to lessen the burden on contiously
        // making calls to the daemon and updating the UI.
        await this.sleep(1000);
      }

      // Once peers have been found resolve the Promise.
      if (synced) {
        ipcRenderer.log('info', 'Blockchain is now synced with network');
        return 1;
      }
    },

    onOpenConf: function() {
      ipcRenderer.log('debug', 'Opening wagerr.conf file');
      shell.openItem(this.confPath);
    }
  },

  async mounted() {
    // On some computers (especially Windows) the daemon is taking a while to
    // launch. If we start hitting it with RPC calls too early the app might
    // fail to launch in some instances. Dirty workaround to allow 10 seconds
    // before moving to the RPC calls.
    // TODO: Implement a cleaner solution.
    // await this.sleep(10000);

    // TODO make this call just in development?
    // await ipcRenderer.startDaemon();
    // reconnect();

    // Check if connected to the Wagerr network and if we have peers.
    await this.checkPeerStatus();   

    // Set the network.
    let blockchainInfo = await blockchainRPC.getBlockchainInfo();
    let network = blockchainInfo.chain === 'test' ? 'Testnet' : 'Mainnet';
    await this.updateNetworkType(network);

    // If Wallet not synced show time behind text.
    await this.syncBlockchainStatus();

    // After connecting to peers get some blockchain info.
    this.updateInitText('Fetching wallet information...');
    await this.walletExtendedBalance();
    await this.getWGRTransactionRecords(100);
    await this.getPLBetTransactionList(50);
    await this.getCGBetTransactionList(25);

    // load User Config - could use methods access, instead of store.dispatch
    await this.loadUserSettings(network);
  }
};
</script>
