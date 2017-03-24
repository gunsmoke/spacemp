var app = require('http').createServer(handler)
var io = require('socket.io')(app);
var fs = require('fs');
var Box2D = require("box2dweb");
var GameEngine = require('./lib/GameEngine.js');

var game = new GameEngine();

var   b2Vec2 = Box2D.Common.Math.b2Vec2
      b2AABB = Box2D.Collision.b2AABB
      b2BodyDef = Box2D.Dynamics.b2BodyDef
      b2Body = Box2D.Dynamics.b2Body
      b2FixtureDef = Box2D.Dynamics.b2FixtureDef
      b2Fixture = Box2D.Dynamics.b2Fixture
      b2World = Box2D.Dynamics.b2World
      b2MassData = Box2D.Collision.Shapes.b2MassData
      b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
      b2CircleShape = Box2D.Collision.Shapes.b2CircleShape
      b2DebugDraw = Box2D.Dynamics.b2DebugDraw
      b2MouseJointDef =  Box2D.Dynamics.Joints.b2MouseJointDef;

// Define world
var world = new b2World(
       new b2Vec2(0, 0)     //gravity
    ,  true                 //allow sleep
 );

var fixDef = new b2FixtureDef;
	fixDef.density = 1.0;
	fixDef.friction = 0.5;
	fixDef.restitution = 0.2;

	var bodyDef = new b2BodyDef;

	//create ground
	bodyDef.type = b2Body.b2_staticBody;
	fixDef.shape = new b2PolygonShape;
	fixDef.shape.SetAsBox(20, 2);
	bodyDef.position.Set(10, 400 / 30 + 1.8);
	world.CreateBody(bodyDef).CreateFixture(fixDef);
	bodyDef.position.Set(10, -1.8);
	world.CreateBody(bodyDef).CreateFixture(fixDef);
	fixDef.shape.SetAsBox(2, 14);
	bodyDef.position.Set(-1.8, 13);
	world.CreateBody(bodyDef).CreateFixture(fixDef);
	bodyDef.position.Set(21.8, 13);
	world.CreateBody(bodyDef).CreateFixture(fixDef);

	//create some objects
	bodyDef.type = b2Body.b2_dynamicBody;
	var objects = [];
	for(var i = 0; i < 150; ++i) {
		fixDef.shape = new b2CircleShape(0.5);
		bodyDef.position.x = Math.random() * 10;
		bodyDef.position.y = Math.random() * 10;
		var object = world.CreateBody(bodyDef);
		object.CreateFixture(fixDef);
		objects.push(object);
	}


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

var images = ['test1.png', 'test2.png', 'test3.png', 'test4.png', 'test5.png'];

io.on('connection', function (socket) {
	console.log("Player connected");
});

var tick = 1;


setInterval(update, 1000 / 60);

/*
setInterval(function(){
	//console.log("send snapshot")
	//var image = images[Math.floor(Math.random()*(images.length))];
	//fs.readFile(__dirname + '/frames/' + image, function(err, buffer){
	//	//console.log(image);
	//	io.sockets.emit('image', { buffer: buffer });
	//});
	var bufArr = new ArrayBuffer(3);
    var bufView = new Uint8Array(bufArr);
    bufView[0]=Math.floor(Math.sin(tick/10) * 250);
    bufView[1]=Math.floor(Math.cos(tick/50) * 250);;
    bufView[2]=Math.floor(Math.sin(tick/100) * 250);
	io.sockets.emit('image', { buffer: bufArr });
	tick++;
}, 30)
*/

setInterval(function(){
	for (var i = 0; i < objects.length; i++) {
		var seed = Math.random();
		objects[i].ApplyImpulse(new b2Vec2(Math.cos(seed) * 10, Math.sin(seed) * 10), new b2Vec2(0, 10));
	}
}, 5000)

function update() {
    world.Step(1 / 60, 10, 10);
    world.ClearForces();
    var bufArr = new ArrayBuffer((objects.length*2)*4);
    var bufView = new Float32Array(bufArr);
    var pos = 0;
    for (var i = 0; i < objects.length; i++) {
    	var position = objects[i].GetPosition();
    	bufView[pos] = position.x;
    	pos++;
    	bufView[pos] = position.y;
    	pos++;
    }
    io.sockets.emit('image', { buffer: bufArr });
}