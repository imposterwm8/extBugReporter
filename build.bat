@echo off
REM Build script for extension
echo Building extension...

REM Create build directory
if not exist build mkdir build

REM Copy extension files
echo Copying files...
copy manifest.json build\
copy *.js build\
copy *.html build\
copy *.css build\
xcopy /E /I images build\images

REM Create zip file using PowerShell
echo Creating zip...
powershell -Command "Compress-Archive -Path 'build\*' -DestinationPath 'extension.zip' -Force"

echo Extension built successfully as extension.zip
echo Contents:
powershell -Command "Get-ChildItem -Path 'build' -Recurse | Select-Object Name, Length"