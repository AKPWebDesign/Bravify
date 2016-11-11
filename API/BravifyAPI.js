var request = require('request-json');
var client = request.createClient('https://bravify-staging-api.akpwebdesign.com/');
client.headers['User-Agent'] = 'AKPWebDesign/Bravify <https://github.com/AKPWebDesign/Bravify>';
var Promise = require('bluebird'); // jshint ignore:line

function BravifyAPI() {

}

BravifyAPI.prototype.getChampion = function (includeList) {
  return new Promise((reso, rej) => {
    client.get('/champion/en_US/random/full', (e, res, body) => {
      if(e) { return rej(e); }
      reso(body);
    });
  });
};

BravifyAPI.prototype.getSpells = function (mode) {
  if(!mode) { mode = 'CLASSIC'; } // Default mode: CLASSIC.
  return new Promise((reso, rej) => {
    client.get(`/summoner/en_US/${mode}/random/2`, (e, res, body) => {
      if(e) { return rej(e); }
      reso(body);
    });
  });
};


module.exports = BravifyAPI;
