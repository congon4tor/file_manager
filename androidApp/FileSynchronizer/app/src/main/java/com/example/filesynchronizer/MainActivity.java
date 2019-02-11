package com.example.filesynchronizer;

import android.content.pm.PackageManager;
import android.os.Build;
import android.support.annotation.RequiresApi;
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
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import android.widget.*;
import java.io.File;
import java.util.HashMap;
import okhttp3.*;
import android.os.Environment;
import android.util.Log;
import android.Manifest;
import com.android.volley.toolbox.*;
import com.android.volley.*;
import org.json.*;
import java.util.Map;
import android.os.StrictMode;
import android.net.Uri;
import java.io.*;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;


public class MainActivity extends AppCompatActivity {

    ListView fileList;
    ArrayList<String> fileNames;
    ArrayList<String> serverNames;
    ArrayList<FileStatus> statusList;

    static final int LOCAL=1;
    static final int ONLINE=2;
    static final int BOTH=3;



    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        StrictMode.ThreadPolicy policy = new StrictMode.ThreadPolicy.Builder().permitAll().build();
        StrictMode.setThreadPolicy(policy);

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
        String url = "http://18.130.64.155/file/getInfo";
        serverNames=new ArrayList<>();

        JsonObjectRequest jsonObjectRequest = new JsonObjectRequest
                (com.android.volley.Request.Method.GET, url, null, new com.android.volley.Response.Listener<JSONObject>() {

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
                }, new com.android.volley.Response.ErrorListener() {

                    @Override
                    public void onErrorResponse(VolleyError error) {
                        Toast.makeText(getApplicationContext(),"Error connecting to the server please try again", Toast.LENGTH_LONG).show();

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
                statusList.add(new FileStatus(fileNames.get(i),BOTH));
            else
                statusList.add(new FileStatus(fileNames.get(i),LOCAL));

        for (int i=0;i<serverNames.size();i++)
            if (checkExistence(serverNames.get(i),fileNames) == false)
                statusList.add(new FileStatus(serverNames.get(i),ONLINE));


    }

    public void saveLocalFilesInfo(){
        String message = "";
        String fileName= "localfileinfo.txt";

        for (int i=0;i<statusList.size();i++)
            if (statusList.get(i).status==LOCAL)
                message=message+statusList.get(i).name+","+"1\n";

        try {
            FileOutputStream fileOutputStream=openFileOutput(fileName,MODE_PRIVATE);
            fileOutputStream.write(message.getBytes());
            fileOutputStream.close();
        } catch (IOException e) {
            e.printStackTrace();
        }


    }



    public String getServerFileVersion(String filename){
        OkHttpClient okHttpClient = new OkHttpClient();

        String url = "http://18.130.64.155/file/getInfo?filename=" + filename;
        FileWriter writer = null;
        okhttp3.Request request = new okhttp3.Request.Builder()
                .url(url)
                .build();

        okhttp3.Response response = null;
        try {
            response = okHttpClient.newCall(request).execute();
            String contents = response.body().string();
            JSONObject json = new JSONObject(contents);
            return json.getJSONObject("file").get("version").toString();


        } catch (IOException e) {
            e.printStackTrace();
            return "error getting the file";
        } catch (JSONException e) {
            e.printStackTrace();
            return "error getting the file version";
        }


    }

    public String getLocalFileVersion(String filename){

        File file = new File(getFilesDir(), "fileinfo.txt");
        String version="";
        String line="";

        try {
            FileInputStream fileInputStream = new FileInputStream(file);

            int i=0;
            while((fileInputStream.available())!=0) {
                while ((i = fileInputStream.read()) != '\n') {
                    line += (char) i;
                }
                if (line.substring(0,line.indexOf(',')).equals(filename))
                    return line.substring(line.indexOf(',')+1);

                line="";
            }


            fileInputStream.close();

        } catch (IOException e) {
            e.printStackTrace();
            return "error getting the file version";
        }

        return "something went wrong";


    }

    public void updateLocalFileVersion(String filename){

        File file = new File(getFilesDir(), "fileinfo.txt");
        String contents="";

        try {
            FileInputStream fileInputStream = new FileInputStream(file);
            //

            int i=0;
            while ((i = fileInputStream.read()) != -1)
                contents += (char) i;


            fileInputStream.close();

            String localVersion=getLocalFileVersion(filename);
            String serverVersion=getServerFileVersion(filename);


            FileOutputStream fileOutputStream = new FileOutputStream(file,false);
            String newContents=contents.replace(filename+","+ localVersion,filename+","+serverVersion);


            fileOutputStream.write(newContents.getBytes());
            fileOutputStream.close();

        } catch (IOException e) {
            e.printStackTrace();
        }

    }

    public void updateLocalFileVersion(String filename,String version){

        File file = new File(getFilesDir(), "fileinfo.txt");
        String contents="";

        try {
            FileInputStream fileInputStream = new FileInputStream(file);
            //

            int i=0;
            while ((i = fileInputStream.read()) != -1)
                contents += (char) i;


            fileInputStream.close();

            String localVersion=getLocalFileVersion(filename);
            String serverVersion=getServerFileVersion(filename);


            FileOutputStream fileOutputStream = new FileOutputStream(file,false);
            String newContents=contents.replace(filename+","+ localVersion,filename+","+version);


            fileOutputStream.write(newContents.getBytes());
            fileOutputStream.close();

        } catch (IOException e) {
            e.printStackTrace();
        }

    }

    public void deleteLocalFileVersion(String filename){

        File file = new File(getFilesDir(), "fileinfo.txt");
        String contents="";

        try {
            FileInputStream fileInputStream = new FileInputStream(file);


            int i=0;
            while ((i = fileInputStream.read()) != -1)
                contents += (char) i;


            fileInputStream.close();

            String localVersion=getLocalFileVersion(filename);



            FileOutputStream fileOutputStream = new FileOutputStream(file,false);
            String newContents=contents.replace(filename+","+ localVersion+"\n","");


            fileOutputStream.write(newContents.getBytes());
            fileOutputStream.close();

        } catch (IOException e) {
            e.printStackTrace();
        }

    }

    public String getServerFileHash(String filename){
        OkHttpClient okHttpClient = new OkHttpClient();

        String url = "http://18.130.64.155/file/getInfo?filename=" + filename;
        FileWriter writer = null;
        okhttp3.Request request = new okhttp3.Request.Builder()
                .url(url)
                .build();

        okhttp3.Response response = null;
        try {
            response = okHttpClient.newCall(request).execute();
            String contents = response.body().string();
            JSONObject json = new JSONObject(contents);
            return json.getJSONObject("file").get("hash").toString();


        } catch (IOException e) {
            e.printStackTrace();
            return "error getting the file";
        } catch (JSONException e) {
            e.printStackTrace();
            return "error getting the file version";
        }


    }

    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    public String getLocalFileHash(String filename){

        String path=Environment.getExternalStorageDirectory().getAbsolutePath()+"/WorkingDirectory";
        File file= new File(path,filename);
        String contents="";
        try {
            FileInputStream fileInputStream = new FileInputStream(file);
            int i=0;
            while((i=fileInputStream.read())!=-1){
                contents+=(char)i;
            }
            fileInputStream.close();

        } catch (IOException e) {
            e.printStackTrace();
        }

        MessageDigest md = null;
        try {
            md = MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException e) {
            e.printStackTrace();
        }
        byte[] hashInBytes = md.digest(contents.getBytes(StandardCharsets.UTF_8));

        // bytes to hex
        StringBuilder sb = new StringBuilder();
        for (byte b : hashInBytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();


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

        @RequiresApi(api = Build.VERSION_CODES.KITKAT)
        @Override
        public View getView(final int position, View convertView, ViewGroup parent) {
            convertView=getLayoutInflater().inflate(R.layout.file_list_layout,null);
            final TextView fileView= (TextView) convertView.findViewById(R.id.file);
            final ImageView updated=(ImageView) convertView.findViewById(R.id.updated);
            final ImageView notUpdated=(ImageView) convertView.findViewById(R.id.notUpdated);
            final ImageView online=(ImageView) convertView.findViewById(R.id.online);
            final ImageView local=(ImageView) convertView.findViewById(R.id.local);
            final ImageButton synButton=(ImageButton) convertView.findViewById(R.id.synButton);
            final ImageButton downloadButton=(ImageButton) convertView.findViewById(R.id.downloadButton);
            final ImageButton uploadButton=(ImageButton) convertView.findViewById(R.id.uploadButton);
            final ImageButton deleteButton=(ImageButton) convertView.findViewById(R.id.deleteButton);

            fileView.setText(statusList.get(position).name);

            if (statusList.get(position).status==LOCAL) {
                local.setVisibility(View.VISIBLE);
                uploadButton.setVisibility(View.VISIBLE);

                uploadButton.setOnClickListener(new View.OnClickListener() {
                    public void onClick(final View v) {
                        String url = "http://18.130.64.155/file/push";
                        OkHttpClient okHttpClient = new OkHttpClient();
                        String path=Environment.getExternalStorageDirectory().getAbsolutePath()+"/WorkingDirectory";
                        String filename= (String) fileView.getText();
                        File uploadFile= new File(path,filename);


                        RequestBody requestBody = new MultipartBody.Builder()
                                .setType(MultipartBody.FORM)
                                .addFormDataPart("file",filename,RequestBody.create(MediaType.parse("application/octet-stream"),uploadFile))
                                .addFormDataPart("version","1")
                                .build();

                    okhttp3.Request request = new okhttp3.Request.Builder()
                            .url(url)
                            .post(requestBody)
                            .build();

                    Call call = okHttpClient.newCall(request);
                    okhttp3.Response response = null;

                    try{
                        response = call.execute();
                        String contents = response.body().string();

                        if (contents.contains("\"success\":false")) {
                            Toast.makeText(getApplicationContext(),"Error uploading the file", Toast.LENGTH_LONG).show();
                            return;
                        }

                       // Log.d("upload response",response.body().string());
                    } catch(IOException e){
                        e.printStackTrace();
                        return;
                    }

                        String infoFile="fileinfo.txt";
                        String version=filename + ",1\n";
                        File file = new File(getFilesDir(), infoFile);

                        try {
                            if (file.createNewFile()) {
                                FileOutputStream fileOutputStream = new FileOutputStream(file, false);
                                fileOutputStream.write(version.getBytes());
                                fileOutputStream.close();
                            }
                            else{
                                FileOutputStream fileOutputStream = new FileOutputStream(file, true);
                                fileOutputStream.write(version.getBytes());
                                fileOutputStream.close();
                            }
                        } catch (IOException e) {
                            e.printStackTrace();
                        }

                    //statusList.get(position).status=3;
                    //local.setVisibility(View.INVISIBLE);
                    ///uploadButton.setVisibility(View.INVISIBLE);
                    //updated.setVisibility(View.VISIBLE);
                    //synButton.setVisibility(View.VISIBLE);
                        displayFiles();

                    }
                });

                deleteButton.setOnClickListener(new View.OnClickListener() {
                    public void onClick(final View v) {
                        String filename= (String) fileView.getText();
                        DeleteLocalDialog dialog=new DeleteLocalDialog();
                        Bundle args = new Bundle();
                        args.putString("filename",filename);
                        dialog.setArguments(args);
                        dialog.show(getSupportFragmentManager(),"dialog");


                    }

                    });
            }
            else
                if (statusList.get(position).status==ONLINE) {
                    online.setVisibility(View.VISIBLE);
                    downloadButton.setVisibility(View.VISIBLE);

                    downloadButton.setOnClickListener(new View.OnClickListener() {
                        public void onClick(final View v) {

                            OkHttpClient okHttpClient = new OkHttpClient();
                            String path=Environment.getExternalStorageDirectory().getAbsolutePath()+"/WorkingDirectory";
                            String filename= (String) fileView.getText();
                            File downloadFile= new File(path,filename);
                            String url = "http://18.130.64.155/file/getFile?filename=" + filename;
                            FileWriter writer = null;
                            okhttp3.Request request = new okhttp3.Request.Builder()
                                    .url(url)
                                    .build();

                            okhttp3.Response response = null;
                            try {
                                response = okHttpClient.newCall(request).execute();
                                String contents = response.body().string();

                                if (contents.contains("\"success\":false")) {
                                    Toast.makeText(getApplicationContext(),"Error downloading the file", Toast.LENGTH_LONG).show();
                                    return;
                                }

                                writer = new FileWriter(downloadFile);
                                writer.append(contents);
                                writer.flush();
                                writer.close();

                            } catch (IOException e) {
                                e.printStackTrace();
                                return;
                            }


                            String infoFile="fileinfo.txt";
                            String version=filename + "," + getServerFileVersion(filename) + "\n";
                            File file = new File(getFilesDir(), infoFile);

                            try {
                                if (file.createNewFile()) {
                                    FileOutputStream fileOutputStream = new FileOutputStream(file, false);
                                    fileOutputStream.write(version.getBytes());
                                    fileOutputStream.close();
                                }
                                else{
                                    FileOutputStream fileOutputStream = new FileOutputStream(file, true);
                                    fileOutputStream.write(version.getBytes());
                                    fileOutputStream.close();
                                }
                            } catch (IOException e) {
                                e.printStackTrace();
                            }


                            //statusList.get(position).status=3;
                           // online.setVisibility(View.INVISIBLE);
                            //downloadButton.setVisibility(View.INVISIBLE);
                            //updated.setVisibility(View.VISIBLE);
                            //synButton.setVisibility(View.VISIBLE);
                            displayFiles();

                        }
                    });

                    deleteButton.setOnClickListener(new View.OnClickListener() {
                        public void onClick(final View v) {
                            String filename= (String) fileView.getText();
                            DeleteOnlineDialog dialog=new DeleteOnlineDialog();
                            Bundle args = new Bundle();
                            args.putString("filename",filename);
                            dialog.setArguments(args);
                            dialog.show(getSupportFragmentManager(),"dialog");

                        }

                    });




                }
                else
                    if (statusList.get(position).status==BOTH) {


                        String filename= (String) fileView.getText();

                        deleteButton.setOnClickListener(new View.OnClickListener() {
                            public void onClick(final View v) {
                                String filename= (String) fileView.getText();
                                DeleteBothDialog dialog=new DeleteBothDialog();
                                Bundle args = new Bundle();
                                args.putString("filename",filename);
                                dialog.setArguments(args);
                                dialog.show(getSupportFragmentManager(),"dialog");

                            }

                        });

                        if (Integer.parseInt(getLocalFileVersion(filename))!=Integer.parseInt(getServerFileVersion(filename))){

                            notUpdated.setVisibility(View.VISIBLE);
                            synButton.setVisibility(View.VISIBLE);

                            synButton.setOnClickListener(new View.OnClickListener() {
                                public void onClick(final View v) {

                                    OkHttpClient okHttpClient = new OkHttpClient();
                                    String path=Environment.getExternalStorageDirectory().getAbsolutePath()+"/WorkingDirectory";
                                    String filename= (String) fileView.getText();
                                    File downloadFile= new File(path,filename);
                                    String url = "http://18.130.64.155/file/getFile?filename=" + filename;
                                    FileWriter writer = null;
                                    okhttp3.Request request = new okhttp3.Request.Builder()
                                            .url(url)
                                            .build();

                                    okhttp3.Response response = null;
                                    try {
                                        response = okHttpClient.newCall(request).execute();
                                        String contents = response.body().string();

                                        if (contents.contains("\"success\":false")) {
                                            Toast.makeText(getApplicationContext(),"Error updating the file", Toast.LENGTH_LONG).show();
                                            return;
                                        }

                                        writer = new FileWriter(downloadFile,false);
                                        writer.write(contents);
                                        writer.flush();
                                        writer.close();

                                    } catch (IOException e) {
                                        e.printStackTrace();
                                        return;
                                    }

                                  updateLocalFileVersion(filename);


                                    //notUpdated.setVisibility(View.INVISIBLE);
                                   // updated.setVisibility(View.VISIBLE);
                                   // synButton.setVisibility(View.INVISIBLE);
                                    displayFiles();

                                }
                            });



                        }

                        else {
                            if (getLocalFileHash(filename).equals(getServerFileHash(filename))==false){
                                notUpdated.setVisibility(View.VISIBLE);
                                synButton.setVisibility(View.VISIBLE);

                                synButton.setOnClickListener(new View.OnClickListener() {
                                    public void onClick(final View v) {
                                        String url = "http://18.130.64.155/file/push";
                                        OkHttpClient okHttpClient = new OkHttpClient();
                                        String path=Environment.getExternalStorageDirectory().getAbsolutePath()+"/WorkingDirectory";
                                        String filename= (String) fileView.getText();
                                        File uploadFile= new File(path,filename);
                                        //getContentResolver().getType(Uri.fromFile(uploadFile))


                                        RequestBody requestBody = new MultipartBody.Builder()
                                                .setType(MultipartBody.FORM)
                                                .addFormDataPart("file",filename,RequestBody.create(MediaType.parse("application/octet-stream"),uploadFile))
                                                .addFormDataPart("version",getLocalFileVersion(filename))
                                                .build();

                                        okhttp3.Request request = new okhttp3.Request.Builder()
                                                .url(url)
                                                .post(requestBody)
                                                .build();

                                        Call call = okHttpClient.newCall(request);
                                        okhttp3.Response response = null;

                                        try{
                                            response = call.execute();
                                            String contents = response.body().string();

                                            if (contents.contains("\"success\":false")) {
                                                Toast.makeText(getApplicationContext(),"Error updating the file", Toast.LENGTH_LONG).show();
                                                return;
                                            }
                                            Log.d("upload response",response.body().string());
                                        } catch(IOException e){
                                            e.printStackTrace();
                                            return;
                                        }

                                        int currentVersion=Integer.parseInt(getLocalFileVersion(filename)) +1;


                                       updateLocalFileVersion(filename,Integer.toString(currentVersion));

                                        //notUpdated.setVisibility(View.INVISIBLE);
                                        //updated.setVisibility(View.VISIBLE);
                                        //synButton.setVisibility(View.INVISIBLE);
                                        displayFiles();

                                    }
                                });





                            }
                            else{
                                updated.setVisibility(View.VISIBLE);
                                synButton.setVisibility(View.INVISIBLE);



                            }


                        }



                    }


            return convertView;
        }
    }


}
