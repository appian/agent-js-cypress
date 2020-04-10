// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)
// const { startIPCServer } = require('./plugin/ipcServer');
const ipc = require('node-ipc');
const { logToRPTask } = require('./plugin/pluginTasks');

module.exports = (on) => {
  let clientSocket;
  ipc.config.id = 'reportportal';
  ipc.config.retry = 1500;

  ipc.serve(() => {
    ipc.server.on('connect', (socket) => {
      clientSocket = socket;
    });
    ipc.server.on('socket.disconnected', (socket, destroyedSocketID) => {
      ipc.log(`client ${destroyedSocketID} has disconnected!`);
      clientSocket = null;
    });
    ipc.server.on('destroy', () => {
      clientSocket = null;
      ipc.log('server destroyed');
    });
    process.on('exit', () => {
      ipc.server.stop();
    });
  });
  ipc.server.start();
  on('task', {
    logToRP(log) {
      if (clientSocket){
        ipc.server.emit(clientSocket, 'log', log);
      }
    },
  });
};
