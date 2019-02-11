package com.example.filesynchronizer;

public class FileStatus {
    public String name;
    public int status;

    FileStatus(String name, int status){
        this.name=name;
        this.status=status;

    }


    @Override
    public String toString() {
        return name + "  " + status;
    }
}
