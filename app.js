'use strict';

//make the errors pretty.
var PrettyError = require('pretty-error');
var pe = new PrettyError();
pe.start();
pe.skipNodeFiles();
pe.withoutColors();

const electron = require('electron');
const dialog = require('electron').dialog;
const app = electron.app;  // Module to control application life.
const BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.
const ipcMain = require('electron').ipcMain; // ipc main reference.
const path = require('path'); // path tools
const fs = require('fs'); // filesystem tools
const jsonfile = require('jsonfile'); //tools for saving JSON to files.
const mkdirp = require('mkdirp'); //recursive mkdir
const homedir = require('homedir'); //home directory finder
var Promise = require('bluebird'); // jshint ignore:line

var APIData, BuildGenerator, ItemSetGenerator;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null;
var champSelectWindow = null;

//create window, then run autoupdater, then start application.
new Promise(function(resolve){
  // Quit when all windows are closed.
  app.on('window-all-closed', function() {
    app.quit();
  });

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  app.on('ready', function() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
      width: 1050,
      height: 600,
      'min-width': 1050,
      'min-height': 600,
      fullscreen: false,
      center: true,
      resizable: true,
      show: false,
      frame: false,
      transparent: true,
      icon: __dirname + '/resources/icon.png',
      title: 'Bravify'});

    // and load the index.html of the app.
    mainWindow.loadURL('file://' + __dirname + '/html/index.html');

    mainWindow.webContents.on('did-finish-load', function(){
      mainWindow.show();
      resolve(true);
    });

    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
      app.quit();
    });
  });
}).then(require('./API/Autoupdate')(mainWindow)).then(function() {
  // Load data from Riot APIs when we start the application.
  APIData = new (require('./API/APIData'))(getPrefDir());
  BuildGenerator = new (require('./API/BuildGenerator'))(APIData);
  ItemSetGenerator = new (require('./API/ItemSetGenerator'))();

  //load API data to window.
  loadData(mainWindow);

  // Called when the client requests a new build to be generated
  ipcMain.on('generateNewBuild', function(event, message) {
    BuildGenerator.generate(message).then(function(result) {
      mainWindow.webContents.send('buildGenerated', result);
    });
  });

  ipcMain.on('saveBuild', function(event, message) {
    if(message.build) {
      var set = ItemSetGenerator.generate(message.build);
      saveBuild(set);
      mainWindow.webContents.send('itemSetSaved', set);
    }
  });

  ipcMain.on('deleteBuild', function() {
    deleteBuild();
  });

  ipcMain.on('changeLeaguePath', function() {
    getLeaguePath(false);
  });

  // The methods below will be called upon receiving various messages from our
  // rendering thread. These are used to do things in the app when the user clicks
  // on things in the interface.
  ipcMain.on('close-main-window', function() {
    app.quit();
  });

  ipcMain.on('minimize-main-window', function() {
    mainWindow.minimize();
  });

  ipcMain.on('maximize-main-window', function() {
    (mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()); // jshint ignore:line
  });

  ipcMain.on('openChampSelect', function() {
    champSelectWindow = openWindow(champSelectWindow);
  });

  ipcMain.on('retrieveChamps', function() {
    if(!champSelectWindow) {return;}
    champSelectWindow.webContents.send('champions', {champs: APIData.champs, versions: APIData.versionData, groups: require('./API/groups.json'), selected: APIData.champKeys});
  });

  ipcMain.on('newChampSelection', function(event, champs) {
    if(!champs) {return;}
    APIData.champKeys = champs;
    mainWindow.webContents.send('champsChanged');
  });

  ipcMain.on('closeChampsWindow', function() {
    if(!champSelectWindow) {return;}
    champSelectWindow.close();
  });

  ipcMain.on('reloadData', function() {
    loadData(mainWindow);
  });

  ipcMain.on('openURL', function(event, message) {
    var open = require('open');
    if(message) {
      open(message);
    }
  });
}, function(err) {
  dialog.showErrorBox('Bravify Error!', 'An error has occurred:\n' + err);
  process.exit(1);
});

function deleteBuild() {
  var dir = getLeaguePath(true);
  if(!dir) {return;}

  if(!fs.existsSync(dir)) {
    return;
  }

  fs.unlinkSync(path.join(dir, 'BravifyItemSet.json'));
}

function saveBuild(itemSet) {
  var dir = getLeaguePath(true);
  if(!dir) {return;}

  if(!fs.existsSync(dir)) {
    mkdirp.sync(dir);
  }
  jsonfile.writeFile(path.join(dir, 'BravifyItemSet.json'), itemSet, function(err) {
    if(err) {
      console.error(err);
    }
  });
}

function getLeaguePath(usePrefs) {
  var home = process.env.HOME || process.env.USERPROFILE;
  var dir, response, done = false;
  var prefs = loadPreferences();

  if(usePrefs && prefs.leaguePath) {
    return prefs.leaguePath;
  }

  if(process.platform === 'darwin') {
    if(usePrefs && fs.existsSync('/Applications/League of Legends.app')) {
      return '/Applications/League of Legends.app/Contents/LoL/Config/Global/Recommended/';
    } else if (fs.existsSync(path.join(home, '/Applications/League of Legends.app'))) {
      return path.join(home, '/Applications/League of Legends.app/Contents/LoL/Config/Global/Recommended/');
    } else {
      while(!done) {
        dir = getDirectory();
        //check if user cancelled dialog.
        if(!dir) {return null;} else {dir = dir[0];}

        if(!dir.endsWith('League of Legends.app')) {
          if(fs.existsSync(path.join(dir, 'League of Legends.app'))) {
            dir = path.join(dir, 'League of Legends.app', 'Config/Global/Recommended');
          } else {
            response = dialog.showMessageBox({
              type: 'question',
              buttons:['Yes', 'No'],
              defaultId: 1,
              title: 'Are you sure this is the League of Legends directory?',
              message: 'Click yes if you\'re absolutely sure this is where League of Legends is located.'
            });

            //confusing, but 0 is Yes.
            if(!response) {
              dir = path.join(dir, 'Config/Global/Recommended');
            } else {
              dir = null;
            }
          }
        } else {
          dir = path.join(dir, 'Config/Global/Recommended');
        }

        //if we have a directory, end the loop.
        if(dir) {done = true;}
      }

      prefs.leaguePath = dir;
      savePreferences(prefs);
      return prefs.leaguePath;
    }
  } else {
    if(usePrefs && fs.existsSync('C:/Riot Games/League of Legends/lol.launcher.exe')) {
      return 'C:/Riot Games/League of Legends/Config/Global/Recommended/';
    } else {
      while(!done) {
        dir = getDirectory();
        //check if user cancelled dialog.
        if(!dir) {return null;} else {dir = dir[0];}

        if(fs.existsSync(path.join(dir, 'lol.launcher.exe'))) {
          dir = path.join(dir, 'Config/Global/Recommended/');
        } else {
          response = dialog.showMessageBox({
            type: 'question',
            buttons:['Yes', 'No'],
            defaultId: 1,
            title: 'Are you sure this is the League of Legends directory?',
            message: 'Click yes if you\'re absolutely sure this is where League of Legends is located.'
          });

          //confusing, but 0 is Yes.
          if(!response) {
            dir = path.join(dir, 'Config/Global/Recommended');
          } else {
            dir = null;
          }
        }

        if(dir) {done = true;}
      }

      prefs.leaguePath = dir;
      savePreferences(prefs);
      return prefs.leaguePath;
    }
  }
}

function getDirectory() {
  var titleString = 'Find League of Legends directory';
  if(process.platform === 'darwin') {titleString = 'Find League of Legends.app';}
  return dialog.showOpenDialog({title: titleString, properties: ['openFile', 'openDirectory']});
}

function savePreferences(prefs) {
  if(!prefs) {prefs = {};}
  jsonfile.writeFile(path.join(getPrefDir(), 'prefs.json'), prefs, function(err) {
    if(err) {
      console.error(err);
    }
  });
}

function loadPreferences() {
  //if no prefs file, return empty object.
  if(!fs.existsSync(path.join(getPrefDir(), 'prefs.json'))){ return {}; }
  try {
    return jsonfile.readFileSync(path.join(getPrefDir(), 'prefs.json'));
  } catch(e) {
    return {};
  }

}

function getPrefDir() {
  var dir = '';
  switch(process.platform) {
    case 'darwin':
      dir = path.join(process.env.HOME, 'Library/Application Support/Bravify');
      break;
    case 'win32':
      dir = path.join(process.env.APPDATA, 'Bravify');
      break;
    default:
      dir = path.join(homedir(), '.bravify');
      break;
  }

  return dir;
}

function openWindow(window) {
  if(!window) {
    window = new BrowserWindow({
      width: 557,
      height: 647,
      fullscreen: false,
      center: true,
      resizable: false,
      show: false,
      frame: false,
      transparent: true,
      icon: __dirname + '/resources/icon.png',
      title: 'Bravify Champ Select'});

    window.loadURL('file://' + __dirname + '/html/champions.html');

    window.webContents.on('did-finish-load', function(){
      window.show();
    });

    window.on('closed', function(){
      window = null;
    });
  } else {
      window.close();
  }

  return window;
}

function loadData(window) {
  window.webContents.send('startDataLoad');
  APIData.loadAll(function(index, length) {
    var percent = index/length;
    window.webContents.send('updateProgressBar', percent);
  }).then(function() {
    window.webContents.send('finishedLoading', true);
  }, function(error) {
    if(error === 'offline') {
      window.webContents.send('offline');
    } else {
      console.log('Error: ' + error); //TODO: Handle errors better.
    }
  }).catch(function(error) {
    console.log('Exception: ' + error); //TODO: Handle errors better.
  });
}
