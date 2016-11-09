//Declare variables.
window.$ = window.jQuery = require('jquery');
const {ipcRenderer, remote, clipboard} = require('electron');
const imagesLoaded = require('imagesloaded');
const Handlebars = require('handlebars');
require('electron-cookies');

//set up titlebar when document is ready.
$(document).ready(function(){
  var titlebar = require('titlebar');
  var t = titlebar();

  //append to titlebar element, if it exists, otherwise append to body.
  if($(".titlebar-container").length) {
    t.appendTo($(".titlebar-container").get(0));
  } else {
    t.appendTo(document.body);
  }

  $(".titlebar-close").click(function(){
    ipcRenderer.send('close-main-window');
  });

  $(".titlebar-minimize").click(function(){
    ipcRenderer.send('minimize-main-window');
  });

  $(".titlebar-fullscreen").click(function(){
    ipcRenderer.send('maximize-main-window');
  });

  $("<div class='spacer'></div>").insertAfter($(".titlebar-container"));
});
