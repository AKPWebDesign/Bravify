var request = require('request-json');
var client = request.createClient("http://lol-static-data.akpwebdesign.com/");
var Promise = require("bluebird");

function APIData() {
  this.versionData = {};
  this.champs = {};
  this.champKeys = [];
  this.items = {};
  this.itemKeys = [];
  this.maps = {};
  this.masteries = {}
  this.summonerSpells = {};
  this.summonerSpellKeys = {};

  this.itemsAsTags = {};

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
  ];

  this.badItemTags = [
    "Boots",
    "Jungle",
    "Trinket",
    "Consumable"
  ];
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
    client.get(`/versions`, function(err, res, body){
      if(err || (body.status && body.status == "Error")) {reject(body); return;}
      self.versionData = body;
      resolve("Version Data loaded successfully.");
    });
  });
};

APIData.prototype.loadChamps = function (region, version) {
  var self = this;
  return new Promise(function(resolve, reject) {
    client.get(`/champs`, function(err, res, body){
      if(err || (body.status && body.status == "Error")) {reject(body); return;}
      self.champs = body;
      for (var key in body) {
        if (body.hasOwnProperty(key)) {
          self.champKeys.push(key);
        }
      }
      resolve("Champ Data loaded successfully.");
    });
  });
};

APIData.prototype.loadItems = function (region, version) {
  var self = this;
  return new Promise(function(resolve, reject) {
    client.get(`/items`, function(err, res, body){
      if(err || (body.status && body.status == "Error")) {reject(body); return;}
      self.items = body;
      for (var key in body) {
        if (body.hasOwnProperty(key)) {
          var goodItem = true;

          if(body[key].tags) {
            for (var i = 0; i < body[key].tags.length; i++) {
              var tag = body[key].tags[i];
              if(!self.itemsAsTags[tag]) {self.itemsAsTags[tag] = []};
              self.itemsAsTags[tag].push(body[key]);

              //check item tags here, since we're already looping them.
              if(self.badItemTags.includes(body[key].tags[i])) {
                goodItem = false;
              }
            }
          }

          var goodItem = true;

          //check item group
          if(body[key].group && self.badItemGroups.includes(body[key].group)) {
            goodItem = false;
          }

          //check item name
          if(self.badItemNames.includes(body[key].name)) {
            goodItem = false;
          }

          //check for stupid consumable tag
          if(body[key].consumed) {
            goodItem = false;
          }

          if(goodItem) {
            self.itemKeys.push(key);
          }
        }
      }
      resolve("Item Data loaded successfully.");
    });
  });
};

APIData.prototype.loadMaps = function (region, version) {
  var self = this;
  return new Promise(function(resolve, reject) {
    client.get(`/maps`, function(err, res, body){
      if(err || (body.status && body.status == "Error")) {reject(body); return;}
      self.maps = body; //TODO: associate lanes with maps, eg: treeline = top/bottom/jung, rift = top/mid/bottom/jung.
      resolve("Map Data loaded successfully.");
    });
  });
};

APIData.prototype.loadMasteries = function (region, version) {
  var self = this;
  return new Promise(function(resolve, reject) {
    client.get(`/masteries`, function(err, res, body){
      if(err || (body.status && body.status == "Error")) {reject(body); return;}
      self.masteries = body;
      resolve("Mastery Data loaded successfully.");
    });
  });
};

APIData.prototype.loadSummonerSpells = function (region, version) {
  var self = this;
  return new Promise(function(resolve, reject) {
    client.get(`/spells`, function(err, res, body){
      if(err || (body.status && body.status == "Error")) {reject(body); return;}
      self.summonerSpells = body;
      for(var key in body) {
        if(body.hasOwnProperty(key)) {
          for (var i = 0; i < body[key].modes.length; i++) {
            var mode = body[key].modes[i];
            if(!self.summonerSpellKeys[mode]) {
              self.summonerSpellKeys[mode] = [];
            }
            self.summonerSpellKeys[mode].push(key);
          }
        }
      }
      //console.log(self.summonerSpellKeys);
      resolve("Summoner Spell Data loaded successfully.");
    });
  });
};

module.exports = APIData;
