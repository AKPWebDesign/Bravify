var Promise = require("bluebird");

function BuildGenerator(APIData) {
  this.APIData = APIData;
}

BuildGenerator.prototype.generate = function (map) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var champ = self.genChamp();
    var items = self.genItems(champ.name, map);
    resolve({champ: champ, items: items, versions: self.APIData.versionData});
  });
};

BuildGenerator.prototype.genChamp = function () {
  var champKey = this.APIData.champKeyArray[Math.floor(Math.random()*this.APIData.champKeyArray.length)];
  return this.APIData.champs[champKey];
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
  var items = this.APIData.itemKeyArray;
  while(!done) {
    if(currentItem) {
      if(!this.APIData.items[currentItem]) {
        currentItem = null;
        items = this.APIData.itemKeyArray;
      } else {
        items = this.APIData.items[currentItem].into;
      }
    } else {
      items = this.APIData.itemKeyArray;
    }

    if(items) {
      currentItem = items[Math.floor(Math.random()*items.length)];
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
