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
const uuid = require('uuid'); //uuid generator
const ua = require('universal-analytics'); //google analytics
var Promise = require('bluebird'); // jshint ignore:line

var APIData, BuildGenerator, ItemSetGenerator;

//set up analytics
GLOBAL.analytics = ua(require('./package.json')['analytics-tracking-id'], getAnalyticsID(), { //analytics is global, so I can access it from anywhere in the app.
  https: true,
  av: require('./package.json').version, // app version
  an: 'Bravify' // app name
});
var analytics = GLOBAL.analytics;
var startTime = new Date().getTime(); // the current time, for timing tracking purposes.
analytics.pageview({
  dp: '/', // page path
  dt: 'Bravify v'+require('./package.json').version, // page title
  dh: 'http://bravify.akpwebdesign.com/', // hostname
  av: require('./package.json').version, // app version
  an: 'Bravify', // app name
  cd: process.platform // screen name. Since we don't have multiple screens, I'm using this for OS tracking.
});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null;
var champSelectWindow = null;

//create window, then run autoupdater, then start application.
new Promise(function(resolve){
  // Quit when all windows are closed.
  app.on('window-all-closed', function() {
    setTimeout(function(){
      app.quit();
    }, 1000); //allow time for last Analytics event to send.
  });

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  app.on('ready', function() {
    var w = 1050;
    var h = 600;
    var loc = getNewWindowLocation(null, w, h);
    // Create the browser window.
    mainWindow = new BrowserWindow({
      width: w,
      height: h,
      'min-width': w,
      'min-height': h,
      fullscreen: false,
      x: loc.x,
      y: loc.y,
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
      mainWindow.webContents.send('analytics-id', getAnalyticsID());
      var time = new Date().getTime() - startTime;
      analytics.timing('App Timing', 'Time to open main window', time).send();
      resolve(mainWindow);
    });
  });
}).then(function(window) {
  return require('./API/Autoupdate')(window);
}).then(function(updated) {
  if(updated) {analytics.event('Updates', 'App Updating').send();return;} // Do this to stop the main load from happening if we're updating.
  var time = new Date().getTime() - startTime;
  analytics.timing('App Timing', 'Time to finish autoupdate check', time).send();
  // Load data from Riot APIs when we start the application.
  APIData = new (require('./API/APIData'))(getPrefDir());
  BuildGenerator = new (require('./API/BuildGenerator'))(APIData);
  ItemSetGenerator = new (require('./API/ItemSetGenerator'))();

  //load API data to window.
  loadData(mainWindow);

}, function(err) {
  analytics.exception('Fatal Error: ' + err.message, true).send();
  dialog.showErrorBox('Bravify Error!', 'An error has occurred:\n' + err);
  setTimeout(function(){
    process.exit(1);
  }, 1000); //allow time for last Analytics event to send.
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
      analytics.exception('Error Saving Build File: ' + err.message).send();
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

function getAnalyticsID() {
  var prefs = loadPreferences();
  var id = prefs['analytics-id'];
  if(id) {
    prefs['analytics-id'] = uuid.v4();
    savePreferences(prefs);
  }

  return prefs['analytics-id'];
}

function openChampSelect() {
  if(!champSelectWindow) {
    var w = 557;
    var h = 647;
    var loc = getNewWindowLocation(mainWindow, w, h);
    champSelectWindow = new BrowserWindow({
      width: w,
      height: h,
      fullscreen: false,
      x: loc.x,
      y: loc.y,
      resizable: false,
      show: false,
      frame: false,
      transparent: true,
      icon: __dirname + '/resources/icon.png',
      title: 'Bravify Champ Select'});

    champSelectWindow.loadURL('file://' + __dirname + '/html/champions.html');

    champSelectWindow.webContents.on('did-finish-load', function(){
      champSelectWindow.show();
    });

    champSelectWindow.on('closed', function(){
      champSelectWindow = null;
    });
  } else {
      champSelectWindow.close();
  }
}

function loadData(window, loadTime) {
  var start = loadTime || startTime;
  window.webContents.send('startDataLoad');
  APIData.loadAll(function(index, length) {
    var percent = index/length;
    window.webContents.send('updateProgressBar', percent);
  }).then(function() {
    window.webContents.send('finishedLoading', true);
    var time = new Date().getTime() - start;
    analytics.timing('App Timing', 'Time to finish loading data', time).send();
  }, function(error) {
    if(error === 'offline') {
      window.webContents.send('offline');
      analytics.event('Network Error', 'Offline').send(); // Not exactly sure how this would ever work, but... we'll see.
    } else {
      analytics.exception('Error: ' + error.message).send();
      console.log('Error: ' + error); //TODO: Handle errors better.
    }
  }).catch(function(error) {
    analytics.exception('Exception: ' + error.message).send();
    console.log('Exception: ' + error); //TODO: Handle errors better.
  });
}

function getNewWindowLocation(window, width, height) {
  var point;
  var screen = electron.screen;
  if(!window) {
    point = screen.getCursorScreenPoint();
  } else {
    point = {x:window.getPosition()[0], y:window.getPosition()[1]}; //this is stupid.
  }

  var display = screen.getDisplayNearestPoint(point);

  var x = Math.round(display.workArea.x + display.workArea.width/2 - width/2);
  var y = Math.round(display.workArea.y + display.workArea.height/2 - height/2);

  return {x: x, y: y};
}

// The methods below will be called upon receiving various messages from our
// rendering thread. These are used to do things in the app when the user clicks
// on things in the interface.
ipcMain.on('close-main-window', function() {
  analytics.event('Window Actions', 'Main Window Closed').send();
  //hide window immediately.
  mainWindow.hide();
  setTimeout(function(){
    app.quit();
  }, 1000); //allow time for last Analytics event to send.
});

ipcMain.on('minimize-main-window', function() {
  analytics.event('Window Actions', 'Main Window Minimized').send();
  mainWindow.minimize();
});

ipcMain.on('maximize-main-window', function() {
  analytics.event('Window Actions', 'Main Window Maximized').send();
  (mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()); // jshint ignore:line
});

ipcMain.on('openChampSelect', function() {
  if(champSelectWindow){analytics.event('Window Actions', 'Champ Select Closed').send();champSelectWindow.close();return;}
  analytics.event('Window Actions', 'Champ Select Opened').send();
  openChampSelect();
});

ipcMain.on('retrieveChamps', function() {
  if(!champSelectWindow) {return;}
  analytics.event('App Actions', 'Champ Select Data Requested').send();
  champSelectWindow.webContents.send('champions', {champs: APIData.champs, versions: APIData.versionData, groups: require('./API/groups.json'), selected: APIData.champKeys});
});

ipcMain.on('newChampSelection', function(event, champs) {
  if(!champs) {return;}
  analytics.event('App Actions', 'New Champ Selection Received').send();
  APIData.champKeys = champs;
  mainWindow.webContents.send('champsChanged');
});

ipcMain.on('closeChampsWindow', function() {
  if(!champSelectWindow) {return;}
  analytics.event('Window Actions', 'Champ Select Closed').send();
  champSelectWindow.close();
});

ipcMain.on('reloadData', function() {
  analytics.event('App Actions', 'Data Reload Requested').send();
  loadData(mainWindow, new Date().getTime());
});

ipcMain.on('openURL', function(event, message) {
  var open = require('open');
  if(message) {
    analytics.event('App Actions', 'URL Opened', message).send();
    open(message);
  }
});

// Called when the client requests a new build to be generated
ipcMain.on('generateNewBuild', function(event, message) {
  BuildGenerator.generate(message).then(function(result) {
    mainWindow.webContents.send('buildGenerated', result);
    analytics.event('Build Actions', 'Build Generated').send();
  });
});

ipcMain.on('saveBuild', function(event, message) {
  if(message.build) {
    var set = ItemSetGenerator.generate(message.build);
    saveBuild(set);
    mainWindow.webContents.send('itemSetSaved', set);
    analytics.event('Build Actions', 'Build Saved').send();
  }
});

ipcMain.on('deleteBuild', function() {
  deleteBuild();
  analytics.event('Build Actions', 'Build Saved').send();
});

ipcMain.on('changeLeaguePath', function() {
  getLeaguePath(false);
  analytics.event('Build Actions', 'League Path Changed').send();
});
