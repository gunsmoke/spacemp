var http = require('http'), io = require('socket.io'), sys = require("util"), fs = require('fs');

var Box2D = require('C:/Users/slave/Documents/Projects/spacemp/box2d.js');

eval(fs.readFileSync('common.js') + '');

var clients = [];

function update() {
	world.Step(1 / 60, 10, 10);
	world.ClearForces();
}
setInterval(update, 1000 / 60);

function jointsToClients(data) {
	for (var i = 0; i < clients.length; i++) {
		clients[i].send(data);
	}
}

setupWorld();

// SOCKETS

var server = http.createServer(
	function(req, res){
		res.writeHead(200, {'Content-Type': 'text/html'}); 
		res.end('<h1>Hello world</h1>'); 
	}
);
server.listen(xport, "127.0.0.1");

var socket = io.listen(server);

socket.on('connection', function(client) {
	clients.push(client);
	console.log("Total clients: " + clients.length);
	
	client.send({"startId" : clients.length});

	client.on('message', function(data){

		if (data.hasOwnProperty("destroyId")) {
			deleteJoint(data.destroyId);
			console.log('destroyed');		
		} else {
			updateJoints(data);	
		}

		jointsToClients(data);
	});

	client.on('disconnect', function(){
		console.log("disconnect");		
	}); 
});
