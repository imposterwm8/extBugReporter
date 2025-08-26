@echo off
echo Building AI-Enhanced Bug Reporter Extension (Simplified)...

REM Check if transformers bundle exists
if not exist lib\transformers.min.js (
    echo Error: lib/transformers.min.js not found!
    echo Please ensure the Transformers.js bundle has been downloaded.
    pause
    exit /b 1
)

echo ✅ Transformers.js bundle found
echo ✅ Extension ready to load!
echo Note: First AI analysis may take 30-60 seconds to download models.
pause