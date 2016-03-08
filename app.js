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

// Load data from Riot APIs when we start the application.
const APIData = new (require("./API/APIData"))();
const BuildGenerator = new (require("./API/BuildGenerator"))(APIData);
const ItemSetGenerator = new (require('./API/ItemSetGenerator'))();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null;

var build = null;

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform != 'darwin') {
    app.quit();
  }
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
    title: 'Bravify'});

  // and load the index.html of the app.
  mainWindow.loadURL('file://' + __dirname + '/html/index.html');

  mainWindow.webContents.on('did-finish-load', function(){
    mainWindow.show();
    //begin loading API data.
    APIData.loadAll(function(index, length) {
      var percent = index/length;
      mainWindow.webContents.send('updateProgressBar', percent);
    }).then(function() {
      mainWindow.webContents.send('finishedLoading', true);
    }, function(error) {
      dialog.showErrorBox("Error!", error.toString()); //TODO: Handle errors better.
    }).catch(function(error) {
      dialog.showErrorBox("Caught Exception!", error.toString()); //TODO: Handle errors better.
    });
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
});

// Called when the client requests a new build to be generated
ipcMain.on('generateNewBuild', function() {
  BuildGenerator.generate(11).then(function(result) { //TODO: Get map value from UI. Currently hard-coded to Rift.
    build = result;
    mainWindow.webContents.send("buildGenerated", result);
  });
});

ipcMain.on('saveBuild', function() {
  if(build) {
    var set = ItemSetGenerator.generate(build);
    saveBuild(set);
    mainWindow.webContents.send("itemSetSaved", set);
  }
});

function saveBuild(itemSet) {
  if(!fs.existsSync(getLeaguePath())) {
    fs.mkdirSync(getLeaguePath());
  }
  jsonfile.writeFile(path.join(getLeaguePath(), "BravifyItemSet.json"), itemSet, function(err) {
    if(err)
      console.error(err);
  });
}

function getLeaguePath() {
  var home = process.env.HOME || process.env.USERPROFILE;

  if(process.platform == 'darwin') {
    if(fs.existsSync('/Applications/League of Legends.app')) {
      return '/Applications/League of Legends.app/Contents/LoL/Config/Global/Recommended/';
    } else if (fs.existsSync(path.join(home, '/Applications/League of Legends.app'))) {
      return path.join(home, '/Applications/League of Legends.app/Contents/LoL/Config/Global/Recommended/');
    } else {
      //ask user for location.
    }
  } else {
    if(fs.existsSync("C:/Riot Games/League of Legends/lol.launcher.exe")) {
      return "C:/Riot Games/League of Legends/Config/Global/Recommended/";
    } else {
      //ask user for location.
    }
  }
}

function savePreferences(prefs) {

}

function loadPreferences() {

}

function getPrefDir() {
  var dir = "";
  if(process.platform == "darwin") {
    dir = path.join(process.env.HOME, 'Library/Application Support/Bravify');
  } else {
    dir = path.join(process.env.APPDATA, "Bravify");
  }

  return dir;
}

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
  (mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize());
});
