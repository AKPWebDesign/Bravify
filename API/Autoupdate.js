var Promise = require('bluebird'); // jshint ignore:line
var request = require('request-json');
var client = request.createClient('http://bravify-version.akpwebdesign.com/');
client.headers['User-Agent'] = 'AKPWebDesign/Bravify <https://github.com/AKPWebDesign/Bravify>';

module.exports = new Promise(function(resolve, reject) {
  var pkg = require('../package.json');

  //check for updated version
  checkForUpdate('v'+pkg.version).then(function(res) {
    //if res is false, we need to download.
    if(!res) {
      return downloadUpdate();
    } else {
      return false;
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

function checkForUpdate(currentVer) {
  return new Promise(function(resolve, reject) {
    client.get('/', function(err, res, body) {
      if(err) {reject(err); return;}
      resolve(body);
    });
  }).then(function(res) {
    return (res.version !== currentVer);
  });
}

function downloadUpdate() {
  return new Promise(function(resolve, reject) {
    resolve(true);
  });
}

function restartProgram() {
  return true;
}
