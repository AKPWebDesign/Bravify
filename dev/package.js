var PrettyError = require('pretty-error');
var pe = new PrettyError();
pe.start();
pe.withoutColors();
var pkg = require('../package.json');
var path = require('path');
var rcedit = require('rcedit');
var moment = require('moment');
var packager = require('electron-packager');
var spawn = require('child_process').spawn;
var glob = require('glob');

var copyright = `Copyright ${moment().format('YYYY')} ${pkg.author}. All Rights Reserved.`;
var opts = {
  'arch': 'all',
  'dir': './',
  'platform': 'all',
  'app-copyright': copyright,
  'app-version': pkg.version,
  'asar': true,
  'icon': './resources/icon',
  'ignore': ['^/release($|/)', '^/dev($|/)'],
  'name': 'Bravify',
  'out': './release',
  'overwrite': true,
  'version': '1.4.6'
};

packager(opts, function(err, appPath) {
  if(err) {console.error(err);}
  else {
    console.log('Finished packaging all platforms.');
    doRcEdit(appPath);
  }
});

function zip(appPath) {
  if(!appPath) {return;}
  if(!Array.isArray(appPath)){appPath = [appPath]; console.log(`converting appPath to array. ${appPath}`);}
  try {
    for (var i = 0; i < appPath.length; i++) {
      var dest = path.resolve(appPath[i] + '.zip');
      var src = path.resolve(appPath[i]);
      var sevenZip = '7z';
      if(process.platform === 'win32') { sevenZip = 'C:/Program Files/7-Zip/7z.exe'; }
      console.log('zipping '+src);
      var current_process = spawn(sevenZip, ['a', '-tzip', dest, src]);
      var wasError = false;

      current_process.stdout.on('data', function(msg){ // jshint ignore:line
        console.log(msg.toString());
      });

      current_process.stderr.on('data', function(msg){ // jshint ignore:line
        console.error(msg.toString());
        wasError = true;
      });
    }
  } catch(e) {console.error(e);} //TODO: actually do something here? idk... maybe not.
}

function doRcEdit(appPath) {
  new Promise(function(resolve, reject) {
    var rcOpts = {
      'version-string': {
        'ProductName': 'Bravify',
        'FileDescription': 'Bravify',
        'CompanyName': 'AKPWebDesign',
        'LegalCopyright': copyright,
      },
      'file-version': pkg.version,
      'product-version': pkg.version,
      'icon': './resources/icon.ico'
    };

    var numFinished = 0;
    glob(`**/Bravify.exe`, null, function (er, files) { // jshint ignore:line
      for (var j = 0; j < files.length; j++) {
        var file = files[j];
        console.log('rcediting '+file);
        rcedit(files[j], rcOpts, function(err){ // jshint ignore:line
          if(err){console.log(err);reject();return;}
          else {
            console.log('rcedit finished on ' + file);
            numFinished++;
            if(numFinished === files.length) {
              resolve();
            }
          }
        });
      }
    });
  }).then(function() {
    zip(appPath);
  });
}
