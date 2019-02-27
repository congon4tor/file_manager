package com.example.filesynchronizer;

import android.os.Environment;
import android.support.v4.app.DialogFragment;
import android.app.Dialog;
import android.os.Bundle;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.widget.Toast;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;

import okhttp3.Call;
import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.RequestBody;

public class ConflictDialog extends DialogFragment {
    @Override
    public Dialog onCreateDialog(Bundle savedInstanceState) {
        AlertDialog.Builder builder = new AlertDialog.Builder(getActivity());
        builder.setTitle(R.string.conflict)
                .setItems(R.array.conflictOptions, new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface dialog, int which) {
                        String filename=getArguments().getString("filename");

                        if (which==0){
                            if (forceUpload(filename,((MainActivity)getActivity()).getLocalFileVersion(filename)).contains("\"success\":false")){
                                Toast.makeText(((MainActivity)getActivity()).getApplicationContext(), "Error updating the file", Toast.LENGTH_LONG).show();
                                return;
                            }

                            int currentVersion = Integer.parseInt(((MainActivity)getActivity()).getLocalFileVersion(filename)) + 2;     //calculate the new version of the file


                            ((MainActivity)getActivity()).updateLocalFileVersion(filename, Integer.toString(currentVersion));        //update the new version of the file

                            ((MainActivity)getActivity()).displayFiles();



                        }
                        if (which==1){

                            if (((MainActivity)getActivity()).downloadFile(filename).equals("error"))        //download the new version of the file
                                return;

                            ((MainActivity)getActivity()).updateLocalFileVersion(filename);            //update the local version file with the new version you got from the server
                            ((MainActivity)getActivity()).displayFiles();


                        }

                        if (which==2){
                            getDiff(filename,((MainActivity)getActivity()).getLocalFileVersion(filename));

                        }
                    }
                });
        return builder.create();
    }

    public String forceUpload(String filename, String version) {

        String url = "http://10.0.2.2:3000/file/push";
        OkHttpClient okHttpClient = new OkHttpClient();
        String path = Environment.getExternalStorageDirectory().getAbsolutePath() + "/WorkingDirectory";    //get the external directory of the file you want to send to server
        File uploadFile = new File(path, filename);     //get the object of the file you want to upload in that directory

        //post request to send the file from the server
        RequestBody requestBody = new MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("file", filename, RequestBody.create(MediaType.parse("application/octet-stream"), uploadFile))  //send the file contents
                .addFormDataPart("version", version)        //send the version of the file
                .addFormDataPart("force", "true")
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

    public void getDiff(String filename, String version){
        String url = "http://10.0.2.2:3000/file/getDiff";
        OkHttpClient okHttpClient = new OkHttpClient();
        String path = Environment.getExternalStorageDirectory().getAbsolutePath() + "/WorkingDirectory";    //get the external directory of the file you want to send to server
        File uploadFile = new File(path, filename);     //get the object of the file you want to upload in that directory
        File diffFile=new File(path,filename);
        FileWriter writer = null;

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
            String contents = response.body().string();       //save the contents of the file into a string

            //check weather the server returns an error and display the proper error message
            if (contents.contains("\"success\":false")) {
                Toast.makeText(((MainActivity)getActivity()).getApplicationContext(), "Error getting the file", Toast.LENGTH_LONG).show();

            }

            JSONObject json=new JSONObject(contents);


            //write the contents you got into the file
            writer = new FileWriter(diffFile, false);
            writer.write(json.getString("diff"));
            writer.flush();
            writer.close();

            ((MainActivity)getActivity()).addLocalFileInfo("diff.txt",json.getString("version"));

        } catch (IOException | JSONException e) {
            e.printStackTrace();
        }

    }
}
