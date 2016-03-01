'use strict';

const electron = require('electron');
const dialog = require('electron').dialog;
const app = electron.app;  // Module to control application life.
const BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.
const ipcMain = require('electron').ipcMain; // ipc main reference.
const api_key = require('./config.json').RIOT_API_KEY;

// Load data from Riot APIs when we start the application.
const APIData = new (require("./API/APIData"))(api_key);

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null;

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
    fullscreen: false,
    center: true,
    //resizable: false, //TODO: consider if we should disable resizing or not.
    show: false,
    frame: false,
    title: 'Bravify'});

  // and load the index.html of the app.
  mainWindow.loadURL('file://' + __dirname + '/html/index.html');

  // Open the DevTools.
  //mainWindow.webContents.openDevTools(); //or not.

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
