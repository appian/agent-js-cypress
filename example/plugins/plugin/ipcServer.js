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
const ipc = require('node-ipc');

const startIPCServer = (onServerStart) => {
  ipc.config.id = 'reportportal';
  ipc.config.retry = 1500;

  ipc.serve(() => {
    ipc.server.on('socket.disconnected', (socket, destroyedSocketID) => {
      ipc.log(`client ${destroyedSocketID} has disconnected!`);
    });
    ipc.server.on('destroy', () => {
      ipc.log('server destroyed');
    });
    onServerStart(ipc.server);
    process.on('exit', () => {
      ipc.server.stop();
    });
  });
  ipc.server.start();
  return ipc.server;
};

module.exports = { startIPCServer };
