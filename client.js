void function() {
	"use strict";
	var	fio={},
		nofunc=function() {},
		_B1=new Uint8Array(1);
	fio.WAIT=1;
	fio.AUTOCONNECT=2;
	fio.Socket=function(host, port, flags) {
		this.id=-1;
		this.events=[nofunc];
		this._events=Object.create(null);
		this.eventKeys=Object.create(null);
		this.url="ws://"+(host||location.hostname)+":"+port;
		this.flags=flags||0;
		this.socket=null;
		this.initialized=false;
		if(~this.flags&fio.WAIT) {
			this.connect();
			}
		if(this.flags&fio.AUTOCONNECT) {
			var	socket=this;
			window.addEventListener("online", function(event) {
				if(socket.socket.readyState===WebSocket.CLOSED) {
					socket.connect();
					}
				});
			}
		return this;
		};
	fio.Socket.setup=function(message) {
		var	socket=this.fio;
		if(!socket.initialized) {
			message=message.data.split(/\0/);
			socket.id=+message.pop();
			for(var i=0; i<message.length; i++) {
				socket.eventKeys[message[i]]=i;
				socket.events[i]=socket._events[message[i]]||nofunc;
				}
			delete socket._events;
			socket.initialized=true;
			}
		this.removeEventListener("message", fio.Socket.setup);
		this.addEventListener("message", fio.Socket.message);
		if(socket.onsetup) {
			socket.onsetup(socket);
			}
		};
	fio.Socket.message=function(message) {
		message=message.data;
		if(message instanceof ArrayBuffer) {
			this.fio.events[new DataView(message).getUint8(0)].call(
				this.fio,
				message.slice(1)
				);
			}
		else {
			var	type=message.charCodeAt(1),
				event=this.fio.events[message.charCodeAt(0)];
			if(type===3) {
				event.apply(this.fio, JSON.parse(message.substring(2)));
				}
			else if(type===2) {
				event.call(this.fio, JSON.parse(message.substring(2)));
				}
			else if(type===1) {
				event.call(this.fio, +message.substring(2));
				}
			else {
				event.call(this.fio, message.substring(2));
				}
			}
		};
	fio.Socket.autoconnect=function(event) {
		if(navigator.onLine) {
			this.connect();
			}
		};
	fio.Socket.prototype.on=function(name, callback) {
		if(name==="open") {
			this.onsetup=callback;
			}
		else if(name==="close") {
			this.onclose=callback;
			this.onEvent("close", callback);
			}
		else if(name==="error") {
			this.onerror=callback;
			this.onEvent("error", callback);
			}
		else if(~this.id) {
			this.events[this.eventKeys[name]]=callback;
			}
		else {
			this._events[name]=callback;
			}
		return this;
		};
	fio.Socket.prototype.send=function(event, data) {
		if(arguments.length===1) {
			_B1[0]=this.eventKeys[event];
			this.socket.send(_B1.buffer);
			}
		else if(data instanceof ArrayBuffer) {
			var	buffer=new Uint8Array(data.byteLength+1);
			buffer[0]=this.eventKeys[event];
			buffer.set(new Uint8Array(data), 1);
			this.socket.send(buffer.buffer);
			}
		else {
			var	type;
			if(arguments.length>2) {
				type=3;
				data=new Array(arguments.length-1);
				for(var i=0; i<data.length;) {
					data[i]=arguments[++i];
					}
				data=JSON.stringify(data);
				}
			else if(typeof data==="object") {
				type=2;
				data=JSON.stringify(data);
				}
			else if(typeof data==="number") {
				type=1;
				}
			else {
				type=0;
				data=data||"";
				}
			this.socket.send(
				String.fromCharCode(this.eventKeys[event])+
				String.fromCharCode(type)+data
				);
			}
		return this;
		};
	fio.Socket.prototype.call=function() {
		for(var i=0, data=new Array(arguments.length); i<data.length; ++i) {
			data[i]=arguments[i];
			}
		this.events[this.eventKeys[data.shift()]].apply(this, data);
		return this;
		};
	fio.Socket.prototype.close=function() {
		this.socket.close.apply(this.socket, arguments);
		return this;
		};
	fio.Socket.prototype.connect=function(callback) {
		if(this.initialized && this.socket.readyState!==WebSocket.CLOSED) {
			callback.call(this, this, false);
			return this;
			}
		this.socket=new WebSocket(this.url);
		this.socket.fio=this;
		this.socket.binaryType="arraybuffer";
		this.socket.addEventListener("message", fio.Socket.setup);
		if(this.flags&fio.AUTOCONNECT) {
			this.onEvent("close", fio.Socket.autoconnect);
			}
		if(this.onclose) {
			this.onEvent("close", this.onclose);
			}
		if(this.onerror) {
			this.onEvent("error", this.onerror);
			}
		if(callback) {
			callback.call(this, this, true);
			}
		return this;
		};
	fio.Socket.prototype.onEvent=function(event, callback) {
		this.socket.addEventListener(event, function(event) {
			callback.call(this.fio, this.fio, event);
			});
		};
	window.fio=fio;
	}();