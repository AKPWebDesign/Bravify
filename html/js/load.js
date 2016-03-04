ipcRenderer.on('updateProgressBar', function(event, message) {
  $('progress.progress').val(message);
});

ipcRenderer.on('finishedLoading', function(event, message) {
  ipcRenderer.send('generateNewBuild');
  if(message == true) {
    setTimeout(function(){
      $('.loading-frame').fadeOut(1000);
      $('.champ-frame').fadeIn(1000);
    }, 1250);
  }
});
