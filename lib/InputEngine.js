InputEngine = Class.extend({
	bindings: {},
	actions: {},
	presses: {},
	locks: {},
	delayedKeyup: [],
	isUsingKeyboard: false,
	mouse: {x:0, y:0},
	last_mouse: {x:0, y:0},
	changed: false,
	init: function () {
	},
	setup: function () {
	},
	initKeyboard: function () {
		if (this.isUsingKeyboard) {return;}
		this.isUsingKeyboard = true;
	},
	onMouseMove: function (x, y, event) {
		this.mouse.x = x;
		if(x!=this.last_mouse.x){
			this.last_mouse.x = x;
			this.changed = true;
		}

		this.mouse.y = y;
		if(y!=this.last_mouse.y){
			this.last_mouse.y = y;
			this.changed = true;
		}
	},
	onKeyDownEvent: function (keyCode, event) {
		var code = keyCode;
		var action = this.bindings[code];
		if (action) {
			this.actions[action] = true;
			this.changed = true;
			if (event && event.cancelable)
				event.preventDefault();
			if (!this.locks[action]) {
				this.presses[action] = true;
				this.locks[action] = true;
			}
		}
	},
	onKeyUpEvent: function (keyCode, event) {

		var code = keyCode;

		var action = this.bindings[code];
		if (action) {
			if (event && event.cancelable)
				event.preventDefault();
			this.delayedKeyup.push(action);
		}
	},

	bind: function (key, action) {
		this.initKeyboard();
		this.bindings[key] = action;
	},
	unbind: function (key) {
		this.bindings[key] = null;
	},
	unbindAll: function () {
		this.bindings = [];
	},
	state: function (action) {
		return this.actions[action];
	},
	clearState: function (action) {
		this.actions[action] = false;
	},
	pressed: function (action) {
		return this.presses[action];
	},
	clearPressed: function () {
		for (var i = 0; i < this.delayedKeyup.length; i++) {
			var action = this.delayedKeyup[i];
			this.actions[action] = false;
			this.locks[action] = false;
		}
		this.delayedKeyup = [];
		this.presses = {};
		this.changed = false;
	},
	clearAllState: function () {
		this.actions = {};
		this.locks = {};
		this.delayedKeyup = [];
		this.presses = {};
		this.changed = false;
	},
	update: function() {
		this.clearPressed();
	}
});

KEYS = {
	'BACKSPACE': 8,
	'TAB': 9,
	'ENTER': 13,
	'PAUSE': 19,
	'CAPS': 20,
	'ESC': 27,
	'SPACE': 32,
	'PAGE_UP': 33,
	'PAGE_DOWN': 34,
	'END': 35,
	'HOME': 36,
	'LEFT_ARROW': 37,
	'UP_ARROW': 38,
	'RIGHT_ARROW': 39,
	'DOWN_ARROW': 40,
	'INSERT': 45,
	'DELETE': 46,
	'0': 48,
	'1': 49,
	'2': 50,
	'3': 51,
	'4': 52,
	'5': 53,
	'6': 54,
	'7': 55,
	'8': 56,
	'9': 57,
	'A': 65,
	'B': 66,
	'C': 67,
	'D': 68,
	'E': 69,
	'F': 70,
	'G': 71,
	'H': 72,
	'I': 73,
	'J': 74,
	'K': 75,
	'L': 76,
	'M': 77,
	'N': 78,
	'O': 79,
	'P': 80,
	'Q': 81,
	'R': 82,
	'S': 83,
	'T': 84,
	'U': 85,
	'V': 86,
	'W': 87,
	'X': 88,
	'Y': 89,
	'Z': 90,
	'NUMPAD_0': 96,
	'NUMPAD_1': 97,
	'NUMPAD_2': 98,
	'NUMPAD_3': 99,
	'NUMPAD_4': 100,
	'NUMPAD_5': 101,
	'NUMPAD_6': 102,
	'NUMPAD_7': 103,
	'NUMPAD_8': 104,
	'NUMPAD_9': 105,
	'MULTIPLY': 106,
	'ADD': 107,
	'SUBSTRACT': 109,
	'DECIMAL': 110,
	'DIVIDE': 111,
	'F1': 112,
	'F2': 113,
	'F3': 114,
	'F4': 115,
	'F5': 116,
	'F6': 117,
	'F7': 118,
	'F8': 119,
	'F9': 120,
	'F10': 121,
	'F11': 122,
	'F12': 123,
	'SHIFT': 16,
	'CTRL': 17,
	'ALT': 18,
	'PLUS': 187,
	'COMMA': 188,
	'MINUS': 189,
	'PERIOD': 190
};

var input_engine = new InputEngine();
input_engine.KEYS = KEYS;
if (typeof window === 'undefined') module.exports = input_engine;