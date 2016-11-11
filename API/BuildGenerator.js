var Promise = require('bluebird'); // jshint ignore:line
var chance = new (require('chance'))();
const BravifyAPI = new (require("./BravifyAPI"))();

function BuildGenerator(APIData) {
  this.APIData = APIData;
  this.BravifyAPI = BravifyAPI;

  this.badItemTags = [
    'Boots',
    'Jungle',
    'Consumable',
    'JungleItems'
  ];
}

BuildGenerator.prototype.generate = function (mapData) {
  var self = this;
  var map = mapData.map;
  var mode = mapData.mode;
  var data = {};
  return BravifyAPI.getChampion().then(champ => {
    data.champ = champ;
    while(!data.skills) {
      data.skills = self.genSkills(champ);
    }
    return BravifyAPI.getSpells(mode);
  }).then(spells => {
    data.spells = spells;
    data.items = self.genItems(data.champ.name, map, self.hasSmite(spells), false); //TODO: Pull duplicatesAllowed value from UI.
    data.adjective = self.genAdjective(BravifyAPI.adjectives, data.champ.name);
    data.masteries = self.genMasteries();
    data.versions = self.APIData.versionData;
    return data;
  });
};

BuildGenerator.prototype.hasSmite = function (spells) {
  for (var i = 0; i < spells.length; i++) {
    if(spells[i].id == 'SummonerSmite') {return true;}
  }
  return false;
};

BuildGenerator.prototype.genAdjective = function (adjs, champ) {
  var adj = chance.pickone(adjs);
  if(adj.includes("{champ}")) {
    adj = adj.replace(/{champ}/i, champ);
  } else {
    adj = adj + " " + champ;
  }

  return adj;
};

BuildGenerator.prototype.genMasteries = function () {
  var masteries = [18, 12, 0];

  masteries = chance.shuffle(masteries);

  return masteries;
};

BuildGenerator.prototype.genSkills = function (champ) {
  var skillToKey = ['Q', 'W', 'E', 'R'];
  var choices = [];
  var skills = {};

  for (var i = 0; i < champ.spells.length; i++) {
    if(champ.spells[i].maxrank >= 5) {
      skills[skillToKey[i]] = {
        image: champ.spells[i].image.full,
        name: champ.spells[i].name,
        description: champ.spells[i].description.replace(/<(?:.|\n)*?>/gm, ' ').replace(/\s\s+/g, ' ') // sanitize the description. very naive. might break things.
      };
      choices.push(skillToKey[i]);
    }
  }

  if(!choices || !choices.length) {
    return null;
  }

  skills.order = chance.pickset(choices, 4);

  return skills;
};

BuildGenerator.prototype.genItems = function (champion, map, hasSmite, duplicatesAllowed) {
  var items = [];
  var ids = [];
  var groups = [];

  //console.log(`Generating items for map: ${map}.`)

  //first item will be boots.
  items.push(this.newItem(map, null, '1001')); //generate item starting with basic boots.

  //second item will be a jungle item, if we have smite.
  if(hasSmite) {
    items.push(this.newItem(map, null, '1041')); //generate item starting with Hunter's Machete.
  }

  for(var i; items.length < 6; i++) {
    var good = false;
    while(!good) {
      var item = this.newItem(map, this.badItemTags);

      //in case we get a null item
      if(!item) {
        continue;
      }

      //if we aren't allowed to have duplicate items and we already have this item, skip to next iteration of loop.
      if(!duplicatesAllowed && ids.includes(item.id)) {
        continue;
      }

      ids.push(item.id);

      //if we have a 'required champion', we make sure that we generated the right champ for this item.
      if((item.requiredChampion && (item.requiredChampion === champion)) || !item.requiredChampion) {
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

BuildGenerator.prototype.newItem = function (map, badTags, base) {
  var done = false;
  var currentItem = base || null;
  var lastItem = null;
  var twoItemsBack = null;
  var items = this.APIData.itemKeys;
  var itemPath = [];

  itemPath.push('============================================================');

  while(!done) {
    if(currentItem) {
      if(!this.APIData.items[currentItem]) {
        currentItem = base || null;
        items = this.APIData.itemKeys;
      } else {
        items = this.APIData.items[currentItem].into;
        itemPath.push(`<=== ${currentItem}: ${this.APIData.items[currentItem].name}`);
      }
    } else {
      items = this.APIData.itemKeys;
    }

    if(items) {
      //weird queue system for use later in the function.
      twoItemsBack = lastItem;
      lastItem = currentItem;
      currentItem = chance.pickone(items);
      if(!this.APIData.items[currentItem]) {
        if(base) {
          currentItem = lastItem;
          done = true;
        }
      }
    } else {
      //check map, make sure we can use this item on the map we selected.
      if(!this.APIData.items[currentItem].maps[map]) {
        itemPath.push(`=== RESET - MAP WRONG -- ${currentItem}: ${this.APIData.items[currentItem].name} ===`);
        currentItem = base || null;
      } else {
        itemPath.push(`===> ${currentItem}: ${this.APIData.items[currentItem].name}`);
        done = true;
      }
    }

    if(!this.APIData.items[currentItem]) {
      done = false;
    } else {
      if(this.APIData.items[currentItem].consumed) {
        currentItem = null;
        done = false;
        itemPath.push(`=== RESET - CONSUMABLE -- ${currentItem}: ${this.APIData.items[currentItem].name} ===`);
      }

      if(this.APIData.items[currentItem].hideFromAll && !base) {
        itemPath.push(`=== RESET - HIDE FROM ALL -- ${currentItem}: ${this.APIData.items[currentItem].name} ===`);
        currentItem = null;
        done = false;
      }

      if(badTags && currentItem && this.APIData.items[currentItem].tags) {
        for (var i = 0; i < this.APIData.items[currentItem].tags.length; i++) {
          if(badTags.includes(this.APIData.items[currentItem].tags[i])) {
            itemPath.push(`=== RESET - BAD TAG - ${this.APIData.items[currentItem].tags[i]} -- ${currentItem}: ${this.APIData.items[currentItem].name} ===`);
            currentItem = null;
            break;
          }
        }
      }

      if(badTags && currentItem && this.APIData.items[currentItem].group &&
        badTags.includes(this.APIData.items[currentItem].group)) {
          itemPath.push(`=== RESET - BAD GROUP - ${this.APIData.items[currentItem].group} -- ${currentItem}: ${this.APIData.items[currentItem].name} ===`);
          currentItem = null;
      }
    }

    if(currentItem === null) {
      done = false;
    }
  }

  var item = this.APIData.items[currentItem];

  //console.log(itemPath);

  if(!item || !item.gold.purchasable) {
    if(lastItem) {
      item = this.APIData.items[lastItem];
    } else {
      //we need a lastItem here. if we don't have one, bad things happen on the UI side. emergency exit now.
      return null;
    }
    if(twoItemsBack) {
      lastItem = twoItemsBack;
    }
  }

  var name = item.name;

  if(name.startsWith('Enchantment:')) {
    if(lastItem) {
      var ind = name.indexOf(' ');
      name = name.slice(ind);
      name = this.APIData.items[lastItem].name + ' - ' + name;
    }
  }

  var obj = {
    id: item.id,
    name: name,
    description: item.description,
    plaintext: item.plaintext,
    gold: item.gold.total,
    image: item.image.full,
    requiredChampion: item.requiredChampion,
    group: item.group
  };

  return obj;
};

module.exports = BuildGenerator;
