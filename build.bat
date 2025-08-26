@echo off
echo Building AI-Enhanced Bug Reporter Extension...

REM Install dependencies if needed
if not exist node_modules (
    echo Installing dependencies...
    npm install
)

REM Build the AI content script with webpack
echo Building AI content script...
npx webpack --mode=production

REM Copy the built file to the expected location
if not exist dist\content.js (
    echo Error: Build failed - dist/content.js not found
    echo Falling back to original content script...
    copy content.js dist\content.js
)

echo Build complete! Extension ready to load.
echo Note: First AI analysis may take 30-60 seconds to download models.
pause