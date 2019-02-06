var File = function (filename, theID, isSync, isDir, size, lastModified, creationTime, version) {
    this.index = 0;
    this.filename = filename;
    this.theID = theID;
    //0 - exists on local but not on server
    //1 - exists on local and server and has same version
    //2 - exists only on server 
    //3 - exists on local and server and has different version
    this.isSync = isSync;
    this.isDir = isDir;
    this.size = size;
    this.lastModified = lastModified;
    this.creationTime = creationTime;
    this.version = version;
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
File.prototype.getIndex = function () {
    return this.index;
};

File.prototype.getFileName = function () {
    return this.filename;
};

File.prototype.getTheID = function () {
    return this.theID;
};

File.prototype.getIsSync = function () {
    return this.isSync;
};

File.prototype.getIsDir = function () {
    return this.isDir;
};

File.prototype.getSize = function () {
    return this.size;
};

File.prototype.getLastModified = function () {
    return this.lastModified;
};

File.prototype.getCreationTime = function () {
    return this.creationTime;
};

File.prototype.getVersion = function () {
    return this.version;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
File.prototype.setIndex = function (index) {
    this.index = index;
};

File.prototype.setFileName = function (fileName) {
    this.fileName = fileName;
}

File.prototype.setTheID = function (theID) {
    this.theID = theID;
}

File.prototype.setIsSync = function (isSync) {
    this.isSync = isSync;
};

File.prototype.setIsDir = function (isDir) {
    this.isDir = isDir;
};

File.prototype.setSize = function (size) {
    this.size = size;
};

File.prototype.setLastModified = function (lastModified) {
    this.lastModified = lastModified;
};

File.prototype.setCreationTime = function (creationTime) {
    this.creationTime = creationTime;
};

File.prototype.setVersion = function (version) {
    this.version = version;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports = File;