var pkg = require('../package.json');
var moment = require('moment');
var packager = require('electron-packager');
var copyright = `Copyright ${moment().format('YYYY')} ${pkg.author}. All Rights Reserved.`;
var opts = {
  "arch": "all",
  "dir": "./",
  "platform": "win32,darwin",
  "app-copyright": copyright,
  "app-version": pkg.version,
  "asar": true,
  //"icon": {}, //TODO
  "ignore": ['^/release($|/)', '^/dev($|/)'],
  "name": "Bravify",
  "out": "./release",
  "overwrite": true,
  "version": "0.36.9"
};
packager(opts, function(err, appPath) {
  if(err) {console.error(err);} else {console.log(appPath);}
});
