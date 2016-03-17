var Promise = require('bluebird'); // jshint ignore:line
var chance = new (require('chance'))();

function BuildGenerator(APIData) {
  this.APIData = APIData;

  this.adjectives = require('./Adjectives');

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
  return new Promise(function(resolve) {
    var champ = self.genChamp();
    var spells = self.genSpells(mode);
    var hasSmite = spells.includes(self.APIData.summonerSpells.SummonerSmite);
    var items = self.genItems(champ.name, map, hasSmite, false); //TODO: Pull duplicatesAllowed value from UI.
    var skills = self.genSkills(champ);
    var adjective = self.genAdjective();
    resolve({champ: champ, items: items, spells: spells, skills: skills, masteries: self.genMasteries(), adjective: adjective, versions: self.APIData.versionData});
  });
};

BuildGenerator.prototype.genChamp = function () {
  return this.APIData.champs[chance.pickone(this.APIData.champKeys)];
};

BuildGenerator.prototype.genSpells = function (mode) {
  var set = chance.pickset(this.APIData.summonerSpellKeys[mode], 2);
  return set.map(s => this.APIData.summonerSpells[s]);
};

BuildGenerator.prototype.genAdjective = function () {
  return chance.pickone(this.adjectives);
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
    if(champ.spells[i].maxrank === 5) {
      skills[skillToKey[i]] = {
        image: champ.spells[i].image.full,
        name: champ.spells[i].name,
        description: champ.spells[i].sanitizedDescription
      };
      choices.push(skillToKey[i]);
    }
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

  if(!item.gold.purchasable) {
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
