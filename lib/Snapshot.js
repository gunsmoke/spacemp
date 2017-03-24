Snapshot = Class.extend({
	clock: 0,
	objects: [],
	size: null,
	init: function(data){
		var tick32Array = new Float32Array(data.buffer);
		// TODO: REMOVE THIS
		this.calculateSize(tick32Array);
		this.clock = tick32Array[0]; // tick
		this.objects = new Array();
		// objects iteration
		var float32Array = new Float32Array(data.buffer, 4);
		var obj;
		var _vpo = 4;
		for (var i = 0; i < float32Array.length; i++) {
			if(i%_vpo == 0){
				obj = {
					id: float32Array[i],
					position: new b2Vec2(0, 0),
					orientation: 0,
					velocity: null
				}
			}
			if(i%_vpo == 1){
				obj.position.x = float32Array[i];
			}
			if(i%_vpo == 2){
				obj.position.y = float32Array[i]
			}
			// LAST
			if(i%_vpo == 3){
				obj.orientation = float32Array[i];
				this.objects.push(obj);
			}
			
		}
	},
	formatBytes: function(bytes,decimals) {
	   if(bytes == 0) return '0 Byte';
	   var k = 1000;
	   var dm = decimals + 1 || 3;
	   var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	   var i = Math.floor(Math.log(bytes) / Math.log(k));
	   return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
	},
	calculateSize: function(arr){
		this.size = this.formatBytes(arr.length);
	},
});

if (typeof window === 'undefined') module.exports = Snapshot;