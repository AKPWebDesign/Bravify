var baseImageURL = "";
var artImageURL = "";

$('button.go').click(function(){
  ipcRenderer.send('generateNewBuild');
});

ipcRenderer.on('buildGenerated', function(event, message) {
  console.log(message);
  var champ = message.champ;
  baseImageURL = message.versions.cdn + "/" + message.versions.v + "/img/";
  artImageURL = message.versions.cdn + "/img/champion/";
  $('.champ-icon').css("background-image", buildBackgroundImageURL(baseImageURL + 'champion/' + champ.image.full));
  $('.app-container').css("background-image", buildBackgroundImageURL(artImageURL + 'splash/' + champ.key + "_0.jpg"));

  //SPELLS
  $('.spells div').tooltip('dispose');
  $('.spells').empty().append(createSpellDiv(message.spells[0])).append(createSpellDiv(message.spells[1]));
  $('.spells div').tooltip();

  $('.build-name').text('STUPID ' + champ.name.toUpperCase());
});

function buildBackgroundImageURL(url) {
  return "url(" + url + ")";
}

function createSpellDiv(spell) {
  var template = Handlebars.compile($("#spell-template").html());
  var title = spell.name + " - " + spell.sanitizedDescription;
  var url = baseImageURL + "spell/" + spell.image.full;
  var context = {url: url, title: title};
  return template(context);
}
