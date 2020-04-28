const Mocha = require('mocha');
const ReportPortalReporter = require('./reporter');
const { reporterEvents } = require('./constants');

const {
  EVENT_RUN_BEGIN,
  EVENT_RUN_END,
  EVENT_TEST_BEGIN,
  EVENT_TEST_END,
  EVENT_SUITE_BEGIN,
  EVENT_SUITE_END,
  EVENT_HOOK_BEGIN,
  EVENT_HOOK_END,
} = Mocha.Runner.constants;

const interval = setInterval(() => {}, 1000);
let reporter;
process.on('message', (message) => {
  const { event } = message;
  switch (event) {
    case reporterEvents.INIT:
      reporter = new ReportPortalReporter(message.config);
      break;
    case EVENT_RUN_BEGIN:
      reporter.runStart(message.launch);
      break;
    case EVENT_RUN_END:
      reporter
        .runEnd()
        .then(() => {
          interval && clearInterval(interval);
          process.exit(0);
        })
        .catch((err) => {
          console.error(err);
          interval && clearInterval(interval);
          process.exit(1);
        });
      break;
    case EVENT_SUITE_BEGIN:
      reporter.suiteStart(message.suite);
      break;
    case EVENT_SUITE_END:
      reporter.suiteEnd(message.suite);
      break;
    case EVENT_TEST_BEGIN:
      reporter.testStart(message.test);
      break;
    case EVENT_TEST_END:
      reporter.testEnd(message.test);
      break;
    case EVENT_HOOK_BEGIN:
      reporter.hookStart(message.hook);
      break;
    case EVENT_HOOK_END:
      reporter.hookEnd(message.hook);
      break;
    case reporterEvents.LOG:
      reporter.sendLogToCurrentItem(message.log);
      break;
    case reporterEvents.LAUNCH_LOG:
      reporter.sendLaunchLog(message.log);
      break;
    case reporterEvents.ADD_ATTRIBUTES:
      reporter.addAttributes(message.attributes);
      break;
    default:
      break;
  }
});
