function ItemSetGenerator() {
  this.baseItemSet = require('./base_itemset');
}

ItemSetGenerator.prototype.generate = function (build) {
  var itemSet = JSON.parse(JSON.stringify(this.baseItemSet));
  var i;

  //clear items from set
  itemSet.blocks[0].items = [];

  //change first block name to include skill leveling info.
  itemSet.blocks[0].type += ' (';
  for (i = 0; i < build.skills.order.length; i++) {
    itemSet.blocks[0].type += build.skills.order[i] + ' > ';
  }
  itemSet.blocks[0].type = itemSet.blocks[0].type.slice(0, -3);
  itemSet.blocks[0].type += ')';

  //add items to first block.
  for (i = 0; i < build.items.length; i++) {
    itemSet.blocks[0].items.push({id: build.items[i].id.toString(), count: 1});
  }


  //title set
  itemSet.title = build.adjective.toUpperCase();

  //set champion for set
  itemSet.champion = build.champ.key;

  return itemSet;
};

module.exports = ItemSetGenerator;
