var app = require('http').createServer(handler)
var io = require('socket.io')(app);
var fs = require('fs');
var Box2D = require("box2dweb");
var GameEngine = require('./lib/GameEngine.js');

app.listen(8080);

function handler (req, res) {
	file = '/index.html';
  if(req.url=="/?app=1"){
  	file = '/app.html';
  }
  fs.readFile(__dirname + file,
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}

var game = new GameEngine({
    server: io
});

setInterval(function(){
	game.update();
}, 1000 / 60)

setInterval(function(){
	game.updateSnapshot();
}, 1000 / 60)