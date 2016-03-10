var baseImageURL = "";
var artImageURL = "";
var objectTemplate;
var currentBuild;
var mapData = {map: 11, mode: "CLASSIC"};

$(document).ready(function() {
  objectTemplate = Handlebars.compile($("#object-template").html());
});


$('button.go').click(function(){
  ipcRenderer.send('generateNewBuild', mapData);
});

$('button.copy').click(function() {
  if(currentBuild) {
    copyToClipboard(currentBuild);
  }
});

$('button.save').click(function() {
  if(currentBuild) {
    console.log(currentBuild);
    ipcRenderer.send('saveBuild', currentBuild);
  }
});

$('button.champs').click(function() {
  ipcRenderer.send('openChampSelect');
});

$('.buttons .maps .dropdown-item').click(function() {
  var map = ($(this).data("map") || 11);
  var mode = ($(this).data("mode") || "CLASSIC");
  mapData = {map: map, mode: mode};
  $('.buttons .maps .dropdown-toggle').text($(this).text());
  $('button.go').click();
});

ipcRenderer.on('champsChanged', function() {
  $('button.go').click();
});

ipcRenderer.on('buildGenerated', function(event, message) {
  currentBuild = message;

  //SETUP
  var champ = message.champ;
  var spells = message.spells;
  var items = message.items;
  var skills = message.skills;
  var masteries = message.masteries;
  var goldTotal = 0;
  baseImageURL = message.versions.cdn + "/" + message.versions.v + "/img/";
  artImageURL = message.versions.cdn + "/img/champion/";

  //RANDOM SKIN FOR ART
  var randomSkin = champ.skins[Math.floor(Math.random()*champ.skins.length)];
  var nameText = randomSkin.name;
  if(nameText == "default") {nameText = champ.name;}
  $('.champ-skin-name').text(nameText);

  //CHAMP-RELATED IMAGES
  $('.champ-icon').css("background-image", buildBackgroundImageURL(baseImageURL + 'champion/' + champ.image.full));
  $('.app-container').css("background-image", buildBackgroundImageURL(`${artImageURL}splash/${champ.key}_${randomSkin.num}.jpg`));

  //SPELLS
  $('.spells div').tooltip('dispose');
  $('.spells').empty().append(createSpellDiv(message.spells[0])).append(createSpellDiv(message.spells[1]));
  $('.spells div').tooltip();

  //CHAMP NAME
  $('.build-name').text(message.adjective.toUpperCase() + " " + champ.name.toUpperCase());

  //ITEMS
  $('.items').empty();

  for (var i = 0; i < items.length; i++) {
    $('.items').append(createItemDiv(items[i]));
    goldTotal = goldTotal + items[i].gold;
  }

  $('.items div').tooltip();

  $('.gold').text("Total Gold: " + goldTotal);

  //SKILLS
  $('.skills').empty();

  for (var i = 0; i < skills.order.length; i++) {
    $('.skills').append(createSkillDiv(skills[skills.order[i]], skills.order[i]));
    $('.skills').append("<div class='skill-spacer'>&gt;</div>")
  }

  $('.skills div').tooltip();

  //MASTERIES
  $('.masteries').empty();
  $('.masteries').append(createMasteriesSpans(masteries));
});

function buildBackgroundImageURL(url) {
  return "url(" + url + ")";
}

function createMasteriesSpans(masteries) {
  var trees = {
    0: "ferocity",
    1: "cunning",
    2: "resolve"
  };

  var spanString = "";

  for (var i = 0; i < masteries.length; i++) {
    spanString += `<span class="mastery-${trees[i]}">${masteries[i]}</span>`
    if(i !== masteries.length - 1) {
      spanString += "/";
    }
  }

  return spanString;
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

function copyToClipboard(build) {
  var string = build.adjective.toUpperCase() + " " + build.champ.name.toUpperCase();
  var skills = "";
  for (var i = 0; i < build.skills.order.length; i++) {
    skills += build.skills.order[i] + " > ";
  }
  skills = skills.slice(0, -3);
  var masteries = "";
  for (var i = 0; i < build.masteries.length; i++) {
    masteries += build.masteries[i] + "/";
  }
  masteries = masteries.slice(0, -1);

  string += ` (${build.spells[0].name} / ${build.spells[1].name} / ${skills}) (${masteries}) with `;

  for (var i = 0; i < build.items.length; i++) {
    string += build.items[i].name + ", ";
  }

  string = string.slice(0, -2) + ".";

  clipboard.writeText(string);
}
