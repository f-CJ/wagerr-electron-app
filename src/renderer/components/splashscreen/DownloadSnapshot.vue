<template>
  <div>
    <div v-if="this.syncMethod === this.syncMethods.SCAN_BLOCKS">      
      <button 
        class="waves-effect waves-light btn transparent"
        @click="onDownloadSnapshot"
      >
        Download Snapshot
      </button>       
    </div>
    <div v-else-if="this.syncMethod === this.syncMethods.DOWNLOAD_SNAPSHOT">
      <button 
        class="waves-effect waves-light btn transparent"
        @click="onCancelDownload"
      >
        Cancel download
      </button>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import ipcRenderer from '../../../common/ipc/ipcRenderer';
import { blockchainSnapshot, syncMethods } from '../../../main/constants/constants';
import { clearInterval } from 'timers';
import { mapActions } from 'vuex';
import { getWagerrDataPath } from '../../../main/blockchain/blockchain';

const CancelToken = axios.CancelToken;
const source = CancelToken.source();

export default {
  name: 'DownloadSnapshot',  
  props: ['syncMethod'],
  data() {
    return {
      progressPercentage: 0,
      syncMethods: {...syncMethods}
    };
  },


  watch: {
    syncMethod: async function(newSyncMethod, oldSyncMethod) {
      console.log('watch has been triggerred', newSyncMethod, oldSyncMethod);
      if (newSyncMethod === syncMethods.DOWNLOAD_SNAPSHOT) {
        this.updateProgressPercentageText();

        let latestSnapshotUrl = await this.getLatestSnapshotUrl();
        if (latestSnapshotUrl) {
          console.log('lastest',latestSnapshotUrl);
          this.downloadSnapshot(latestSnapshotUrl);
        }
      }      
    }
  },

  methods: {
    ...mapActions(['updateInitText']),

    onDownloadSnapshot(){
      this.$emit('download');
    },

    onCancelDownload() {
      console.log('Cancel downloading snapshot');      
      source.cancel();
      ipcRenderer.restartWallet();
      // this.$emit('cancel');
    },

    updateProgressPercentageText() {
      this.updateInitText(`Downloading blockchain snapshot: ${Math.round(this.progressPercentage)}%`);
    },

    _getFilenameFromHeaderResponse(response) {
      let contentDisposition = response.headers['content-disposition'];
      
      if (!contentDisposition) return blockchainSnapshot.DEFAULT_FILENAME;

      let matches = /filename=(.+)/g.exec(contentDisposition);
      return matches && matches.length > 1 ? matches[1] : blockchainSnapshot.DEFAULT_FILENAME;
    },

    _resolveSnapshotDataPath(response) {
      const directoryPath = path.join(getWagerrDataPath(), blockchainSnapshot.RELATIVE_DATA_PATH);
      const dataPath = path.join(directoryPath, this._getFilenameFromHeaderResponse(response));
      
      if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath);
      }


      return dataPath;
    },
    
    downloadSnapshot(url) {
      let progress = 0;
      let total = 0;
      let interval;
      
      interval = setInterval(this.updateProgressPercentageText, 1000); 

      axios({
        method: 'get',
        url: url,
        responseType: 'stream',  
        cancelToken: source.token
      })
        .then(function (response) {          
          const snapshotPath = this._resolveSnapshotDataPath(response);
          total = response.headers['content-length'];
          response.data.pipe(fs.createWriteStream(snapshotPath));
          response.data.on('data', chunk => {
            progress += chunk.length;
            this.progressPercentage = (progress / total) * 100;
            // console.log('ondata', progress, this.progressPercentage);
          });

          response.data.on('end', chunk => {
            // If not accessed throw 'window' doesn't clear the interval
            window.clearInterval(interval);

            console.log('done'); 
          });
        }.bind(this))
        .catch(function (thrown) {
          console.log("PUTO CATCH");
          if (axios.isCancel(thrown)) {
            console.log('Request canceled', thrown.message);
          } else {
            // handle thrown
            //Show dialog alerting user
            console.log('thrown', thrown);
          }
        });
      
    },

    getLatestSnapshotUrl() {      
      return axios({
        method: 'get',
        url: blockchainSnapshot.LATEST_RELEASE_URL
      }).then(function (response) {
        return response.data.assets[0].browser_download_url;          
      }).catch(function (error) {
        ipcRenderer.downloadSnapshotError();        
      });
    }
  }
};
</script>
<style scoped>
.btn {
  overflow: hidden;
}
.btn:hover:before {
  opacity:1;
}
.btn:before {
  content: '';
  opacity: 0;
  background-color: #191919;
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  transition: opacity .2s;
  z-index: -1;
}
</style>