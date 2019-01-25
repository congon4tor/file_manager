var app = angular.module('app', ['ngRoute']);
const { remote } = require('electron');

app.config(function ($routeProvider) {
    $routeProvider.when('/', {
        templateUrl: `${__dirname}/components/home/home.html`,
        controller: 'homeCtrl'
    }).otherwise({
        template: '404 bro'
    })
});

app.controller('headCtrl', function ($scope) {
    var win = remote.getCurrentWindow();
    $scope.close = function () {
        win.close();
    };
    $scope.max = function () {
        win.isMaximized() ? win.unmaximize() : win.maximize();
    };
    $scope.min = function () {
        win.minimize();
    };
});

app.controller('homeCtrl', function ($scope) {

});

//     $scope.imagePath = image.getImagePath();

//     // var files = [];
//     // fs.readdir('.', (err, dir) => {
//     //     for (var i = 0, path; path = dir[i]; i++) {
//     //             files.push(path); 
//     //     }
//     // });
    
//     // $scope.files=files;
//     // console.log($scope.files);
// });
