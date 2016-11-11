var request = require('request-json');
var client = request.createClient('https://bravify-staging-api.akpwebdesign.com/');
client.headers['User-Agent'] = 'AKPWebDesign/Bravify <https://github.com/AKPWebDesign/Bravify>';
var Promise = require('bluebird'); // jshint ignore:line

function BravifyAPI() {
  this.languages = ['en_US'];
  this.langData = {};
  var self = this;
  this.getLanguages().then(langs => {
    self.languages = langs;
    return this.getLanguage(langs[0]);
  }).then(langData => {
    self.langData = langData;
  });
}

BravifyAPI.prototype.getChampion = function (includeList) {
  return new Promise((res, rej) => {
    client.get('/champion/en_US/random/full', (e, r, body) => {
      if(e) { return rej(e); }
      res(body);
    });
  });
};

BravifyAPI.prototype.getSpells = function (mode) {
  if(!mode) { mode = 'CLASSIC'; } // Default mode: CLASSIC.
  return new Promise((res, rej) => {
    client.get(`/summoner/en_US/${mode}/random/2`, (e, r, body) => {
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
      res(body);
    });
  });
};

//TODO: Consider pulling all adjectives and using as local list to speed things up slightly.
BravifyAPI.prototype.getAdjective = function () {
  return new Promise((res, rej) => {
    client.get('/adjective/random', (e, r, body) => {
      if(e) { return rej(e); }
      res(body);
    });
  });
};


module.exports = BravifyAPI;
