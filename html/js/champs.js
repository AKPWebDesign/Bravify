window.$ = window.jQuery = require('jquery');
const ipcRenderer = require('electron').ipcRenderer;
const Handlebars = require('handlebars');
var objectTemplate;
var baseImageURL = '';
var champsByName = {};
var groupData = {};
var selectedChamps = [];

$(document).ready(function(){
  objectTemplate = Handlebars.compile($('#champ-template').html());
  ipcRenderer.send('retrieveChamps');

  $('.close-window').click(function() {
    ipcRenderer.send('closeChampsWindow');
  });

  $('.save-champs').click(function() {
    saveAndClose();
  });

  $('.group-selector .dropdown-item').click(function() {
    selectGroup($(this).data('group'));
  });
});

ipcRenderer.on('champions', function(event, message) {
  var key;
  groupData = message.groups;
  selectedChamps = message.selected;
  $('.champion-list-container').empty();
  baseImageURL = message.versions.cdn + '/' + message.versions.v + '/img/';
  for (key in message.champs) {
    if (message.champs.hasOwnProperty(key)) {
      champsByName[message.champs[key].name] = message.champs[key];
    }
  }
  console.log(champsByName);
  for (key in champsByName) {
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
  var title = champ.name + ', ' + champ.title;
  var name = champ.name;
  var key = champ.key;
  var selected = (selectedChamps.includes(key) ? 'selected' : '');
  var url = baseImageURL + 'champion/' + champ.image.full;
  var context = {url: url, title: title, name: name, champKey: key, selected: selected};
  return objectTemplate(context);
}

function saveAndClose() {
  //if no champs in selected, select all.
  if(!$('.selected').length) {
    selectAll();
  }

  selectedChamps = [];

  $('.selected').each(function(){
    selectedChamps.push($(this).data('key'));
  });

  ipcRenderer.send('newChampSelection', selectedChamps);
  ipcRenderer.send('closeChampsWindow');
}

function selectGroup(group) {
  if(!group) {console.log('No group to select!'); return;}
  switch(group) {
    case 'All':
      selectAll();
      return;
    case 'None':
      selectNone();
      return;
  }

  var champs = groupData[group];
  if(!champs) {
    console.log('No champs in group '+group);
    return;
  }

  if(!$('.champ-item-container:not(.selected)').length) {
    selectNone();
  }

  for (var i = 0; i < champs.length; i++) {
    $(`.${champs[i]}`).toggleClass('selected');
  }
}

function selectAll() {
  $('.champ-item-container').each(function(){
    $(this).addClass('selected');
  });
}

function selectNone() {
  $('.champ-item-container').each(function(){
    $(this).removeClass('selected');
  });
}
