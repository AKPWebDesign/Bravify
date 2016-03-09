window.$ = window.jQuery = require('jquery');
const ipcRenderer = require('electron').ipcRenderer;
const remote = require('electron').remote;
const Handlebars = require('handlebars');
var objectTemplate;
var baseImageURL = "";
var champsByName = {};

$(document).ready(function(){
  objectTemplate = Handlebars.compile($("#champ-template").html());
  ipcRenderer.send('retrieveChamps');

  $('.close-window').click(function() {
    ipcRenderer.send('closeChampsWindow');
  });

  $('.save-champs').click(function() {
    saveAndClose();
  });
});

ipcRenderer.on("champions", function(event, message) {
  console.log(message);
  $('.champion-list-container').empty();
  baseImageURL = message.versions.cdn + "/" + message.versions.v + "/img/";
  for (var key in message.champs) {
    if (message.champs.hasOwnProperty(key)) {
      champsByName[message.champs[key].name] = message.champs[key];
    }
  }
  console.log(champsByName);
  for (var key in champsByName) {
    if (champsByName.hasOwnProperty(key)) {
      $('.champion-list-container').append(createChampDiv(champsByName[key]));
    }
  }

  $('.champ-item-container').each(function(){
    $(this).click(function(){
      $(this).toggleClass('selected');
    });
  });
});

function createChampDiv(champ) {
  var title = champ.name + ", " + champ.title;
  var name = champ.name;
  var key = champ.key;
  var url = baseImageURL + 'champion/' + champ.image.full;
  var context = {url: url, title: title, name: name, champKey: key};
  return objectTemplate(context);
}

function saveAndClose() {
  
}
