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

import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import android.widget.*;
import java.io.File;
import android.os.Environment;
import android.util.Log;
import android.Manifest;
import com.android.volley.toolbox.*;
import com.android.volley.*;
import org.json.*;


public class MainActivity extends AppCompatActivity {

    ListView fileList;
    ArrayList<String> fileNames;
    ArrayList<String> serverNames;
    ArrayList<FileStatus> statusList;


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        String[] permissions={Manifest.permission.READ_EXTERNAL_STORAGE,Manifest.permission.WRITE_EXTERNAL_STORAGE,Manifest.permission.INTERNET};

        if (ContextCompat.checkSelfPermission(this.getApplicationContext(),permissions[0]) == PackageManager.PERMISSION_GRANTED &&   //check weather the app has permissions to read/write on the phone storage
                ContextCompat.checkSelfPermission(this.getApplicationContext(),permissions[1]) == PackageManager.PERMISSION_GRANTED &&
                ContextCompat.checkSelfPermission(this.getApplicationContext(),permissions[2]) == PackageManager.PERMISSION_GRANTED
        ) {
            displayFiles();
            //saveLocalFilesInfo();

        }

        else {
            ActivityCompat.requestPermissions(MainActivity.this, permissions, 1);  //ask permission from user to access phone storage
            displayFiles();
            //saveLocalFilesInfo();

        }
    }


    /*public void displayFiles(){
        fileList = (ListView) findViewById(R.id.fileList); //create the ListView to display the file names

        readFiles();
        readFilesFromServer();
        //getLists();
        //FileAdapter fileAdapter = new FileAdapter();      //create the adapter
        //fileList.setAdapter(fileAdapter);
    }*/
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

               //set the adapter on the ListView

    }


    public void displayFiles(){
        fileList = (ListView) findViewById(R.id.fileList); //create the ListView to display the file names

        readFiles();
        //readFilesFromServer();
        String url = "http://10.0.2.2:3000/file/getInfo";
        serverNames=new ArrayList<>();

        JsonObjectRequest jsonObjectRequest = new JsonObjectRequest
                (Request.Method.GET, url, null, new Response.Listener<JSONObject>() {

                    @Override
                    public void onResponse(JSONObject response) {
                        //Log.d("Response: " , response.toString());


                        try {
                            for (int i=0;i<response.getJSONArray("files").length();i++)
                                serverNames.add(response.getJSONArray("files").getJSONObject(i).get("filename").toString());
                            //Log.d("GETOUTSIDE",serverNames.toString());

                            //////// this is a temporary solution
                            getLists();
                            saveLocalFilesInfo();
                            FileAdapter fileAdapter = new FileAdapter();      //create the adapter
                            fileList.setAdapter(fileAdapter);
                            /////////////////



                        } catch (JSONException e) {
                            e.printStackTrace();
                        }
                    }
                }, new Response.ErrorListener() {

                    @Override
                    public void onErrorResponse(VolleyError error) {
                        Log.d("error","That didn't work!");

                    }
                });


        HTTPHandler.getInstance(this).addToRequestQueue(jsonObjectRequest);  // Access the RequestQueue through your singleton class.
    }

    public boolean checkExistence(String fileName, ArrayList<String> fileNameList){
        for (int i=0;i<fileNameList.size();i++)
            if (fileName.equals(fileNameList.get(i)))
                return true;

         return false;


    }

    public void getLists(){
        //localList=new ArrayList<>();
       // serverList= new ArrayList<>();
       // bothList= new ArrayList<>();

        // 1: local file
        // 2: server file
        // 3: both file

        statusList=new ArrayList<>();

        for (int i=0;i<fileNames.size();i++)
            if (checkExistence(fileNames.get(i),serverNames) == true)
                statusList.add(new FileStatus(fileNames.get(i),3));
            else
                statusList.add(new FileStatus(fileNames.get(i),1));

        for (int i=0;i<serverNames.size();i++)
            if (checkExistence(serverNames.get(i),fileNames) == false)
                statusList.add(new FileStatus(serverNames.get(i),2));


    }

    public void saveLocalFilesInfo(){
        String message = "";
        String fileName= "fileInfo.txt";

        for (int i=0;i<statusList.size();i++)
            if (statusList.get(i).status==1)
                message=message+statusList.get(i).name+","+"1\n";

        try {
            FileOutputStream fileOutputStream=openFileOutput(fileName,MODE_PRIVATE);
            fileOutputStream.write(message.getBytes());
            fileOutputStream.close();
        } catch (IOException e) {
            e.printStackTrace();
        }


    }


    //create the custom adapter to display the file names with the syn button
    class FileAdapter extends BaseAdapter{

        @Override
        public int getCount() {
            return statusList.size();
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
            ImageView updated=(ImageView) convertView.findViewById(R.id.updated);
            ImageView online=(ImageView) convertView.findViewById(R.id.online);
            ImageView local=(ImageView) convertView.findViewById(R.id.local);
            ImageButton synButton=(ImageButton) convertView.findViewById(R.id.synButton);
            ImageButton downloadButton=(ImageButton) convertView.findViewById(R.id.downloadButton);
            ImageButton uploadButton=(ImageButton) convertView.findViewById(R.id.uploadButton);

            fileView.setText(statusList.get(position).name);

            if (statusList.get(position).status==1) {
                local.setVisibility(View.VISIBLE);
                uploadButton.setVisibility(View.VISIBLE);
            }
            else
                if (statusList.get(position).status==2) {
                    online.setVisibility(View.VISIBLE);
                    downloadButton.setVisibility(View.VISIBLE);
                }
                else
                    if (statusList.get(position).status==3) {
                        updated.setVisibility(View.VISIBLE);
                        synButton.setVisibility(View.VISIBLE);
                    }


            return convertView;
        }
    }

    class FileStatus{
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
}
