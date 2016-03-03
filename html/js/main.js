$('button.go').click(function(){
  ipcRenderer.send('generateNewBuild');
});

ipcRenderer.on('buildGenerated', function(event, message) {
  console.log(message);
  var baseImageURL = message.versions.cdn + "/" + message.versions.v + "/img/";
  $('.champ-icon').attr("src", baseImageURL + 'champion/' + message.champ.image.full);
  $('.start-frame').fadeOut(1000);
  $('.champ-frame').fadeIn(1000);
});
