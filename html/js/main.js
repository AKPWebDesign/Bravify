$('button.go').click(function(){
  ipcRenderer.send('generateNewBuild');
});

ipcRenderer.on('buildGenerated', function(event, message) {
  console.log(message);
});
