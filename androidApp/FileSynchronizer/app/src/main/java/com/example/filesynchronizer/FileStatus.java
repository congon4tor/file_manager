package com.example.filesynchronizer;

public class FileStatus {

    public static final int LOCAL = 1;     //code if file is local
    public static final int ONLINE = 2;    //code if file is online
    public static final int BOTH = 3;      //code if file is on both


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
