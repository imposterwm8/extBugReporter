async function getConsoleLogs() {
  return new Promise((resolve) => {
    const logs = [];
    const originalConsole = {};
    const methods = ['log', 'warn', 'error', 'info', 'debug'];

    methods.forEach(method => {
      originalConsole[method] = console[method];
      console[method] = (...args) => {
        logs.push({ method, args: args.map(arg => JSON.stringify(arg, null, 2)) });
        originalConsole[method](...args);
      };
    });
    resolve(logs);
  });
}

function getDomErrors() {
    const errors = [];
    document.querySelectorAll('body').forEach(element => {
        const text = element.innerText.toLowerCase();
        if (text.includes('error') || text.includes('failed') || text.includes('exception')) {
            errors.push(element.innerText);
        }
    });
    return errors;
}


async function createBugReport() {
  const url = window.location.href;
  const consoleLogs = await getConsoleLogs();
  const domErrors = getDomErrors();

  let report = 'Bug Report\n\n';
  report += 'URL: ' + url + '\n\n';

  report += 'Console Logs:\n';
  if (consoleLogs.length > 0) {
    consoleLogs.forEach(log => {
      report += '[' + log.method.toUpperCase() + '] ' + log.args.join(' ') + '\n';
    });
  } else {
    report += 'No console logs found.\n';
  }
  report += '\n';

  report += 'DOM Errors:\n';
  if (domErrors.length > 0) {
    domErrors.forEach(error => {
      report += error + '\n';
    });
  } else {
    report += 'No DOM errors found.\n';
  }

  return report;
}

createBugReport().then(report => {
  chrome.runtime.sendMessage({ type: 'bugReportData', report: report });
});
