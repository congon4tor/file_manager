package com.example.filesynchronizer;

import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.widget.ArrayAdapter;
import android.widget.ListView;
import java.util.ArrayList;

public class MainActivity extends AppCompatActivity {

    ListView fileList;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        fileList= (ListView) findViewById(R.id.fileList);

        ArrayList<String> files = new ArrayList<>();

        files.add("file1");
        files.add("file2");
        files.add("file3");
        files.add("file4");
        files.add("file5");
        files.add("file6");


        ArrayAdapter filesAdapter=new ArrayAdapter(this,android.R.layout.simple_list_item_1,files);

        fileList.setAdapter(filesAdapter);




    }
}
