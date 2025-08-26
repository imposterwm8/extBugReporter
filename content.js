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

  let report = '\n## Bug Report\n\n**URL:** ' + url + '\n\n';

  if (consoleLogs.length > 0) {
    report += '### Console Logs\n';
    report += '```json\n';
    consoleLogs.forEach(log => {
      report += '[' + log.method.toUpperCase() + '] ' + log.args.join(' ') + '\n';
    });
    report += '```\n\n';
  } else {
    report += '### Console Logs\n';
    report += '```\n';
    report += 'No console logs found.\n';
    report += '```\n\n';
  }

  if (domErrors.length > 0) {
    report += '### DOM Errors\n';
    report += '```\n';
    domErrors.forEach(error => {
      report += error + '\n';
    });
    report += '```\n\n';
  } else {
    report += '### DOM Errors\n';
    report += '```\n';
    report += 'No DOM errors found.\n';
    report += '```\n\n';
  }

  return report;
}

createBugReport().then(report => {
  chrome.runtime.sendMessage({ type: 'openReportInNewTab', report: report });
});
