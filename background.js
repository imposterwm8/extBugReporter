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
            textarea {
              width: 100%;
              height: 80vh;
              background-color: #2d2d30;
              color: #d4d4d4;
              border: 1px solid #3c3c3c;
              padding: 1em;
              font-family: inherit;
              font-size: inherit;
              line-height: inherit;
              resize: vertical;
              box-sizing: border-box;
            }
            textarea:focus {
              outline: 1px solid #007acc;
              border-color: #007acc;
            }
          </style>
        </head>
        <body>
          <textarea>${reportContent}</textarea>
        </body>
      </html>
    `;
    const url = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
    chrome.tabs.create({ url: url });
  }
});