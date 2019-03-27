#!/usr/bin/env bash 

# Change the current working directory to this script's directory
cd "$(dirname "$0")"

# Package the app for Linux
electron-packager ./FileSynchroniser --overwrite --asar --platform=linux --arch=x64 --icon=./Icons/icon.png --prune=true --out=release-builds
