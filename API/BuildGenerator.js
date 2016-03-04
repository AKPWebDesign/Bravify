var Promise = require("bluebird");
var chance = new (require("chance"))();

function BuildGenerator(APIData) {
  this.APIData = APIData;
}

BuildGenerator.prototype.generate = function (map) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var champ = self.genChamp();
    var items = self.genItems(champ.name, map);
    //TODO: Pull mode to use from UI.
    resolve({champ: champ, items: items, spells: self.genSpells("CLASSIC"), versions: self.APIData.versionData});
  });
};

BuildGenerator.prototype.genChamp = function () {
  return this.APIData.champs[chance.pickone(this.APIData.champKeys)];
};

BuildGenerator.prototype.genSpells = function (mode) {
  var set = chance.pickset(this.APIData.summonerSpellKeys[mode], 2);
  return set.map(s => this.APIData.summonerSpells[s]);
};

BuildGenerator.prototype.genItems = function (champion, map) {
  var items = [];
  var groups = [];
  for(var i = 0; i < 6; i++) {
    var good = false;
    while(!good) {
      var item = this.newItem(map);
      //if we have a "required champion", we make sure that we generated the right champ for this item.
      if((item.requiredChampion && (item.requiredChampion == champion)) || !item.requiredChampion) {
        if(item.group) {
          if(!groups.includes(item.group)) {
            items.push(item);
            groups.push(item.group);
            good = true;
          }
        } else {
          items.push(item);
          good = true;
        }
      }
    }
  }
  return items;
};

BuildGenerator.prototype.newItem = function (map, group) {
  var done = false;
  var currentItem = null;
  var items = this.APIData.itemKeys;
  while(!done) {
    if(currentItem) {
      if(!this.APIData.items[currentItem]) {
        currentItem = null;
        items = this.APIData.itemKeys;
      } else {
        items = this.APIData.items[currentItem].into;
      }
    } else {
      items = this.APIData.itemKeys;
    }

    if(items) {
      currentItem = chance.pickone(items);
    } else {
      //check map, make sure we can use this item on the map we selected.
      if(!this.APIData.items[currentItem].maps[map]) {
        currentItem = null;
      } else {
        done = true;
      }
    }
  }

  return this.APIData.items[currentItem];
};

module.exports = BuildGenerator;
