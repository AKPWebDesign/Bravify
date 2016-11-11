var request = require('request-json');
var client = request.createClient('http://lol-static-data.akpwebdesign.com/');
client.headers['User-Agent'] = 'AKPWebDesign/Bravify <https://github.com/AKPWebDesign/Bravify>';
var Promise = require('bluebird'); // jshint ignore:line
const jsonfile = require('jsonfile');
const fs = require('fs');
const path = require('path');

function APIData(dataPath) {
  this.dataPath = dataPath;
  this.versionData = {};
  this.items = {};
  this.itemKeys = [];

  this.badItemGroups = [
    'BootsNormal',
    'DoransItems',
    'BootsFuror',
    'BootsAlacrity',
    'BootsCaptain',
    'BootsDistortion',
    'HealthPotion',
    'FlaskGroup',
    'PinkWards',
    'RelicBase',
    'Flasks',
    'TheBlackSpear',
    'GangplankRUpgrade01',
    'GangplankRUpgrade02',
    'GangplankRUpgrade03'
  ];

  this.badItemNames = [
    'Cull'
  ];

  this.badItemTags = [
    'Boots',
    'Jungle',
    'Trinket',
    'Consumable'
  ];
}

APIData.prototype.loadAll = function (progressFunction) {
  var version = 'v1.2'; //TODO: Grab latest version from Riot API rather than using hardcoded string.
  var region = 'na'; //TODO: Allow definition of region/language somewhere in UI.
  var self = this;

  //if the dataPath doesn't actually exist, create it now.
  if(!fs.existsSync(path.resolve(self.dataPath))) {
    require('mkdirp').sync(self.dataPath);
  }

  //check version we have against Riot version.
  return this.loadVersionData(region, version).then(function(result) {
    var offline = false;
    if(result && result.data) {
      self.versionData = result.data;
    } else {
      offline = true;
    }

    if(fs.existsSync(path.join(self.dataPath, 'data.json'))) {
      try {
        var data = jsonfile.readFileSync(path.join(self.dataPath, 'data.json'));
        if(!offline && data.versions.v !== result.data.v) {
          return self.loadFromServer(region, version, progressFunction);
        } else {
          return self.loadFromCache(data, progressFunction);
        }
      } catch(e) {
        if(!offline) {
          return self.loadFromServer(region, version, progressFunction);
        }
      }
    } else {
      if(!offline) {
        return self.loadFromServer(region, version, progressFunction);
      }
    }

    if(offline) {
      return new Promise(function(resolve, reject) {
        reject('offline');
      });
    }
  }, function() {
    if(fs.existsSync(path.join(self.dataPath, 'data.json'))) {
      try {
        var data = jsonfile.readFileSync(path.join(self.dataPath, 'data.json'));
        if(data) {
          return self.loadFromCache(data, progressFunction);
        }
      } catch(e) {
        return new Promise(function(resolve, reject) {
          reject('offline');
        });
      }
    } else {
        return new Promise(function(resolve, reject) {
          reject('offline');
        });
      }
  });
};

APIData.prototype.loadFromServer = function (region, version, progressFunction) {
  var self = this;
  //Load all data using promises.
  return Promise.each([this.loadItems(region, version), this.loadVersionData(region, version)],
               function(result, index, length) {
                 progressFunction(index, length);
               })
  .then(function(result){
    var data = {};
    for (var i = 0; i < result.length; i++) {
      data[result[i].key] = result[i].data;
    }
    self.saveToCache(data);
    progressFunction(1, 1);
  }, function(error){
    //if any data errors, we come here.
    console.error(error);
    throw 'There was an error loading data!';
  });
};

APIData.prototype.loadFromCache = function (data, progressFunction) {
  var self = this;
  return new Promise(function(resolve) {
    //ezpz, just pull data from object.
    self.items = data.items;
    self.versionData = data.versions;
    self.itemKeys = data.itemKeys;
    resolve('All data loaded from cache.');
  }).then(function(){
    progressFunction(1, 1);
  }, function(error){
    //if any data errors, we come here.
    console.error(error);
    throw 'There was an error loading data!';
  });
};

APIData.prototype.saveToCache = function (data) {
  var dataPath = this.dataPath;
  data.itemKeys = this.itemKeys;
  try {
    jsonfile.writeFileSync(path.join(dataPath, 'data.json'), data);
  } catch(e) {
    console.error(e);
  }
};

APIData.prototype.loadVersionData = function () {
  var self = this;
  return new Promise(function(resolve, reject) {
    client.get(`/versions`, function(err, res, body){
      if(err || (body.status && body.status === 'Error')) {reject(body); return;}
      self.versionData = body;
      resolve({key: 'versions', status: 'success', data: body});
    });
  });
};

APIData.prototype.loadItems = function () {
  var self = this;
  return new Promise(function(resolve, reject) {
    client.get(`/items`, function(err, res, body){
      if(err || (body.status && body.status === 'Error')) {reject(body); return;}
      self.items = body;
      for (var key in body) {
        if (body.hasOwnProperty(key)) {
          var goodItem = true;

          if(body[key].tags) {
            for (var i = 0; i < body[key].tags.length; i++) {
              //check item tags here, since we're already looping them.
              if(self.badItemTags.includes(body[key].tags[i])) {
                goodItem = false;
              }
            }
          }

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
      resolve({key: 'items', status: 'success', data: body});
    });
  });
};

module.exports = APIData;
