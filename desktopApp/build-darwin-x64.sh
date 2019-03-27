#!/usr/bin/env bash 

# Change the current working directory to this script's directory
cd "$(dirname "$0")"

# Package the app for macOS
electron-packager ./FileSynchroniser --overwrite --asar --platform=darwin --arch=x64 --icon=./Icons/icon.icns --prune=true --out=release-builds
