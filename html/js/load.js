ipcRenderer.on('updateProgressBar', function(event, message) {
  $('progress.progress').val(message);
});

ipcRenderer.on('finishedLoading', function(event, message) {
  ipcRenderer.send('generateNewBuild', {map: 11, mode: "CLASSIC"}); //defaulting to Rift. User can change later.
  if(message == true) {
    setTimeout(function(){
      $('.loading-frame').fadeOut(250);
      $('.champ-frame').fadeIn(250);
    }, 300);
  }
});

ipcRenderer.on('offline', function() {
  $('.loading-frame').fadeOut(250);
  $('.offline-frame').fadeIn(250);
});
