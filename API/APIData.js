var request = require('request-json');
var client = request.createClient("https://global.api.pvp.net");
var Promise = require("bluebird");

function APIData(api_key) {
  this.api_key = api_key;
  this.versionData = {};
  this.champs = {};
  this.champKeyArray = [];
  this.items = {};
  this.itemKeyArray = [];
  this.maps = {};
  this.masteries = {}
  this.summonerSpells = {};

  this.badItemGroups = [
    "BootsNormal",
    "DoransItems",
    "BootsFuror",
    "BootsAlacrity",
    "BootsCaptain",
    "BootsDistortion",
    "HealthPotion",
    "FlaskGroup",
    "PinkWards",
    "RelicBase",
    "Flasks",
    "TheBlackSpear",
    "GangplankRUpgrade01",
    "GangplankRUpgrade02",
    "GangplankRUpgrade03"
  ];

  this.badItemNames = [
    "Cull"
  ]
}

APIData.prototype.loadAll = function (progressFunction) {
  var version = "v1.2"; //TODO: Grab latest version from Riot API rather than using hardcoded string.
  var region = "na"; //TODO: Allow definition of region/language somewhere in UI.
  var self = this;

  //Load all data using promises.
  return Promise.each([this.loadChamps(region, version), this.loadItems(region, version),
               this.loadMaps(region, version), this.loadMasteries(region, version),
               this.loadSummonerSpells(region, version), this.loadVersionData(region, version)], function(result, index, length) {
                 progressFunction(index, length);
               })
  .then(function(result){
    //if all data is loaded, prepare key arrays.
    for (var key in self.champs) {
      if (self.champs.hasOwnProperty(key)) {
        self.champKeyArray.push(key);
      }
    }
    for (var key in self.items) {
      if (self.items.hasOwnProperty(key)) {
        //check item to be sure it's not in a disallowed group
        if(!(self.items[key].group && self.badItemGroups.includes(self.items[key].group))) {
          //check item to be sure it's not got a disallowed name.
          if(!self.badItemNames.includes(self.items[key].name)) {
            self.itemKeyArray.push(key);
          }
        }
      }
    }
    progressFunction(1, 1);
  }, function(error){
    //if any data errors, we come here.
    console.error(error);
    throw "There was an error loading data!";
  });
};

APIData.prototype.loadVersionData = function (region, version) {
  var self = this;
  return new Promise(function(resolve, reject) {
    client.get(`/api/lol/static-data/${region}/${version}/realm?api_key=${self.api_key}`, function(err, res, body){
      if(err) {reject(err); return;}
      if(body.status && body.status.status_code !== 200) {reject(body); return;}
      self.versionData = body;
      resolve("Version Data loaded successfully.");
    });
  });
};

APIData.prototype.loadChamps = function (region, version) {
  var self = this;
  return new Promise(function(resolve, reject) {
    client.get(`/api/lol/static-data/${region}/${version}/champion?champData=all&api_key=${self.api_key}`, function(err, res, body){
      if(err) {reject(err); return;}
      if(body.status && body.status.status_code !== 200) {reject(body); return;}
      self.champs = body.data;
      resolve("Champ Data loaded successfully.");
    });
  });
};

APIData.prototype.loadItems = function (region, version) {
  var self = this;
  return new Promise(function(resolve, reject) {
    client.get(`/api/lol/static-data/${region}/${version}/item?itemListData=all&api_key=${self.api_key}`, function(err, res, body){
      if(err) {reject(err); return;}
      if(body.status && body.status.status_code !== 200) {reject(body); return;}
      self.items = body.data;
      resolve("Item Data loaded successfully.");
    });
  });
};

APIData.prototype.loadMaps = function (region, version) {
  var self = this;
  return new Promise(function(resolve, reject) {
    client.get(`/api/lol/static-data/${region}/${version}/map?api_key=${self.api_key}`, function(err, res, body){
      if(err) {reject(err); return;}
      if(body.status && body.status.status_code !== 200) {reject(body); return;}
      self.maps = body.data; //TODO: associate lanes with maps, eg: treeline = top/bottom/jung, rift = top/mid/bottom/jung.
      resolve("Map Data loaded successfully.");
    });
  });
};

APIData.prototype.loadMasteries = function (region, version) {
  var self = this;
  return new Promise(function(resolve, reject) {
    client.get(`/api/lol/static-data/${region}/${version}/mastery?masteryListData=all&api_key=${self.api_key}`, function(err, res, body){
      if(err) {reject(err); return;}
      if(body.status && body.status.status_code !== 200) {reject(body); return;}
      self.masteries = body.data;
      resolve("Mastery Data loaded successfully.");
    });
  });
};

APIData.prototype.loadSummonerSpells = function (region, version) {
  var self = this;
  return new Promise(function(resolve, reject) {
    client.get(`/api/lol/static-data/${region}/${version}/summoner-spell?spellData=all&api_key=${self.api_key}`, function(err, res, body){
      if(err) {reject(err); return;}
      if(body.status && body.status.status_code !== 200) {reject(body); return;}
      self.summonerSpells = body.data;
      resolve("Summoner Spell Data loaded successfully.");
    });
  });
};

module.exports = APIData;
