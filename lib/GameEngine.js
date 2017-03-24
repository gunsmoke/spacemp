var is_server = false;
if (typeof window === 'undefined'){
var Class = require("./Class.js")
var Network = require("./NetworkAdapter.js")
var input_engine = require("./InputEngine.js");
var Box2D = require("box2dweb");
var is_server = true;
}
// Box2D variables
var   b2Vec2 = Box2D.Common.Math.b2Vec2
	  b2Transform = Box2D.Common.Math.b2Transform
      b2AABB = Box2D.Collision.b2AABB
      b2BodyDef = Box2D.Dynamics.b2BodyDef
      b2Body = Box2D.Dynamics.b2Body
      b2FixtureDef = Box2D.Dynamics.b2FixtureDef
      b2Fixture = Box2D.Dynamics.b2Fixture
      b2World = Box2D.Dynamics.b2World
      b2MassData = Box2D.Collision.Shapes.b2MassData
      b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
      b2CircleShape = Box2D.Collision.Shapes.b2CircleShape
      b2MouseJointDef =  Box2D.Dynamics.Joints.b2MouseJointDef
      b2RayCastInput = Box2D.Collision.b2RayCastInput
      b2RayCastOutput = Box2D.Collision.b2RayCastOutput;
      b2DebugDraw = Box2D.Dynamics.b2DebugDraw

var VectorUtils = Class.extend({
	pos: function(a) { return {x:a.x,y:a.y}; },
	plerp: function(p, n, t) { var _t = Number(t); _t = (Math.max(0, Math.min(1, _t))); return (p + _t * (n - p)); },
	lerp: function(v, tv, t) { return { x: this.plerp(v.x, tv.x, t), y: this.plerp(v.y, tv.y, t) }; }, 
});
var Vectors = new VectorUtils();

var GameEngine = Class.extend({
	init: function(options){

		if(is_server){
			console.log("Game running on Server");
			if(options.server==undefined) throw "Require network server adapter"
			this.network = new NetworkAdapter(options.server, this);
		} else {
			console.log("Game running on Client");
			if(options.client==undefined) throw "Require network client adapter"
			this.network = new NetworkAdapter(options.client, this);
		}

		this.scene = {
			height: 800,
			width: 1000,
			scale: 30
		}

		// set show_ghosts
		this.show_ghosts = false;
		if(options.show_ghosts!=undefined) this.show_ghosts = options.show_ghosts;

		// set client_smoothing
		this.client_smoothing = true;
		if(options.client_smoothing!=undefined) this.client_smoothing = options.client_smoothing;

		this.socketIndex = {};
		this.players = {};
		this.players_len = 0;
		this.player = null;
		this.max_speed = 400/this.scene.scale;
		this.speed = 25/this.scene.scale;
		this.input_delay = 0;
		this.input_changed = false;
		this.world = this.setupWorld();
		this.snapshot_buffer = new Array();

		this.clock = 0.016 //The local timer
        this._dt = new Date().getTime();    //The local timer delta
        this._dte = new Date().getTime();   //The local timer last frame time

		// INPUTS
		if(!is_server){
			this.clientBindings();
			window.addEventListener('keydown', this.keydown, false);
    		window.addEventListener('keyup', this.keyup, false);
    		window.addEventListener('mousemove', this.mousemove, false);
		}

		this.startClock();
	},
	startClock: function(){
		setInterval(function(){
	        this._dt = new Date().getTime() - this._dte;
	        this._dte = new Date().getTime();
	        this.clock += this._dt/1000.0;
	    }.bind(this), 4);
	},
	setPlayer: function(id, token){
		this.player = this.addPlayer(id, id, token);
	},
	addPlayer: function(socket, id, token){
		if(id==undefined) id=socket; // if id is not provided, set it as token
		this.socketIndex[socket] = id;
		this.players[id] = {
			id: id,
			token: token,
			buffer: null,
			physBody: this.createBox(this.world, this.scene.width/2, this.scene.height/2, 12, 20, false),
			ghost: { position: {x: 0, y: 0}, orientation: Math.PI }
		}
		this.players_len++;
		return this.players[id];
	},
	updatePlayerBuffer: function(socket, data){
		this.players[this.socketIndex[socket]].buffer = data;
		return this.players[this.socketIndex[socket]];
	},
	getPlayersLength: function(){
		return this.players_len;
	},
	getPlayer: function(socket){
		return this.players[this.socketIndex[socket]];
	},
	getPlayers: function(){
		return this.players;
	},
	getPlayersIds: function(exclude){
		var ids = new Array();
		for(player in this.socketIndex){
			if(exclude!=undefined){
				if(exclude==this.socketIndex[player]) continue;
			}
			ids.push(this.socketIndex[player])
		}
		return ids;
	},
	removePlayer: function(socket){
		if(this.players[this.socketIndex[socket]]==undefined) return;
		if(this.players[this.socketIndex[socket]].physBody!=null) this.world.DestroyBody(this.players[this.socketIndex[socket]].physBody);	
		// todo: REMOVE THIS
		if(!is_server) $("#obj"+this.players[this.socketIndex[socket]].id).remove();
		delete this.players[this.socketIndex[socket]];
		delete this.socketIndex[socket];
		this.players_len--;
		return null;
	},
	setupWorld: function(){
		var world = new b2World(new b2Vec2(0, 0), true);
		// LEFT
		this.createStaticBox(world, 0, this.scene.height/2, 5, this.scene.height/2);
		// RIGHT
		this.createStaticBox(world, this.scene.width, this.scene.height/2, 5, this.scene.height/2);
		// GROUND
		this.createStaticBox(world, this.scene.width/2, this.scene.height, this.scene.width/2,5);
		// CEILING
		this.createStaticBox(world, this.scene.width/2, 0, this.scene.width/2, 5);
		return world;
	},
	createStaticBox: function(world, x, y, width, height) {
		var fixDef = new b2FixtureDef;
		fixDef.density = 1.0;
		fixDef.friction = 0.5;
		fixDef.restitution = 0.2;
		fixDef.shape = new b2PolygonShape;
		fixDef.shape.SetAsBox(width/this.scene.scale, height/this.scene.scale);

		var bodyDef = new b2BodyDef;
		bodyDef.type = b2Body.b2_staticBody;
		bodyDef.position.x = x/this.scene.scale;
		bodyDef.position.y = y/this.scene.scale;

		var wb = world.CreateBody(bodyDef);
		wb.CreateFixture(fixDef);
		return wb;
	},
	createBox: function(world, x, y, width, height, allowSleep) {
		var fixDef = new b2FixtureDef;
		fixDef.density = 1.0;
		fixDef.friction = 0.5;
		fixDef.restitution = 0.2;
		fixDef.shape = new b2PolygonShape;
		fixDef.shape.SetAsBox(width/this.scene.scale, height/this.scene.scale);

		var bodyDef = new b2BodyDef;
		bodyDef.type = b2Body.b2_dynamicBody;
		bodyDef.position.x = x/this.scene.scale;
		bodyDef.position.y = y/this.scene.scale;

		bodyDef.allowSleep = allowSleep;
		var wb = world.CreateBody(bodyDef);
		wb.CreateFixture(fixDef);
		return wb;
	},
	addSnapshot: function(data){
		var snapshot = this.createSnapshot(data);
		// update Clock from snapshot
		this.clock = snapshot.clock - 100/1000;
		this.snapshot_buffer.push(snapshot);
		if(this.snapshot_buffer.length >= 6) {
            this.snapshot_buffer.splice(0,1);
        }
	},
	createSnapshot: function(data){
		return new Snapshot(data);
	},
	updateSnapshot: function(){
		if(!is_server) return;
		var players_len = this.getPlayersLength();
		if(players_len<=0) return;
		var players = this.getPlayers();
		var bufArr = new ArrayBuffer(4+((players_len*4)*4));

	    var bufView = new Float32Array(bufArr);
	    var pos = 0;
	    bufView[pos] = this.clock;
	    pos++;
	    for(player in players){
			if(players[player].physBody != null){
	    		var position = players[player].physBody.GetPosition();
	    		var orientation = players[player].physBody.GetAngle();
	    	} else {
	    		var position = {x: 0.0, y: 0.0};
	    		var orientation = Math.PI;
	    	}
	    	bufView[pos] = players[player].id;
	    	pos++;
	    	// POSITION
	    	bufView[pos] = position.x;
	    	pos++;
	    	bufView[pos] = position.y;
	    	pos++;
	    	// ORIENTATION
	    	bufView[pos] = orientation;
	    	pos++;
	    	// VELOCITY ???
	    }
	    // send over network
	    this.network.emit('snapshot', { buffer: bufArr });
	},
	debugRender: function(){
		var players = this.getPlayers();
	    if(this.show_ghosts){
		    // update the render
		    for(player in players){

		    	obj = $("#obj" + player);
		    	if(obj.length==0){
	    			obj = $('<div id="obj'+player+'" class="entity"></div>');
	    			$("body").append(obj);
	    		}
		    	obj.css('left', players[player].ghost.position.x*30);
		    	obj.css('top', players[player].ghost.position.y*30);
		    	//console.log(players[player].orientation)
		    	var orientation = players[player].ghost.orientation;
		    	obj.css('transform', 'rotate('+orientation+'rad)');
		    }
		}

		$(".debug-text").text(this.clock.toFixed(2));
		this.world.DrawDebugData();
	},
	interpolate_snapshots: function(){
		// clock gui
		if(!this.snapshot_buffer.length) return;

		var current_time = this.clock;
	    var count = this.snapshot_buffer.length-1;
	    var target = null;
	    var previous = null;

	    var _pdt = this._dt/200.0; // this factor should be related to the latency for this client
	    var pdt_mult = 16;
		var target_time = 0.016;

		//We look from the 'oldest' updates, since the newest ones
		//are at the end (list.length-1 for example). This will be expensive
		//only when our time is not found on the timeline, since it will run all
		//samples. Usually this iterates very little before breaking out with a target.

		for(var i = 0; i < count; ++i) {

		    var point = this.snapshot_buffer[i];
		    var next_point = this.snapshot_buffer[i+1];
		    //Compare our point in time with the server times we have
		    if(current_time > point.clock && current_time < next_point.clock) {
		        target = next_point;
		        previous = point;
		        break;
		    }
		}

		//With no target we store the last known
		//server position and move to that instead

		if(!target) {
		    target = this.snapshot_buffer[count];
		    previous = this.snapshot_buffer[count];
		}

		if(target && previous) {

	        target_time = target.clock;
	        var difference = target_time - current_time;
	        var max_difference = (target.clock - previous.clock).toFixed(3);
	        var time_point = (difference/max_difference).toFixed(3);

	            //Because we use the same target and previous in extreme cases
	            //It is possible to get incorrect values due to division by 0 difference
	            //and such. This is a safe guard and should probably not be here. lol.
	        if( isNaN(time_point) ) time_point = 0;
	        if(time_point == -Infinity) time_point = 0;
	        if(time_point == Infinity) time_point = 0;
	            //The most recent server update
	        var latest_server_data = this.snapshot_buffer[ this.snapshot_buffer.length-1 ];
	        for (var o = 0; o < latest_server_data.objects.length; o++) {
	        	var player = this.getPlayer(latest_server_data.objects[o].id);
	        	if(player==undefined) continue;

		        	//The other players positions in this timeline, behind us and in front of us
		        var other_target_pos = target.objects[o].position;
		        var other_target_ori = target.objects[o].orientation;
		        //if(target.objects[o]==undefined) console.log(target)

		        var other_past_pos = previous.objects[o].position;
		        var other_past_ori = previous.objects[o].orientation;
		        //if(previous.objects[o]==undefined) console.log(previous.objects)

		            //update the dest block, this is a simple lerp
		            //to the target from the previous point in the server_updates buffer
		        var new_pos = Vectors.lerp(other_past_pos, other_target_pos, time_point);
				var new_ori_dir = Angles.shortestDirection(other_past_ori, other_target_ori);
		        var new_ori = Angles.lerp(other_past_ori, other_target_ori, time_point, new_ori_dir)

		        if(this.client_smoothing) {
		        	// smooth position
		        	player.physBody.SetPosition(Vectors.lerp( player.physBody.GetPosition(), new_pos, _pdt*pdt_mult));
		        	if(this.show_ghosts){
		        		player.ghost.position = Vectors.lerp( player.ghost.position, new_pos, _pdt*pdt_mult );
		        	}

		        	// smooth orientaion
					var player_dir = Angles.shortestDirection(player.physBody.GetAngle(), new_ori);
					player.physBody.SetAngle(Angles.lerp(player.physBody.GetAngle(), new_ori, _pdt*(pdt_mult/2), player_dir));

					if(this.show_ghosts){
						var player_ghost_dir = Angles.shortestDirection(player.ghost.orientation, new_ori);
						player.ghost.orientation = Angles.lerp(player.ghost.orientation, new_ori, _pdt*(pdt_mult/2), player_ghost_dir);
					}
		        } else {
		        	player.physBody.SetPosition(new_pos);
		        	player.physBody.SetAngle(other_target_ori);
		        	if(this.show_ghosts){
		        		player.ghost.position = Vectors.pos(new_pos);
		        		player.ghost.orientation = other_target_ori;
		        	}
		        }

		    }
	    } //if target && previous
	},
	update: function(){
		// input should be simulated here
		if(is_server){
			this.handleServerInteractions();
		} else {
			this.handleClientInteractions();
		}

		this.world.Step(
			1 / 60   //frame-rate
			,  10    //velocity iterations
			,  10    //position iterations
		);

		if(!is_server) this.debugRender();
		this.world.ClearForces();

		if(!is_server) input_engine.update();

		if(!is_server) this.interpolate_snapshots();
	},
	handleServerInteractions: function() {
		for(ref in this.players){
			if(this.players[ref].buffer!=null){

				var uint8Arr = new Uint8Array(this.players[ref].buffer);


				// set the player orientation based on the mouse position
				var mouseTarget = new b2Vec2(this.players[ref].buffer.readFloatLE(8), this.players[ref].buffer.readFloatLE(12));
				mouseTarget.Subtract(this.players[ref].physBody.GetPosition());
				var q = Math.atan2( -mouseTarget.x, mouseTarget.y );
				this.players[ref].physBody.SetAngle(q+Math.PI);

				this.players[ref].physBody.SetAngularVelocity(0);
				var vel = this.players[ref].physBody.GetLinearVelocity();
				// order of buffer
				// up, right, down, left
				if(uint8Arr[0]) vel.y-=this.speed;
				if(uint8Arr[2]) vel.y+=this.speed;
				if(uint8Arr[3]) vel.x-=this.speed;
				if(uint8Arr[1]) vel.x+=this.speed;

				// set max speed
				if(vel.x > this.max_speed){vel.x=this.max_speed};
				if(vel.x < -this.max_speed){vel.x=-this.max_speed};
				if(vel.y > this.max_speed){vel.y=this.max_speed};
				if(vel.y < -this.max_speed){vel.y=-this.max_speed};

				// clear the buffer
				this.players[ref].buffer = null;
			}
		}
	},
	handleClientInteractions: function() {
		if(this.player == null) return;

		var last_mouse_x = input_engine.last_mouse.x / this.scene.scale;
		var last_mouse_y = input_engine.last_mouse.y / this.scene.scale;

		// set up network input buffer
		this.network.input.bufIntView[0] = 0;
		this.network.input.bufIntView[1] = 0;
		this.network.input.bufIntView[2] = 0;
		this.network.input.bufIntView[3] = 0;
		this.network.input.bufFloatView[0] = last_mouse_x;
		this.network.input.bufFloatView[1] = last_mouse_y;

		/*
		// set the player orientation based on the mouse position
		var mouseTarget = new b2Vec2(last_mouse_x, last_mouse_y);
		mouseTarget.Subtract(this.player.physBody.GetPosition());
		var q = Math.atan2( -mouseTarget.x, mouseTarget.y ) + Math.PI;

		this.player.physBody.SetAngle(q);
		*/

		this.player.physBody.SetAngularVelocity(0);
		var vel = this.player.physBody.GetLinearVelocity();

		var action_changed = false;
		// up/down arrow
		if (input_engine.state('move-up')){
			//vel.y-=this.speed;
			this.network.input.bufIntView[0] = 1;
			action_changed = true;
		}

		if (input_engine.state('move-right')){
			//vel.x+=this.speed;
			this.network.input.bufIntView[1] = 1;
			action_changed = true;
		}
		if (input_engine.state('move-down')){
			//vel.y+=this.speed;	
			this.network.input.bufIntView[2] = 1;
			action_changed = true;
		}
		// left/right arrows
		if (input_engine.state('move-left')){
			//vel.x-=this.speed;
			this.network.input.bufIntView[3] = 1;
			action_changed = true;
		}

		// set max speed
		/*
		if(vel.x > this.max_speed){vel.x=this.max_speed};
		if(vel.x < -this.max_speed){vel.x=-this.max_speed};
		if(vel.y > this.max_speed){vel.y=this.max_speed};
		if(vel.y < -this.max_speed){vel.y=-this.max_speed};
		*/

		if(action_changed || input_engine.changed){
			this.network.sendClientCommand();
			this.input_changed = true;
		}

	},
	clientBindings: function() {
		// MOVEMENT WASD
		input_engine.bind(input_engine.KEYS.W, 'move-up');
		input_engine.bind(input_engine.KEYS.S, 'move-down');
		input_engine.bind(input_engine.KEYS.A, 'move-left');
		input_engine.bind(input_engine.KEYS.D, 'move-right');
		// MOVMENT ARROWS
		input_engine.bind(input_engine.KEYS.UP_ARROW, 'move-up');
		input_engine.bind(input_engine.KEYS.DOWN_ARROW, 'move-down');
		input_engine.bind(input_engine.KEYS.LEFT_ARROW, 'move-left');
		input_engine.bind(input_engine.KEYS.RIGHT_ARROW, 'move-right');
	},
	mousemove: function(event) {
		if (event.target.type == 'text') {return;}
		input_engine.onMouseMove(event.pageX, event.pageY, event)
	},
	keydown: function (event) {	
		if (event.target.type == 'text') {return;}
		input_engine.onKeyDownEvent(event.keyCode, event);
	},
	keyup: function (event) {
		if (event.target.type == 'text') {return;}
		input_engine.onKeyUpEvent(event.keyCode, event);
	}
});

if (typeof window === 'undefined') module.exports = GameEngine;