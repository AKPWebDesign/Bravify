var baseImageURL = "";
var artImageURL = "";
var objectTemplate;

$(document).ready(function() {
  objectTemplate = Handlebars.compile($("#object-template").html());
});


$('button.go').click(function(){
  ipcRenderer.send('generateNewBuild');
});

ipcRenderer.on('buildGenerated', function(event, message) {
  console.log(message);
  //SETUP
  var champ = message.champ;
  var spells = message.spells;
  var items = message.items;
  var skills = message.skills;
  baseImageURL = message.versions.cdn + "/" + message.versions.v + "/img/";
  artImageURL = message.versions.cdn + "/img/champion/";

  //CHAMP-RELATED IMAGES
  $('.champ-icon').css("background-image", buildBackgroundImageURL(baseImageURL + 'champion/' + champ.image.full));
  $('.app-container').css("background-image", buildBackgroundImageURL(artImageURL + 'splash/' + champ.key + "_0.jpg"));

  //SPELLS
  $('.spells div').tooltip('dispose');
  $('.spells').empty().append(createSpellDiv(message.spells[0])).append(createSpellDiv(message.spells[1]));
  $('.spells div').tooltip();

  //CHAMP NAME
  $('.build-name').text('STUPID ' + champ.name.toUpperCase());

  //ITEMS
  $('.items').empty();

  for (var i = 0; i < items.length; i++) {
    $('.items').append(createItemDiv(items[i]));
  }

  $('.items div').tooltip();

  //SKILLS
  $('.skills').empty();

  for (var i = 0; i < skills.order.length; i++) {
    $('.skills').append(createSkillDiv(skills[skills.order[i]], skills.order[i]));
    $('.skills').append("<div class='skill-spacer'>&gt;</div>")
  }

  $('.skills div').tooltip();
});

function buildBackgroundImageURL(url) {
  return "url(" + url + ")";
}

function createSpellDiv(spell) {
  var title = spell.name + " - " + spell.sanitizedDescription;
  var url = baseImageURL + "spell/" + spell.image.full;
  var context = {type: "spell", url: url, title: title};
  return createObjectDiv(context);
}

function createItemDiv(item) {
  var title = item.name + " - " + item.plaintext;
  var url = baseImageURL + "item/" + item.image;
  var context = {type: "item", url: url, title: title};
  return createObjectDiv(context);
}

function createSkillDiv(skill, key) {
  var title = skill.name + " - " + skill.description;
  var url = baseImageURL + "spell/" + skill.image;
  var inner = key;
  var context = {type: "skill", url: url, title: title, inner: inner};
  return createObjectDiv(context);
}

function createObjectDiv(obj) {
  return objectTemplate(obj);
}
