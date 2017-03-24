var is_server = false;
if (typeof window === 'undefined'){
var crypto = require('crypto');
var is_server = true;
};

NetworkAdapter = Class.extend({
	input: {},
	init: function(io, game){
		this.io = io;
		this.socket = null;
		this.game = game;
		this.player_last_id = 1;
		// init network
		if(is_server){
			this.setupServerNetwork();
		} else {
			this.setupClientNetwork();
			this.setupInputBuffer();
		}
	},
	emit: function(name, data){
		this.io.sockets.emit(name, data);
	},
	setupInputBuffer: function(){
		// TODO: the input should be an Network Object
		this.input.bufArr = new ArrayBuffer(16);
		this.input.bufIntView = new Uint8Array(this.input.bufArr, 0, 4);
		this.input.bufFloatView = new Float32Array(this.input.bufArr, 8)
	},
	setupClientNetwork: function(){
		console.log("OK")
		this.socket = this.io('http://localhost:8080');
		var _self  = this;
		this.socket.on('connected', function(data){
			setTimeout(function(){
				_self.socket.emit('join', data);
			}, 100);
		});

		this.socket.on('spawn', function(data){
			_self.game.setPlayer(data.id, data.token);

			for (var i = data.players.length - 1; i >= 0; i--) {
				game.addPlayer(data.players[i]);
			}
		});

		this.socket.on('player_joined', function(data){
			_self.game.addPlayer(data.id);
		});

		this.socket.on('destroy', function(data){
			_self.game.removePlayer(data.player_id);
		});

		this.socket.on('snapshot', function(data){
			_self.game.addSnapshot(data);
		});
	},
	setupServerNetwork: function(){
		var _self  = this;

		this.io.on('connection', function (socket) {
			console.log("Player connected");
			var md5 = crypto.createHash('md5');
			md5.update(_self.player_last_id + "-" + socket.id);
			var socket_session_token = md5.digest('hex');
			setTimeout(function(){
				//create a session id unique for this socket
				socket.emit('connected', {session: socket_session_token});
			}, 100);

			// on Join
			socket.on('join', function(data){
				if(data.session==socket_session_token){
					_self.player_last_id = (_self.player_last_id + 1);

					_self.game.addPlayer(socket.id, _self.player_last_id, socket_session_token);

					socket.emit('spawn', {id: _self.player_last_id, token: socket_session_token, players: _self.game.getPlayersIds(_self.player_last_id)});
					socket.broadcast.emit('player_joined', {id: _self.player_last_id});
				}
			});

			// on Command
			socket.on('command', function(data){
				_self.game.updatePlayerBuffer(socket.id, data.buffer);
			});

			// on Disconnect
			socket.on('disconnect', function(){
				console.log("Player disconnected");
				var player = _self.game.getPlayer(socket.id);
				_self.game.removePlayer(socket.id);
				if(player!=undefined){
					_self.emit('destroy', { player_id: player.id });
				}
			});

		// end connection
		});
	},
	sendClientCommand: function(){
		this.socket.emit('command', { buffer: this.input.bufArr });
	}
});

if (typeof window === 'undefined') module.exports = NetworkAdapter;