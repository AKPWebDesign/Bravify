var pkg = require('../package.json');
var path = require('path');
var rcedit = require('rcedit');
var moment = require('moment');
var packager = require('electron-packager');
var spawn = require('child_process').spawn
var copyright = `Copyright ${moment().format('YYYY')} ${pkg.author}. All Rights Reserved.`;
var opts = {
  "arch": "all",
  "dir": "./",
  "platform": "win32",
  "app-copyright": copyright,
  "app-version": pkg.version,
  "asar": true,
  "icon": "./resources/icon",
  "ignore": ['^/release($|/)', '^/dev($|/)'],
  "name": "Bravify",
  "out": "./release",
  "overwrite": true,
  "version": "0.36.9"
};

if(process.platform == "win32") {
  packager(opts, function(err, appPath) {
    if(err) {console.error(err);}
    else {
      console.log(appPath);
      doDarwinBuild();
      doRcEdit(appPath);
      zip(appPath);
    }
  });
} else {
  doDarwinBuild();
}

function doDarwinBuild() {
  opts.platform = "darwin";
  packager(opts, function(err, appPath) {
    if(err) {console.error(err);}
    else {
      console.log(appPath);
      zip(appPath);
    }
  });
}

function zip(appPath) {
  try {
    for (var i = 0; i < appPath.length; i++) {
      var dest = path.resolve(appPath[i] + ".zip");
      var src = path.resolve(appPath[i]);
      var sevenZip = "7z";
      if(process.platform == "win32") { sevenZip = "C:/Program Files/7-Zip/7z.exe"; }
      var current_process = spawn(sevenZip, ['a', '-tzip', dest, src], {cwd: './tmp'});
      var wasError = false;

      current_process.stdout.on('data', function(msg){
        console.log(msg.toString());
      });

      current_process.stderr.on('data', function(msg){
        console.error(msg.toString());
        wasError = true;
      });
    }
  } catch(e) {} //TODO: actually do something here? idk... maybe not.
}

function doRcEdit(appPath) {
  var rcOpts = {
    "version-string": {
      "ProductName": "Bravify",
      "FileDescription": "Bravify",
      "CompanyName": "AKPWebDesign",
      "LegalCopyright": copyright,
    },
    "file-version": pkg.version,
    "product-version": pkg.version,
    "icon": "./resources/icon.ico"
  }
  for (var i = 0; i < appPath.length; i++) {
    var pathStr = path.join(appPath[i], "Bravify.exe");
    rcedit(pathStr, rcOpts, function(err){
      if(err){console.log(err);} else {console.log("rcedit finished on " + pathStr);}
    });
  }
}
