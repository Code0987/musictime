torrentStream = require("torrent-stream");
http = require('http');
fs = require("fs");
path = require('path');
pump = require('pump');
var rangeParser = require('range-parser');

var magnet = "";

tpb = require("thepiratebay");

var extensions = [".mp3", ".mp4", ".ogg", ".opus", "wav"];

var volume = 100;

var playing = -1;
var engine;

function pad(num, size) {
	var s = num+"";
	while (s.length < size) s = "0" + s;
	return s;
}

// Check for update

var https = require('https');

https.get('https://raw.githubusercontent.com/nemanjan00/musictime/master/public/updater.json', function(res) {
	res.on('data', function(d) {
		var updater = require('./updater.json');
    
		if(JSON.parse(new Buffer(d).toString('ascii')).version != updater.version){
			alert("Please, install update! ");
		}
	});
}).on('error', function(e) {
	console.error(e);
});

soundManager.setup();

// Create server

http.createServer(function(request, response) {
	var file = engine.files[request.url.replace("/", "")];

	if (request.method === 'OPTIONS' && request.headers['access-control-request-headers']) {
		response.setHeader('Access-Control-Allow-Origin', request.headers.origin);
		response.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
		response.setHeader('Access-Control-Allow-Headers', request.headers['access-control-request-headers']);
		response.setHeader('Access-Control-Max-Age', '1728000');

		response.end();
		return
	}

	if (request.headers.origin) response.setHeader('Access-Control-Allow-Origin', request.headers.origin);

	var range = request.headers.range;
	range = range && rangeParser(file.length, range)[0];
	response.setHeader('Accept-Ranges', 'bytes');
	//response.setHeader('Content-Type', getType(file.name));
	response.setHeader('transferMode.dlna.org', 'Streaming');
	response.setHeader('contentFeatures.dlna.org', 'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=017000 00000000000000000000000000');
	if (!range) {
		response.setHeader('Content-Length', file.length);
		if (request.method === 'HEAD') return response.end();
		pump(file.createReadStream(), response);
		return;
	}

	response.statusCode = 206;
	response.setHeader('Content-Length', range.end - range.start + 1);
	response.setHeader('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + file.length);
	if (request.method === 'HEAD') return response.end();
	pump(file.createReadStream(range), response);
  
}).listen(8080);

angular.module('org.nemanjan00.musictime.controllers', ['ui.bootstrap', 'ui.bootstrap-slider'])
.controller("Player", function($scope, $interval, $timeout, $location){
	console.log(magnet);
	
	engine = torrentStream(magnet);

	$('.volume').popover({html: true});

	$scope.volume = {};
	$scope.volume.templateurl = "volumetemplate.html";
	$scope.volume.value = volume;

	$scope.songs = [];
	$scope.status = "play";

	$scope.slider = "50";

	engine.on('ready', function() {
		var scope = angular.element(document.getElementsByClassName("window")[0]).scope();

		var files = engine.files;
		//files = files.sort(function(a, b){return a.path.localeCompare(b.path);});

		console.log(files[0].name);

		files.forEach(function(file, id) {	
			file.active = "";
			file.id = id;

			scope.$apply(function(){
				if(extensions.indexOf(path.extname(file.name.toLowerCase())) !== -1){
					scope.songs.push(file);
				}
			});
		});

		$timeout(function () { $scope.play(0); } , 0);
	});

	engine.listen();

	$scope.gohome = function() {	
		$location.path('/app/search');
	}

	$scope.safeApply = function() {
		var phase = this.$root.$$phase;
		if(!(phase == '$apply' || phase == '$digest')) {
			this.$apply();
		}
	};
	
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
		if($scope.songs[playing+1] !== undefined){
			$scope.play(playing + 1);
		}
		else
		{
			$scope.play(0);
		}
	}

	$scope.back = function(){
		if($scope.songs[playing-1] !== undefined){
			$scope.play(playing - 1);
		}
		else
		{
			$scope.play($scope.songs.length - 1);
		}
	}

	$scope.play = function(id){	
		if(playing !== -1){
			$scope.songs[playing].active = "";
			soundManager.getSoundById("song"+playing).stop();
		}

		$scope.songs[id].active = "active";

		$scope.safeApply();

		while(soundManager.getSoundById("song"+id) !== undefined){
			soundManager.destroySound("song"+id);
		}

		mySong = soundManager.createSound({
			id: "song"+id,
			url: 'http://localhost:8080/'+$scope.songs[id].id
		});

		mySong.play({onfinish:$scope.next});

		playing = id;

		if($scope.songs[playing+1] !== undefined){
			$scope.songs[playing+1].select();
		}

		$scope.status = "pause";
	};

	$scope.setvolume = function(){
		soundManager.setVolume($scope.volume.value);

		volume = $scope.volume.value;
	}

	$scope.repeat = function(){
		$scope.slider = soundManager.getSoundById("song"+playing).position / soundManager.getSoundById("song"+playing).duration * 100;	

		$scope.current = {};

		$scope.current.mins = pad(Math.floor(Math.floor(soundManager.getSoundById("song"+playing).position/1000)/60), 2);
		$scope.current.secs = pad(Math.floor(soundManager.getSoundById("song"+playing).position/1000) - Math.floor(Math.floor(soundManager.getSoundById("song"+playing).position/1000)/60)*60, 2);

		$scope.total = {};

		$scope.total.mins = pad(Math.floor(Math.floor(soundManager.getSoundById("song"+playing).duration/1000)/60), 2);
		$scope.total.secs = pad(Math.floor(soundManager.getSoundById("song"+playing).duration/1000) - Math.floor(Math.floor(soundManager.getSoundById("song"+playing).duration/1000)/60)*60, 2);

		$scope.setvolume();
	};

	$scope.move = function(){
		soundManager.getSoundById("song"+playing).setPosition($scope.slider/100*soundManager.getSoundById("song"+playing).duration);	
		$scope.repeat();
	};

	$interval($scope.repeat, 1000);
})

.controller("Search", function($scope, $interval, $timeout, $location){
	$scope.safeApply = function() {
		var phase = this.$root.$$phase;
		if(!(phase == '$apply' || phase == '$digest')) {
			this.$apply();
		}
	};

	$scope.search = function () {
		tpb.search($scope.songname, {
			category: '101'
		}).then(function(results){
			$scope.results = results;
			console.log(results);

			$scope.safeApply();
		}).catch(function(err){
			console.log(err);
		});
	}

	$scope.play = function (torrent) {
		magnet = torrent;

		console.log(magnet);

		$location.path('/app/player');
	}
});

