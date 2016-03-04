$('button.go').click(function(){
  ipcRenderer.send('generateNewBuild');
});

ipcRenderer.on('buildGenerated', function(event, message) {
  console.log(message);
  var champ = message.champ;
  var baseImageURL = message.versions.cdn + "/" + message.versions.v + "/img/";
  var artImageURL = message.versions.cdn + "/img/champion/";
  $('.champ-icon').css("background-image", buildBackgroundImageURL(baseImageURL + 'champion/' + champ.image.full));
  $('.app-container').css("background-image", buildBackgroundImageURL(artImageURL + 'splash/' + champ.key + "_0.jpg"));

  $('.app-container').imagesLoaded(function() {
    $('.start-frame').fadeOut(500);
    $('.champ-frame').fadeIn(1000);
  });
});

function buildBackgroundImageURL(url) {
  return "url(" + url + ")";
}
