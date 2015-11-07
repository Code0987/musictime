torrentStream = require("torrent-stream");
http = require('http');
fs = require("fs");
path = require('path');

var playing = -1;
var engine;

http.createServer(function(req, res) {
  var file = engine.files[req.url.replace("/", "")];

  console.log('filename:', file.name);
  var stream = file.createReadStream();

  /*// This will wait until we know the readable stream is actually valid before piping
  stream.on('open', function () {
    // This just pipes the read stream to the response object (which goes to the client)
    stream.pipe(res);
  });*/


  // This will wait until we know the readable stream is actually valid before piping
  stream.on('readable', function () {
    // This just pipes the read stream to the response object (which goes to the client)
    res.write(stream.read());
  });


  // This catches any errors that happen while creating the readable stream (usually invalid names)
  stream.on('error', function(err) {
    res.end(err);
  });
}).listen(8080);

soundManager.setup({
  onready: function() {
    var mySound = soundManager.createSound({
      id: 'aSound',
      url: 'http://localhost:8080/0'
    });
  }
});

angular.module('org.nemanjan00.musictime', [])
.controller("Test", function($scope, $http, $timeout){
	engine = torrentStream('magnet:?xt=urn:btih:c8b34f885e7e588ad95a5ca92f758a13f7c8f67e&dn=Dubioza+kolektiv+-+Happy+Machine+%28EP%29+2014&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Fopen.demonii.com%3A1337&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Fexodus.desync.com%3A6969');

	$scope.songs = [];
	$scope.status = "play";


	engine.on('ready', function() {
		var scope = angular.element(document.getElementsByClassName("window")[0]).scope();
		
		engine.files.forEach(function(file) {	
			file.active = "";

			scope.$apply(function(){
				scope.songs.push(file);
			});
		});

		$timeout(function () { $scope.play(0); } , 0);
	});

	engine.listen();

	$scope.toggle = function(){
		if(playing !== -1){
			sound = soundManager.getSoundById("song"+playing);

			if(sound.paused === true){
				sound.resume();

				$scope.status = "pause";
			}
			else
			{
				sound.pause();

				$scope.status = "play";
			}
		}	
	}

	$scope.next = function(){
		$scope.play(playing + 1);
	}

	$scope.before = function(){
		$scope.play(playing - 1);
	}

	$scope.play = function(id){	
		if(playing !== -1){
			$scope.songs[playing].active = "";
			soundManager.getSoundById("song"+playing).stop();
		}

		$scope.songs[id].active = "active";

		mySong = soundManager.createSound({
			id: "song"+id,
			url: 'http://localhost:8080/'+id
		});

		mySong.play({onfinish:$scope.next});

		playing = id;

		if($scope.songs[playing+1] !== undefined){
			$scope.songs[playing+1].select();
		}

		$scope.status = "pause";
	};
});
