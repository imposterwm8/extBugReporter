chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'openReportInNewTab') {
    const reportContent = request.report;
    const htmlContent = `
      <html>
        <head>
          <title>Bug Report</title>
          <style>
            body {
              background-color: #1e1e1e;
              color: #d4d4d4;
              font-family: Consolas, monaco, monospace;
              font-size: 14px;
              line-height: 1.5;
              margin: 2em;
            }
            pre {
              white-space: pre-wrap;
              word-wrap: break-word;
            }
          </style>
        </head>
        <body>
          <pre>${reportContent}</pre>
        </body>
      </html>
    `;
    const url = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
    chrome.tabs.create({ url: url });
  }
});