# Documentation for file_manager server API
***
## 1. Push file changes

This function is used by the clients when they want to save the changes made to a file in their local machine. this includes creation of new files, modification of existing files and deletion of existing files. In the case of modification or deletion of the file, the file must be in the last version. If it is not the last version it will return an error indicationg a conflict.

### Request:
* Method: POST 
* Parameter: 

| Command | Description |
| --- | --- |
| `git status` | List all *new or modified* files |
| `git diff` | Show file differences that **haven't been** staged |


***
## 2.