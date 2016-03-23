var Promise = require('bluebird'); // jshint ignore:line
var remote = require('remote');
var app = remote.require('app');
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

    //check for updated version
    checkForUpdate('v'+pkg.version).then(function(res) {
      //if res is false, we don't need to download.
      if(!res) {
        return false;
      } else {
        return downloadUpdate(window, res);
      }
    }).then(function(res) {
      if(!res) {
        //either the update failed, or we don't have an update.
        resolve(true); //TODO: watch for errors.
      } else {
        //restart program somehow.
        resolve(restartProgram());
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
  var app_asar = path.join(__dirname, '../');
  var update_asar = path.join(__dirname, '../../', 'update-asar');
  return downloadFile(url, update_asar, window).then(function(){
    if(process.platform === 'win32') {
      winMinorUpdate(app_asar, update_asar);
    } else {
      nixMinorUpdate(app_asar, update_asar);
    }
  });
}

function restartProgram() {
  return true;
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
    progress(r(url), {throttle: 500}).on('progress', function(state){
      if(state.percent > lastPercent) {
        lastPercent = state.percent;
        window.webContents.send('update-download-progress', {p: state.percent});
      }
    }).on('error', function(err) {
      reject(err);
    }).pipe(file).on('close', function() {
      file.close();
      resolve();
    });
  });
}

function nixMinorUpdate(app_asar, update_asar) {
  var fs = require('fs');
  fs.unlink(app_asar, function(err) {
    if(err) {
      console.err('Can\'t remove app.asar.', err);
      return;
    }
    fs.rename(update_asar, app_asar, function(err) {
      if(err) {console.err('Can\'t rename update.asar.', err);}
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

}
