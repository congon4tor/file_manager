#!/usr/bin/env bash 

# Change the current working directory to this script's directory
cd "$(dirname "$0")"

# Package the app for Windows
electron-packager ./FileSynchroniser --overwrite --asar --platform=win32 --arch=ia32 --icon=./Icons/icon.ico --prune=true --out=release-builds
