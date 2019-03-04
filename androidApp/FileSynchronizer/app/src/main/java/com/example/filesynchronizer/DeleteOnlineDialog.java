package com.example.filesynchronizer;
import android.app.AlertDialog;
import android.app.Dialog;
import android.content.DialogInterface;
import android.os.Bundle;
import android.support.v4.app.DialogFragment;

import java.io.IOException;

import okhttp3.Call;
import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.RequestBody;


public class DeleteOnlineDialog extends DialogFragment {



    @Override
    public Dialog onCreateDialog(Bundle savedInstanceState) {
        // Use the Builder class for convenient dialog construction
        AlertDialog.Builder builder = new AlertDialog.Builder(getActivity());
        builder.setMessage(R.string.onlineDelete)
                .setPositiveButton(R.string.delete, new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface dialog, int id) {
                        String filename=getArguments().getString("filename");
                        String url = "http://18.130.64.155/file/push";
                        OkHttpClient okHttpClient = new OkHttpClient.Builder()
                                .cookieJar(LogInForm.cookieJar)
                                .build();
                        RequestBody requestBody = new MultipartBody.Builder()
                                .setType(MultipartBody.FORM)
                                .addFormDataPart("filename",filename)
                                .addFormDataPart("version",((MainActivity)getActivity()).getServerFileVersion(filename))
                                .addFormDataPart("delete","true")
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
                        } catch(IOException e){
                            e.printStackTrace();
                            return;
                        }

                        ((MainActivity)getActivity()).displayFiles();


                    }
                })
                .setNegativeButton(R.string.notDelete, new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface dialog, int id) {

                    }
                });
        // Create the AlertDialog object and return it
        return builder.create();
    }


}
