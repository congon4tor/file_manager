# Documentation for file_manager server API

## 1. Get file information

### Description
This function is used by the client when they want the latest information about the files stored in the server so they can update their views to show the user the current state of their files.

### Request
* Route: /file/getInfo
* Method: GET
* Parameters: 

    | Parameter     | Description           | Type  | Values    |
    | ---           | ---                   | ---   | ---       |
    | `filename`        | Filename of the file the client wants to get information about. If ignored the information of all the files will be returned. | Text | Filename |

### How it works
This function returns a JSON with a boolean `success` and a JSON array `files` which contains all the file information. The parameter `filename` can be used as a filter to specify one file. If there are no files, `files` will be `[]`. In case of an error the server will respond with the appropriate HTTP error code and a JSON with `success` and a message `error` describing what the error was.

## 2. Push file changes

### Description
This function is used by the clients when they want to save the changes made to a file in their local machine. This includes creation of new files, modification of existing files and deletion of existing files. In the case of modification or deletion of the file, the file must be in the last version. If it is not the last version it will return an error indicationg a conflict.

### Request
* Route: /file/push
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

## 2. Download file

### Description
This function is used by the clients when they want to download the latest version of a file to their local machine.

### Request
* Route: /file/getFile
* Method: GET 
* Parameters: 

    | Parameter     | Description           | Type  | Values    |
    | ---           | ---                   | ---   | ---       |
    | `filename`    | The name of the file to be downloaded | Text | Filename |

### How it works
This function searches for a file in the database with the provided `filename` if it exists it will return the file to the client.