# Documentation for file_manager server API
***
## 1. Push file changes

### Description
This function is used by the clients when they want to save the changes made to a file in their local machine. this includes creation of new files, modification of existing files and deletion of existing files. In the case of modification or deletion of the file, the file must be in the last version. If it is not the last version it will return an error indicationg a conflict.

### Request
* Method: POST 
* Parameters: 

    | Parameter     | Description           | Type  | Values    |
    | ---           | ---                   | ---   | ---       |
    | `file`        | File the client wants to upload | File | File |
    | `version`     | Current version of the file used to check for conflicts | Text | Version number |
    | `delete`      | If `file` was not specified it indicates delete mode | Text | {"true", "false"} (if "true" `file` must not be passed) |
    | `filename`    | The name of the file to be deleted id `delete` is `true` | Text | Filename |

### How it works
If `file` is passed the filename of that file will be checked to see if there is information about the file in the database. If there is no file information stored with that filename the file will be saved in the directory and the file information saved in the database and the server will respond with a success message including the information of the file. If there is a file with that filename, a hash of the file will be calculated and compared with the one stored in the database to see if the file has changed. If the file has not changed the server will respond with an error stating that the file has not been modified. On the other hand if the file has changed the `version` will be checked to see if the file was the last version. If it is not the last version this means that the file has changed since the user downloaded it and therefore updating it would create a conflict in the file. In this case the server will respond with an error indicating there is a version conflict. If the `version` was the last version then the file will be updated in the directory and the information updated in the database.

If `file` was not passed the `delete` parameter will be checked to see if the client wants to delete a file. If it not equal to "true" the server will respond with an error indicating that the user did not include `file`. If `delete` is "true" the server will check if there is information of a file with filename equal to `filename` and if `version` is the last version. If there is information will be deleted from the database and the file deleted from the directory. A response will be sent indicating if the file was deleted successfully. 

***
## 2.