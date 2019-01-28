package com.example.filesynchronizer;

import android.content.pm.PackageManager;
import android.support.v4.app.ActivityCompat;
import android.support.v4.content.ContextCompat;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.ListView;
import java.util.ArrayList;
import android.widget.*;
import java.io.File;
import android.os.Environment;
import android.util.Log;
import android.Manifest;



public class MainActivity extends AppCompatActivity {

    ListView fileList;
    ArrayList<String> fileNames;


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        String[] permissions={Manifest.permission.READ_EXTERNAL_STORAGE,Manifest.permission.WRITE_EXTERNAL_STORAGE};

        if (ContextCompat.checkSelfPermission(this.getApplicationContext(),permissions[0]) == PackageManager.PERMISSION_GRANTED &&   //check weather the app has permissions to read/write on the phone storage
                ContextCompat.checkSelfPermission(this.getApplicationContext(),permissions[1]) == PackageManager.PERMISSION_GRANTED) {
            readFiles();  //read files from the default storage
        }

        else {
            ActivityCompat.requestPermissions(MainActivity.this, permissions, 1);  //ask permission from user to access phone storage
            readFiles();
        }
    }

    public void readFiles(){
        fileNames = new ArrayList<>();    //list with the file's name
        String path = Environment.getExternalStorageDirectory().toString();    //get the path to the phone storage
        File directory = new File(path+ "/WorkingDirectory");     //set the working directory

        if (!directory.exists())   //if the default directory does not exist create it
            directory.mkdir();

        File[] files = directory.listFiles();    //get the folder files

        if (files!=null) {      //check weather the folder is empty
            for (int i = 0; i < files.length; i++) {
                fileNames.add(files[i].getName());      //put the folder file names on a list
            }
        }


        fileList = (ListView) findViewById(R.id.fileList);       //create the ListView to display the file names



        FileAdapter fileAdapter = new FileAdapter();      //create the adapter

        fileList.setAdapter(fileAdapter);                 //set the adapter on the ListView

    }


    //create the custom adapter to display the file names with the syn button
    class FileAdapter extends BaseAdapter{

        @Override
        public int getCount() {
            return fileNames.size();
        }

        @Override
        public Object getItem(int position) {
            return null;
        }

        @Override
        public long getItemId(int position) {
            return 0;
        }

        @Override
        public View getView(int position, View convertView, ViewGroup parent) {
            convertView=getLayoutInflater().inflate(R.layout.file_list_layout,null);
            TextView fileView= (TextView) convertView.findViewById(R.id.file);
            fileView.setText(fileNames.get(position));
            return convertView;
        }
    }
}
