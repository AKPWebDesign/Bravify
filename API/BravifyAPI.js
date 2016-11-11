var request = require('request-json');
var client = request.createClient('https://bravify-staging-api.akpwebdesign.com/');
client.headers['User-Agent'] = 'AKPWebDesign/Bravify <https://github.com/AKPWebDesign/Bravify>';
var Promise = require('bluebird'); // jshint ignore:line

function BravifyAPI() {
  this.adjectives = [
    "stupid",
    "mid or feed",
    "afk",
    "reported"
  ];

  this.language = 'en_US';

  var self = this;
  this.getAdjectives().then(adjectives => {
    self.adjectives = adjectives;
  });
}

BravifyAPI.prototype.getChampion = function (includeList) {
  return new Promise((res, rej) => {
    client.get(`/champion/${this.language}/random/full`, (e, r, body) => {
      if(e) { return rej(e); }
      res(body);
    });
  });
};

BravifyAPI.prototype.getSpells = function (mode) {
  if(!mode) { mode = 'CLASSIC'; } // Default mode: CLASSIC.
  return new Promise((res, rej) => {
    client.get(`/summoner/${this.language}/${mode}/random/2`, (e, r, body) => {
      if(e) { return rej(e); }
      res(body);
    });
  });
};

BravifyAPI.prototype.getLanguages = function () {
  return new Promise((res, rej) => {
    client.get('/language', (e, r, body) => {
      if(e) { return rej(e); }
      res(body);
    });
  });
};

BravifyAPI.prototype.getLanguage = function (lang) {
  return new Promise((res, rej) => {
    client.get(`/language/${lang}`, (e, r, body) => {
      if(e) { return rej(e); }
      body.languageCode = lang;
      res(body);
    });
  });
};

BravifyAPI.prototype.getAdjectives = function () {
  return new Promise((res, rej) => {
    client.get('/adjective', (e, r, body) => {
      if(e) { return rej(e); }
      res(body);
    });
  });
};

module.exports = BravifyAPI;
