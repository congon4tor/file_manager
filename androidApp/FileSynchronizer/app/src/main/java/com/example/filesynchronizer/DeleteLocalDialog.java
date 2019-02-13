package com.example.filesynchronizer;
import android.os.Environment;
import android.support.v4.app.DialogFragment;
import android.app.Dialog;
import android.os.Bundle;
import android.app.AlertDialog;
import android.content.DialogInterface;

import java.io.File;


public class DeleteLocalDialog extends DialogFragment {
    @Override
    public Dialog onCreateDialog(Bundle savedInstanceState) {
        // Use the Builder class for convenient dialog construction
        AlertDialog.Builder builder = new AlertDialog.Builder(getActivity());
        builder.setMessage(R.string.localDelete)
                .setPositiveButton(R.string.delete, new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface dialog, int id) {
                        String filename=getArguments().getString("filename");
                        String path= Environment.getExternalStorageDirectory().getAbsolutePath()+"/WorkingDirectory";
                        File file= new File(path,filename);
                        file.delete();
                        //((MainActivity)getActivity()).deleteLocalFileVersion(filename);

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
