package com.example.filesynchronizer;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.StrictMode;
import android.support.v4.app.ActivityCompat;
import android.support.v4.content.ContextCompat;
import android.support.v7.app.AppCompatActivity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import java.io.IOException;

import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.RequestBody;

public class RegisterForm extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_register_form);

        StrictMode.ThreadPolicy policy = new StrictMode.ThreadPolicy.Builder().permitAll().build();
        StrictMode.setThreadPolicy(policy);

        String[] permissions = {Manifest.permission.READ_EXTERNAL_STORAGE, Manifest.permission.WRITE_EXTERNAL_STORAGE, Manifest.permission.INTERNET};

        if (ContextCompat.checkSelfPermission(this.getApplicationContext(), permissions[0]) == PackageManager.PERMISSION_GRANTED &&   //check weather the app has permissions to read/write on the phone storage
                ContextCompat.checkSelfPermission(this.getApplicationContext(), permissions[1]) == PackageManager.PERMISSION_GRANTED &&
                ContextCompat.checkSelfPermission(this.getApplicationContext(), permissions[2]) == PackageManager.PERMISSION_GRANTED
        ) {
            register();


        } else {
            ActivityCompat.requestPermissions(RegisterForm.this, permissions, 1);  //ask permission from user to access phone storage
            register();

        }
    }

    public void register(){


        Button registerButton=(Button) findViewById(R.id.submitButton);

        registerButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {

                OkHttpClient okHttpClient = new OkHttpClient();


                EditText usernameText=(EditText) findViewById(R.id.username);
                EditText passwordText=(EditText) findViewById(R.id.password);
                EditText confirmPasswordText=(EditText) findViewById(R.id.confirmPassword);

                String username=usernameText.getText().toString();
                String password=passwordText.getText().toString();
                String confirmPassword=confirmPasswordText.getText().toString();

               if (password.equals(confirmPassword)) {


                   String url = "http://10.0.2.2:3000/user/signup";

                   RequestBody requestBody = new MultipartBody.Builder()
                           .setType(MultipartBody.FORM)
                           .addFormDataPart("username", username)
                           .addFormDataPart("password", password)
                           .build();

                   okhttp3.Request request = new okhttp3.Request.Builder()
                           .url(url)
                           .post(requestBody)
                           .build();

                   okhttp3.Response response = null;

                   try {
                       response = okHttpClient.newCall(request).execute();        // execute the request

                       String contents = response.body().string();

                       //get the response contents

                       if (contents.contains("\"success\":true")) {
                           Intent intent = new Intent(RegisterForm.this, LogInForm.class);
                           startActivity(intent);

                       } else {
                           Toast.makeText(getApplicationContext(), "Something went wrong", Toast.LENGTH_LONG).show();

                       }


                   } catch (IOException e) {
                       Toast.makeText(getApplicationContext(), "Error connecting to the server please try again", Toast.LENGTH_LONG).show();
                       e.printStackTrace();
                   }
               }
               else {
                   Toast.makeText(getApplicationContext(), "The two passwords do not match", Toast.LENGTH_LONG).show();

               }
            }
        });

    }
}
