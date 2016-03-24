var Promise = require('bluebird'); // jshint ignore:line
var electron = require('electron');
var app = electron.app;
var request = require('request-json');
var r = require('request');
var progress = require('request-progress');
var path = require('path');
var exec = require('child_process').exec;
var client = request.createClient('http://bravify-version.akpwebdesign.com/');
client.headers['User-Agent'] = 'AKPWebDesign/Bravify <https://github.com/AKPWebDesign/Bravify>';

module.exports = function(window){
  return new Promise(function(resolve) {
    var pkg = require('../package.json');

    //if we're running from 'electron', then we're developing.
    if(path.basename(process.execPath).toLowerCase().startsWith('electron')) {
      resolve(false);
      return;
    }

    //check for updated version
    checkForUpdate('v'+pkg.version).then(function(res) {
      //if res is false, we don't need to download.
      if(!res) {
        resolve(false);
      } else {
        downloadUpdate(window, res);
        resolve(true);
      }
    });
  });
};

function checkForUpdate(currentVer) {
  return new Promise(function(resolve, reject) {
    client.get('/', function(err, res, body) {
      if(err) {reject(err); return;}
      resolve(body);
    });
  }).then(function(res) {
    return (res.version !== currentVer) ? res.version : false;
  });
}

function downloadUpdate(window, version) {
  var url = `https://github.com/AKPWebDesign/Bravify/releases/download/${version}/app.asar`;
  var app_asar = path.join(__dirname, '../').slice(0, -1);
  var update_asar = path.join(__dirname, '../../', 'update-asar');
  return downloadFile(url, update_asar, window).then(function(){
    if(process.platform === 'win32') {
      winMinorUpdate(app_asar, update_asar);
    } else {
      nixMinorUpdate(app_asar, update_asar);
    }
  });
}

function downloadFile(url, downloadPath, window) {
  return new Promise(function(resolve, reject) {
    var file;
    try {
      file = require('fs').createWriteStream(downloadPath);
    } catch (e) {
      reject(e);
      //TODO: try running as admin on Windows?
      return;
    }

    var lastPercent = 0;
    progress(r(url), {throttle: 50}).on('progress', function(state){
      if(state.percentage > lastPercent) {
        lastPercent = state.percentage;
        window.webContents.send('updateProgressBar', state.percentage);
      }
    }).on('error', function(err) {
      reject(err);
    }).pipe(file).on('close', function() {
      file.close();
      window.webContents.send('updateProgressBar', 1);
      resolve();
    });
  });
}

function nixMinorUpdate(app_asar, update_asar) {
  var fs = require('fs');
  fs.unlink(app_asar, function(err) {
    if(err) {
      console.error('Can\'t remove app.asar.', err);
      return;
    }
    fs.rename(update_asar, app_asar, function(err) {
      if(err) {console.error('Can\'t rename update.asar.', err); return;}
      var appPath;
      if(process.platform === 'darwin') {
        appPath = __dirname.replace('/Contents/Resources/app.asar/js', '');
        exec('open -n ' + appPath);
      } else {
        appPath = process.execPath;
        exec(appPath);
      }
      setTimeout(function(){app.quit();},250);
    });
  });
}

function winMinorUpdate(app_asar, update_asar) {
  var appPath = process.execPath;
  var processName = path.basename(appPath);
  var cmd =`
    @echo off
    title Updating Bravify
    echo Updating Bravify, please wait...
    taskkill /IM ${processName} /f
    ping 1.1.1.1 -n 1 -w 1000 > nul
    del "${app_asar}"
    ren "${update_asar}" app.asar
    start "" "${appPath}"
    exit`;

  var batchFile = path.join(process.env.APPDATA, 'Bravify', 'update.bat');

  require('fs').writeFile(batchFile, cmd, function(err) {
    if(err) {console.error('Can\'t save update batch file!', err); return;}
    exec(`START "" "${batchFile}"`);
  });
}
