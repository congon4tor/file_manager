package com.example.filesynchronizer;
import android.os.Environment;
import android.support.v4.app.DialogFragment;
import android.app.Dialog;
import android.os.Bundle;
import android.app.AlertDialog;
import android.content.DialogInterface;

import java.io.File;
import java.io.IOException;

import okhttp3.Call;
import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.RequestBody;
import java.util.ArrayList;
import android.util.Log;


public class DeleteBothDialog extends DialogFragment {

    ArrayList mSelectedItems;
    @Override
    public Dialog onCreateDialog(Bundle savedInstanceState) {
        mSelectedItems = new ArrayList();  // Where we track the selected items
        AlertDialog.Builder builder = new AlertDialog.Builder(getActivity());
        // Set the dialog title
        builder.setTitle(R.string.bothDelete)
                // Specify the list array, the items to be selected by default (null for none),
                // and the listener through which to receive callbacks when items are selected
                .setMultiChoiceItems(R.array.deleteOptions, null,
                        new DialogInterface.OnMultiChoiceClickListener() {
                            @Override
                            public void onClick(DialogInterface dialog, int which,
                                                boolean isChecked) {
                                if (isChecked) {
                                    // If the user checked the item, add it to the selected items
                                    mSelectedItems.add(which);
                                } else if (mSelectedItems.contains(which)) {
                                    // Else, if the item is already in the array, remove it
                                    mSelectedItems.remove(Integer.valueOf(which));
                                }
                            }
                        })
                // Set the action buttons
                .setPositiveButton(R.string.confirm, new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int id) {
                        for (int i=0;i<mSelectedItems.size();i++){
                            if (mSelectedItems.get(i).toString().equals("0")){
                                String filename=getArguments().getString("filename");
                                String path= Environment.getExternalStorageDirectory().getAbsolutePath()+"/WorkingDirectory";
                                File file= new File(path,filename);
                                file.delete();
                                ((MainActivity)getActivity()).deleteLocalFileVersion(filename);

                            }

                            if (mSelectedItems.get(i).toString().equals("1")){
                                String filename=getArguments().getString("filename");
                                String url = "http://10.0.2.2:3000/file/push";
                                OkHttpClient okHttpClient = new OkHttpClient();
                                RequestBody requestBody = new MultipartBody.Builder()
                                        .setType(MultipartBody.FORM)
                                        .addFormDataPart("filename",filename)
                                        .addFormDataPart("version",((MainActivity)getActivity()).getLocalFileVersion(filename))
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
                                ((MainActivity)getActivity()).deleteLocalFileVersion(filename);


                            }
                        }
                        ((MainActivity)getActivity()).displayFiles();

                    }
                })
                .setNegativeButton(R.string.cancel, new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int id) {

                    }
                });

        return builder.create();
    }


}

