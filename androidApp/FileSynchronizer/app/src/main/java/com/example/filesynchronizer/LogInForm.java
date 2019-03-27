package com.example.filesynchronizer;

import android.Manifest;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.StrictMode;
import android.support.v4.app.ActivityCompat;
import android.support.v4.content.ContextCompat;
import android.support.v7.app.AppCompatActivity;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import com.franmontiel.persistentcookiejar.PersistentCookieJar;
import com.franmontiel.persistentcookiejar.cache.SetCookieCache;
import com.franmontiel.persistentcookiejar.persistence.SharedPrefsCookiePersistor;

import java.io.IOException;

import okhttp3.CookieJar;
import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.RequestBody;

public class LogInForm extends AppCompatActivity {

    public static CookieJar cookieJar;
    SharedPreferences savedState;
    SharedPreferences savedUsername;
    SharedPreferences savedPassword;


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_log_in_form);

        cookieJar = new PersistentCookieJar(new SetCookieCache(), new SharedPrefsCookiePersistor(getApplicationContext()));



        StrictMode.ThreadPolicy policy = new StrictMode.ThreadPolicy.Builder().permitAll().build();
        StrictMode.setThreadPolicy(policy);


        String[] permissions = {Manifest.permission.READ_EXTERNAL_STORAGE, Manifest.permission.WRITE_EXTERNAL_STORAGE, Manifest.permission.INTERNET};

        if (ContextCompat.checkSelfPermission(this.getApplicationContext(), permissions[0]) == PackageManager.PERMISSION_GRANTED &&   //check weather the app has permissions to read/write on the phone storage
                ContextCompat.checkSelfPermission(this.getApplicationContext(), permissions[1]) == PackageManager.PERMISSION_GRANTED &&
                ContextCompat.checkSelfPermission(this.getApplicationContext(), permissions[2]) == PackageManager.PERMISSION_GRANTED
        ) {
            logIn();


        } else {
            ActivityCompat.requestPermissions(LogInForm.this, permissions, 1);  //ask permission from user to access phone storage
            logIn();

        }

        Button registerButton=(Button) findViewById(R.id.registerButton);

        registerButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(LogInForm.this, RegisterForm.class);
                startActivity(intent);
                finish();
            }
        });

        savedState = getSharedPreferences("login",MODE_PRIVATE);     //get logged state
        savedUsername = getSharedPreferences("username",MODE_PRIVATE);  //get logged username
        savedPassword = getSharedPreferences("password",MODE_PRIVATE);  //get logged password

        if(savedState.getBoolean("logged",false)){    //check if user is logged in
            String url = "http://18.130.64.155/user/login";
            OkHttpClient okHttpClient = new OkHttpClient.Builder()    //make request to get the active session cookie
                    .cookieJar(cookieJar)
                    .build();

            RequestBody requestBody = new MultipartBody.Builder()
                    .setType(MultipartBody.FORM)
                    .addFormDataPart("username",savedUsername.getString("username",""))
                    .addFormDataPart("password", savedPassword.getString("password",""))
                    .build();

            okhttp3.Request request = new okhttp3.Request.Builder()
                    .url(url)
                    .post(requestBody)
                    .build();

            okhttp3.Response response = null;

            try {
                response = okHttpClient.newCall(request).execute();        // execute the request

                Intent intent = new Intent(LogInForm.this, MainActivity.class);       //open the main activity page
                startActivity(intent);
                finish();

            } catch (IOException e) {
                Toast.makeText(getApplicationContext(), "Error connecting to the server please try again", Toast.LENGTH_LONG).show();
                e.printStackTrace();
            }
       }



    }

    //action to perform when user clicks login
    public void logIn(){
        Button loginButton=(Button) findViewById(R.id.loginButton);

        loginButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {


        EditText usernameText=(EditText) findViewById(R.id.username);    //get username from textbox
        EditText passwordText=(EditText) findViewById(R.id.password);    //get password from textbox

        String username=usernameText.getText().toString();
        String password=passwordText.getText().toString();




                String url = "http://18.130.64.155/user/login";


               //execute login request


                OkHttpClient okHttpClient = new OkHttpClient.Builder()
                        .cookieJar(cookieJar)
                        .build();

                RequestBody requestBody = new MultipartBody.Builder()
                        .setType(MultipartBody.FORM)
                        .addFormDataPart("username",username)
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

                    if (contents.contains("\"success\":true")){     //check if login is successfull
                        Intent intent = new Intent(LogInForm.this, MainActivity.class);
                        startActivity(intent);
                        savedState.edit().putBoolean("logged",true).apply();    //make state as logged
                        savedUsername.edit().putString("username",username).apply();   //save logged username
                        savedPassword.edit().putString("password",password).apply();   //save logged password
                        finish();


                    }
                    else {
                        Toast.makeText(getApplicationContext(), "Wrong Username or Password", Toast.LENGTH_LONG).show();
                        Log.d("response",contents);

                    }



                } catch (IOException e) {
                    Toast.makeText(getApplicationContext(), "Error connecting to the server please try again", Toast.LENGTH_LONG).show();
                    e.printStackTrace();
                }
            }
        });

    }

    public void updateInfoOnLogin(){

    }



}
