const RPClient = require('reportportal-client');
const { testItemStatuses, logLevels } = require('./constants');
const { getFailedScreenshot, getPassedScreenshots } = require('./utils');

const { FAILED } = testItemStatuses;

const promiseErrorHandler = (promise, message = '') =>
  promise.catch((err) => {
    console.error(message, err);
  });
class Reporter {
  constructor(config) {
    this.client = new RPClient(config.reporterOptions);
    this.testItemIds = new Map();
    this.hooksForTest = new Map();
    this.hooks = new Map();
    this.config = config;
  }

  runStart(launch) {
    const { tempId, promise } = this.client.startLaunch(launch);
    promiseErrorHandler(promise, 'Fail to start launch');
    this.tempLaunchId = tempId;
  }

  runEnd() {
    const finishLaunchPromise = this.client.finishLaunch(this.tempLaunchId, {
      endTime: new Date().valueOf(),
    }).promise;
    return promiseErrorHandler(finishLaunchPromise, 'Fail to finish launch');
  }

  suiteStart(suite) {
    const parentId = suite.parentId && this.testItemIds.get(suite.parentId);
    const { tempId, promise } = this.client.startTestItem(suite, this.tempLaunchId, parentId);
    promiseErrorHandler(promise, 'Fail to start suite');
    this.testItemIds.set(suite.id, tempId);
  }

  suiteEnd(suite) {
    const suiteId = this.testItemIds.get(suite.id);
    const finishTestItemPromise = this.client.finishTestItem(suiteId, {}).promise;
    promiseErrorHandler(finishTestItemPromise, 'Fail to finish suite');
  }

  testStart(test) {
    const parentId = this.testItemIds.get(test.parentId);
    const { tempId, promise } = this.client.startTestItem(test, this.tempLaunchId, parentId);
    promiseErrorHandler(promise, 'Fail to start test');
    this.testItemIds.set(test.id, tempId);
  }

  sendLog(test, tempTestId, logTime) {
    const level = test.status === FAILED ? logLevels.ERROR : logLevels.INFO;

    if (test.status === FAILED) {
      const sendFailedLogPromise = this.client.sendLog(
        tempTestId,
        {
          message: test.error,
          level,
          time: logTime || new Date().valueOf(),
        },
        getFailedScreenshot(test.title),
      ).promise;
      promiseErrorHandler(sendFailedLogPromise, 'Fail to save error log');
    }
    const passedScreenshots = getPassedScreenshots(test.title);

    passedScreenshots.forEach((file) => {
      const sendPassedScreenshotsPromise = this.client.sendLog(
        tempTestId,
        {
          message: 'screenshot',
          level,
          time: logTime || new Date().valueOf(),
        },
        file,
      ).promise;
      promiseErrorHandler(sendPassedScreenshotsPromise, 'Fail to save passed log');
    });
  }

  testEnd(test) {
    let testId = this.testItemIds.get(test.id);
    if (!testId) {
      this.testStart({ ...test, startTime: new Date().valueOf() });
      testId = this.testItemIds.get(test.id);
    }
    this.sendLog(test, testId);
    const finishTestItemPromise = this.client.finishTestItem(testId, test).promise;
    promiseErrorHandler(finishTestItemPromise, 'Fail to finish test');
  }

  hookStart(hook) {
    this.hooks.set(hook.id, hook);
  }

  hookEnd(hook) {
    const startedHook = this.hooks.get(hook.id);
    if (!startedHook) return;
    const parentId = this.testItemIds.get(startedHook.parentId);
    const { tempId, promise } = this.client.startTestItem(startedHook, this.tempLaunchId, parentId);
    promiseErrorHandler(promise, 'Fail to start hook');
    this.sendLog(hook, tempId, startedHook.startTime);
    this.hooks.delete(hook.id);
    const finishHookPromise = this.client.finishTestItem(tempId, hook).promise;
    promiseErrorHandler(finishHookPromise, 'Fail to finish hook');
  }
}

module.exports = Reporter;
