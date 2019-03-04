package com.example.filesynchronizer;

import android.Manifest;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.StrictMode;
import android.support.annotation.RequiresApi;
import android.support.v4.app.ActivityCompat;
import android.support.v4.content.ContextCompat;
import android.support.v4.widget.SwipeRefreshLayout;
import android.support.v7.app.AppCompatActivity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.Button;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.ListView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;

import okhttp3.Call;
import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.RequestBody;



public class MainActivity extends AppCompatActivity {

    ListView fileList;
    ArrayList<String> fileNames;
    ArrayList<String> serverNames;
    ArrayList<FileStatus> statusList;
    SharedPreferences savedState;
    SharedPreferences savedUsername;
    SharedPreferences savedPassword;
    //OkHttpClient okHttpClient = new OkHttpClient();
    OkHttpClient okHttpClient = new OkHttpClient.Builder()
            .cookieJar(LogInForm.cookieJar)
            .build();




    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        StrictMode.ThreadPolicy policy = new StrictMode.ThreadPolicy.Builder().permitAll().build();
        StrictMode.setThreadPolicy(policy);

        String[] permissions = {Manifest.permission.READ_EXTERNAL_STORAGE, Manifest.permission.WRITE_EXTERNAL_STORAGE, Manifest.permission.INTERNET};

        if (ContextCompat.checkSelfPermission(this.getApplicationContext(), permissions[0]) == PackageManager.PERMISSION_GRANTED &&   //check weather the app has permissions to read/write on the phone storage
                ContextCompat.checkSelfPermission(this.getApplicationContext(), permissions[1]) == PackageManager.PERMISSION_GRANTED &&
                ContextCompat.checkSelfPermission(this.getApplicationContext(), permissions[2]) == PackageManager.PERMISSION_GRANTED
        ) {
            displayFiles();

        } else {
            ActivityCompat.requestPermissions(MainActivity.this, permissions, 1);  //ask permission from user to access phone storage
            displayFiles();
        }

        final SwipeRefreshLayout mySwipeRefreshLayout =  (SwipeRefreshLayout)findViewById(R.id.swiperefresh);

        mySwipeRefreshLayout.setOnRefreshListener(
                new SwipeRefreshLayout.OnRefreshListener() {
                    @Override
                    public void onRefresh() {
                        displayFiles();
                        //Log.d("check refresh","refresh wroks");
                        mySwipeRefreshLayout.setRefreshing(false);
                    }
                }
        );


    }


    public void readFiles() {
        fileNames = new ArrayList<>();    //list with the file's name
        String path = Environment.getExternalStorageDirectory().toString();    //get the path to the phone storage
        File directory = new File(path + "/WorkingDirectory");     //set the working directory
        if (!directory.exists())   //if the default directory does not exist create it
            directory.mkdir();

        File[] files = directory.listFiles();    //get the folder files

        if (files != null) {      //check weather the folder is empty
            for (int i = 0; i < files.length; i++) {
                fileNames.add(files[i].getName());      //put the folder file names on a list
            }
        }

        //set the adapter on the ListView

    }


    public void displayFiles() {
        fileList = (ListView) findViewById(R.id.fileList); //create the ListView to display the file names


        readFiles();
        //readFilesFromServer();
        String url = "http://18.130.64.155/file/getInfo";
        serverNames = new ArrayList<>();


        okhttp3.Request request = new okhttp3.Request.Builder()     //build the request to the server to get information of a file in json format
                .url(url)
                .build();

        okhttp3.Response response = null;

        try {
            response = okHttpClient.newCall(request).execute();        // execute the request
            String contents = response.body().string();            //get the response contents
            JSONObject json = new JSONObject(contents);        //get the json form the response

            for (int i = 0; i < json.getJSONArray("files").length(); i++)
                serverNames.add(json.getJSONArray("files").getJSONObject(i).get("filename").toString());

            getLists();
            FileAdapter fileAdapter = new FileAdapter();      //create the adapter
            fileList.setAdapter(fileAdapter);



        } catch (IOException e) {
            Toast.makeText(getApplicationContext(), "Error connecting to the server please try again", Toast.LENGTH_LONG).show();
            e.printStackTrace();
        } catch (JSONException e) {
            Toast.makeText(getApplicationContext(), "Error connecting to the server please try again", Toast.LENGTH_LONG).show();
            e.printStackTrace();
        }

        Button logoutButton=(Button) findViewById(R.id.logoutButton);

        logoutButton.setOnClickListener(new View.OnClickListener() {
            public void onClick(final View v) {
                savedState = getSharedPreferences("login",MODE_PRIVATE);
                savedUsername = getSharedPreferences("username",MODE_PRIVATE);
                savedPassword = getSharedPreferences("password",MODE_PRIVATE);
                savedState.edit().putBoolean("logged",false).apply();      //set logged status as false
                savedUsername.edit().putString("username","").apply();     //delete logged username
                savedPassword.edit().putString("password","").apply();     //delete logged password

                logout();
                File file = new File(getFilesDir(), "fileinfo.txt");
                file.delete();

                Intent intent = new Intent(MainActivity.this, LogInForm.class);
                startActivity(intent);
                finish();

            }

        });

    }

    //check if a file name exists in a list of filenames
    public boolean checkExistence(String fileName, ArrayList<String> fileNameList) {
        for (int i = 0; i < fileNameList.size(); i++)
            if (fileName.equals(fileNameList.get(i)))
                return true;

        return false;


    }

    //create a common list that has all the files along with their status, if they are on local storage, server or both
    public void getLists() {

        statusList = new ArrayList<>();

        for (int i = 0; i < fileNames.size(); i++)
            if (checkExistence(fileNames.get(i), serverNames) == true)
                statusList.add(new FileStatus(fileNames.get(i), FileStatus.BOTH));
            else
                statusList.add(new FileStatus(fileNames.get(i), FileStatus.LOCAL));

        for (int i = 0; i < serverNames.size(); i++)
            if (checkExistence(serverNames.get(i), fileNames) == false)
                statusList.add(new FileStatus(serverNames.get(i), FileStatus.ONLINE));


    }


    //get the file version of a specific file from the server
    public String getServerFileVersion(String filename) {


        String url = "http://18.130.64.155/file/getInfo?filename=" + filename;
        FileWriter writer = null;
        okhttp3.Request request = new okhttp3.Request.Builder()     //build the request to the server to get information of a file in json format
                .url(url)
                .build();

        okhttp3.Response response = null;
        try {
            response = okHttpClient.newCall(request).execute();        // execute the request
            String contents = response.body().string();            //get the response contents
            JSONObject json = new JSONObject(contents);        //get the json form the response
            return json.getJSONObject("file").get("version").toString();   //get the version field of the file


        } catch (IOException e) {
            e.printStackTrace();
            return "error getting the file";
        } catch (JSONException e) {
            e.printStackTrace();
            return "error getting the file version";
        }


    }

    //get the file version of a locally saved file
    public String getLocalFileVersion(String filename) {

        File file = new File(getFilesDir(), "fileinfo.txt");   //get the fileinfo file object
        String version = "";
        String line = "";

        try {
            FileInputStream fileInputStream = new FileInputStream(file);   //open a stream to read the file

            int i = 0;
            while ((fileInputStream.available()) != 0) {      //read every char of the file until null
                while ((i = fileInputStream.read()) != '\n') {      //read a whole line and save it
                    line += (char) i;
                }
                if (line.substring(0, line.indexOf(',')).equals(filename))    //find the line that has the filename you are looking for
                    return line.substring(line.indexOf(',') + 1);             //get the file version on that line

                line = "";
            }


            fileInputStream.close();

        } catch (IOException e) {
            e.printStackTrace();
            return "1";
        }

        return "1";


    }


    //update an existing version of a file in the fileinfo file
    public void updateLocalFileVersion(String filename) {

        File file = new File(getFilesDir(), "fileinfo.txt");
        String contents = "";

        try {
            FileInputStream fileInputStream = new FileInputStream(file);    //open a stream to read the fileinfo file
            //

            int i = 0;
            while ((i = fileInputStream.read()) != -1)       //save all the fileinfo contents to a variable
                contents += (char) i;


            fileInputStream.close();

            String localVersion = getLocalFileVersion(filename);   //get the file version of the local file
            String serverVersion = getServerFileVersion(filename); //get the server file version from the server


            FileOutputStream fileOutputStream = new FileOutputStream(file, false);     //open a stream to write into the file
            String newContents = contents.replace(filename + "," + localVersion, filename + "," + serverVersion);    //replace the old local version with the new one from the server


            fileOutputStream.write(newContents.getBytes());   //write the new contents into the file
            fileOutputStream.close();

        } catch (IOException e) {
            e.printStackTrace();
        }

    }

    //update an existing version of a file in the fileinfo file but this time you choose the version to update it with
    public void updateLocalFileVersion(String filename, String version) {

        File file = new File(getFilesDir(), "fileinfo.txt");
        String contents = "";

        try {
            FileInputStream fileInputStream = new FileInputStream(file);
            //

            int i = 0;
            while ((i = fileInputStream.read()) != -1)
                contents += (char) i;


            fileInputStream.close();

            String localVersion = getLocalFileVersion(filename);
            String serverVersion = getServerFileVersion(filename);


            FileOutputStream fileOutputStream = new FileOutputStream(file, false);
            String newContents = contents.replace(filename + "," + localVersion, filename + "," + version);


            fileOutputStream.write(newContents.getBytes());
            fileOutputStream.close();

        } catch (IOException e) {
            e.printStackTrace();
        }

    }

    //delete the local file version in the fileinfo file of a specific filename
    public void deleteLocalFileVersion(String filename) {

        File file = new File(getFilesDir(), "fileinfo.txt");
        String contents = "";

        try {
            FileInputStream fileInputStream = new FileInputStream(file);    //open a stream to read the file


            int i = 0;
            while ((i = fileInputStream.read()) != -1)     //save all the contents of the file
                contents += (char) i;


            fileInputStream.close();

            String localVersion = getLocalFileVersion(filename);   //get the local file version of the file


            FileOutputStream fileOutputStream = new FileOutputStream(file, false);    //open a stream to write into the file
            String newContents = contents.replace(filename + "," + localVersion + "\n", "");   //delete the line that contains the filename


            fileOutputStream.write(newContents.getBytes());  //write the new contents into the file
            fileOutputStream.close();

        } catch (IOException e) {
            e.printStackTrace();
        }

    }


    //get the hash value of a specific file from the server
    public String getServerFileHash(String filename) {


        String url = "http://18.130.64.155/file/getInfo?filename=" + filename;
        FileWriter writer = null;
        okhttp3.Request request = new okhttp3.Request.Builder()
                .url(url)
                .build();

        okhttp3.Response response = null;
        try {
            response = okHttpClient.newCall(request).execute();
            String contents = response.body().string();            //get contents of json response
            JSONObject json = new JSONObject(contents);
            return json.getJSONObject("file").get("hash").toString();       //get the hash of the file


        } catch (IOException e) {
            e.printStackTrace();
            return "error getting the file";
        } catch (JSONException e) {
            e.printStackTrace();
            return "error getting the file version";
        }


    }


    //calculates the hash value of a local file
    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    public String getLocalFileHash(String filename) {

        String path = Environment.getExternalStorageDirectory().getAbsolutePath() + "/WorkingDirectory";
        File file = new File(path, filename);
        String contents = "";
        try {
            FileInputStream fileInputStream = new FileInputStream(file);
            int i = 0;
            while ((i = fileInputStream.read()) != -1) {
                contents += (char) i;
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

    //sends a file to the server
    public String uploadFile(String filename, String version) {

        String url = "http://18.130.64.155/file/push";

        String path = Environment.getExternalStorageDirectory().getAbsolutePath() + "/WorkingDirectory";    //get the external directory of the file you want to send to server
        File uploadFile = new File(path, filename);     //get the object of the file you want to upload in that directory

        //post request to send the file from the server
        RequestBody requestBody = new MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("file", filename, RequestBody.create(MediaType.parse("application/octet-stream"), uploadFile))  //send the file contents
                .addFormDataPart("version", version)        //send the version of the file
                .build();

        okhttp3.Request request = new okhttp3.Request.Builder()
                .url(url)
                .post(requestBody)
                .build();

        Call call = okHttpClient.newCall(request);
        okhttp3.Response response = null;

        try {
            response = call.execute();
            return response.body().string();      //return the server response
            // Log.d("upload response",response.body().string());
        } catch (IOException e) {
            e.printStackTrace();
            return "error";
        }

    }

    //download a file from the server
    public String downloadFile(String filename) {

        String path = Environment.getExternalStorageDirectory().getAbsolutePath() + "/WorkingDirectory";    //get the external directory where the file will be saved
        File downloadFile = new File(path, filename);    //get the file object you will save the contents in
        String url = "http://18.130.64.155/file/getFile?filename=" + filename;
        FileWriter writer = null;

        //build request to get the file from the server
        okhttp3.Request request = new okhttp3.Request.Builder()
                .url(url)
                .build();

        okhttp3.Response response = null;
        try {
            response = okHttpClient.newCall(request).execute();   //get the response
            String contents = response.body().string();       //save the contents of the file into a string

            //check weather the server returns an error and display the proper error message
            if (contents.contains("\"success\":false")) {
                Toast.makeText(getApplicationContext(), "Error getting the file", Toast.LENGTH_LONG).show();
                return "error";
            }

            //write the contents you got into the file
            writer = new FileWriter(downloadFile, false);
            writer.write(contents);
            writer.flush();
            writer.close();

        } catch (IOException e) {
            e.printStackTrace();
            return "error";
        }

        return "success";

    }

    //add the version of a new file into the fileinfo.txt file
    public void addLocalFileInfo(String filename, String version) {
        String infoFile = "fileinfo.txt";
        String versionLine = filename + "," + version + "\n";     //the new line of the version of a specific filename
        File file = new File(getFilesDir(), infoFile);

        try {
            if (file.createNewFile()) {         //check weather the fileinfo.txt file already exists
                FileOutputStream fileOutputStream = new FileOutputStream(file, false);       //create the file and add the filename with its version
                fileOutputStream.write(versionLine.getBytes());
                fileOutputStream.close();
            } else {
                FileOutputStream fileOutputStream = new FileOutputStream(file, true);        //append the existing file with the new filename and version
                fileOutputStream.write(versionLine.getBytes());
                fileOutputStream.close();
            }
        } catch (IOException e) {
            e.printStackTrace();
        }


    }

    public void logout(){


        String url = "http://18.130.64.155/user/logout";

        //build request to get the file from the server
        okhttp3.Request request = new okhttp3.Request.Builder()
                .url(url)
                .build();

        okhttp3.Response response = null;
        try {
            response = okHttpClient.newCall(request).execute();   //get the response
            String contents = response.body().string();       //save the contents of the file into a string

        } catch (IOException e) {
            e.printStackTrace();
        }

    }


    //create the custom adapter to display the file names with the syn button
    class FileAdapter extends BaseAdapter {

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

            //get all the items for each line of the list
            convertView = getLayoutInflater().inflate(R.layout.file_list_layout, null);
            final TextView fileView = (TextView) convertView.findViewById(R.id.file);
            final ImageView updated = (ImageView) convertView.findViewById(R.id.updated);
            final ImageView notUpdated = (ImageView) convertView.findViewById(R.id.notUpdated);
            final ImageView online = (ImageView) convertView.findViewById(R.id.online);
            final ImageView local = (ImageView) convertView.findViewById(R.id.local);
            final ImageButton synButton = (ImageButton) convertView.findViewById(R.id.synButton);
            final ImageButton downloadButton = (ImageButton) convertView.findViewById(R.id.downloadButton);
            final ImageButton uploadButton = (ImageButton) convertView.findViewById(R.id.uploadButton);
            final ImageButton deleteButton = (ImageButton) convertView.findViewById(R.id.deleteButton);
            final ImageButton conflictButton = (ImageButton) convertView.findViewById(R.id.conflictButton);

            fileView.setText(statusList.get(position).name);           //set the name of the file to appear

            if (statusList.get(position).status == FileStatus.LOCAL) {        //check weather the file is only local
                local.setVisibility(View.VISIBLE);
                uploadButton.setVisibility(View.VISIBLE);

                //action when upload button is pressed
                uploadButton.setOnClickListener(new View.OnClickListener() {
                    public void onClick(final View v) {
                        String filename = (String) fileView.getText();     //get the filename of the file you want to upload

                        if (uploadFile(filename, "1").contains("\"success\":false")) {        //execute the upload and check weather it returns an error
                            Toast.makeText(getApplicationContext(), "Error uploading the file", Toast.LENGTH_LONG).show();
                            return;
                        }

                        addLocalFileInfo(filename, "1");           //save the filename of the file you just uploaded with version 1
                        displayFiles();

                    }
                });

                //action when the delete button is pressed
                deleteButton.setOnClickListener(new View.OnClickListener() {
                    public void onClick(final View v) {
                        String filename = (String) fileView.getText();
                        DeleteLocalDialog dialog = new DeleteLocalDialog();      //create the user delete dialog
                        Bundle args = new Bundle();
                        args.putString("filename", filename);        //send the filename to the dialog
                        dialog.setArguments(args);
                        dialog.show(getSupportFragmentManager(), "dialog");      //show the dialog


                    }

                });
            } else if (statusList.get(position).status == FileStatus.ONLINE) {        //check weather the file is only on the server
                online.setVisibility(View.VISIBLE);
                downloadButton.setVisibility(View.VISIBLE);

                //action when download button is pressed
                downloadButton.setOnClickListener(new View.OnClickListener() {
                    public void onClick(final View v) {

                        String filename = (String) fileView.getText();    //get the filename

                        if (downloadFile(filename).equals("error"))  //download the file
                            return;


                        addLocalFileInfo(filename, getServerFileVersion(filename));    //save the filename along with its version you got from the server

                        displayFiles();

                    }
                });

                deleteButton.setOnClickListener(new View.OnClickListener() {
                    public void onClick(final View v) {
                        String filename = (String) fileView.getText();      //same as above
                        DeleteOnlineDialog dialog = new DeleteOnlineDialog();
                        Bundle args = new Bundle();
                        args.putString("filename", filename);
                        dialog.setArguments(args);
                        dialog.show(getSupportFragmentManager(), "dialog");

                    }

                });


            } else if (statusList.get(position).status == FileStatus.BOTH) {     //check weather the file is on both local storage and server


                String filename = (String) fileView.getText();    //get the filename

                deleteButton.setOnClickListener(new View.OnClickListener() {
                    public void onClick(final View v) {
                        String filename = (String) fileView.getText();    //same as above
                        DeleteBothDialog dialog = new DeleteBothDialog();
                        Bundle args = new Bundle();
                        args.putString("filename", filename);
                        dialog.setArguments(args);
                        dialog.show(getSupportFragmentManager(), "dialog");

                    }

                });

                if (Integer.parseInt(getLocalFileVersion(filename)) != Integer.parseInt(getServerFileVersion(filename))) {  //check if the version of the local file is not the same as the correspoding of the server

                    notUpdated.setVisibility(View.VISIBLE);
                    conflictButton.setVisibility(View.VISIBLE);

                    //action to be done when you hit synchronise
                    conflictButton.setOnClickListener(new View.OnClickListener() {
                        public void onClick(final View v) {
                            String filename = (String) fileView.getText();     //get the filename
                            ConflictDialog dialog = new ConflictDialog();     //create the dialog with the three conflict options
                            Bundle args = new Bundle();
                            args.putString("filename", filename);
                            dialog.setArguments(args);
                            dialog.show(getSupportFragmentManager(), "dialog");    //show the dialog
                            displayFiles();

                        }
                    });


                } else {
                    if (getLocalFileHash(filename).equals(getServerFileHash(filename)) == false) {   //if the files have the same version check weather they are not exactly the same
                        notUpdated.setVisibility(View.VISIBLE);
                        synButton.setVisibility(View.VISIBLE);

                        synButton.setOnClickListener(new View.OnClickListener() {
                            public void onClick(final View v) {
                                String filename = (String) fileView.getText();

                                String uploadResult=uploadFile(filename, getLocalFileVersion(filename)); //upload the new version of the file

                                if (uploadResult.contains("\"success\":false")) {
                                    if (uploadResult.contains("The file was not up to date, not deleting it to avoid conflicts")){


                                    }
                                    else {
                                        Toast.makeText(getApplicationContext(), "Error updating the file", Toast.LENGTH_LONG).show();
                                        return;
                                    }
                                }


                                int currentVersion = Integer.parseInt(getLocalFileVersion(filename)) + 1;     //calculate the new version of the file


                                updateLocalFileVersion(filename, Integer.toString(currentVersion));        //update the new version of the file

                                displayFiles();

                            }
                        });


                    } else {        //in the occasion that the files have the same version and same hash
                        updated.setVisibility(View.VISIBLE);
                        synButton.setVisibility(View.INVISIBLE);

                    }


                }


            }


            return convertView;
        }
    }


}
