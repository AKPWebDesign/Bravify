var Promise = require("bluebird");
var chance = new (require("chance"))();

function BuildGenerator(APIData) {
  this.APIData = APIData;

  this.badItemTags = [
    "Boots",
    "Jungle",
    "Consumable",
    "JungleItems"
  ]
}

BuildGenerator.prototype.generate = function (map) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var champ = self.genChamp();
    var spells = self.genSpells("CLASSIC");
    var hasSmite = spells.includes(self.APIData.summonerSpells.SummonerSmite);
    var items = self.genItems(champ.name, map, hasSmite);
    var skills = self.genSkills(champ);
    //TODO: Pull mode to use from UI.
    resolve({champ: champ, items: items, spells: spells, skills: skills, versions: self.APIData.versionData});
  });
};

BuildGenerator.prototype.genChamp = function () {
  return this.APIData.champs[chance.pickone(this.APIData.champKeys)];
};

BuildGenerator.prototype.genSpells = function (mode) {
  var set = chance.pickset(this.APIData.summonerSpellKeys[mode], 2);
  return set.map(s => this.APIData.summonerSpells[s]);
};

BuildGenerator.prototype.genSkills = function (champ) {
  var skillToKey = ["Q", "W", "E", "R"];
  var choices = [];
  var skills = {};

  for (var i = 0; i < champ.spells.length; i++) {
    if(champ.spells[i].maxrank > 3) {
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

BuildGenerator.prototype.genItems = function (champion, map, hasSmite) {
  var items = [];
  var groups = [];

  //first item will be boots.
  items.push(this.newItem(map, null, "1001")); //generate item starting with basic boots.

  //second item will be a jungle item, if we have smite.
  if(hasSmite) {
    items.push(this.newItem(map, null, "1041")); //generate item starting with Hunter's Machete.
  }

  for(var i; items.length < 6; i++) {
    var good = false;
    while(!good) {
      var item = this.newItem(map, this.badItemTags);
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

BuildGenerator.prototype.newItem = function (map, badTags, base) {
  var done = false;
  var currentItem = base || null;
  var items = this.APIData.itemKeys;
  var itemPath = [];

  itemPath.push("============================================================");

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

    if(currentItem == null) {
      done = false;
    }
  }

  var item = this.APIData.items[currentItem];

  var obj = {
    name: item.name,
    description: item.description,
    plaintext: item.plaintext,
    gold: item.gold.total,
    image: item.image.full,
    requiredChampion: item.requiredChampion,
    group: item.group
  }

  //console.log(itemPath);

  return obj;
};

module.exports = BuildGenerator;
