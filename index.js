//Optimized WS system "FIO"
//by Fooffie
"use strict";

//setup
var	fio=Object.create(null),
	nofunc=function() {},
	WebSocket=require("ws", {
		protocolVersion: 13
		});

//fio.Server
fio.Server=function(settings) {
	this.id=-1;
	this.events=[null];
	this.eventKeys=Object.create(null);
	this.eventKeys.null=0;
	this.eventSetup="null";
	this.connect=nofunc;
	this.disconnect=nofunc;
	this.server=new WebSocket.Server(settings);
	this.server.fio=this;
	this.clients=this.sockets=[];
	this.server.on("connection", fio.Server.connect);
	this.heartbeat=setInterval(function(clients) {
		return function() {
			_B1[0]=0;
			for(var i=clients.length; i--;) {
				clients[i].socket.send(_B1);
				}
			};
		}(this.clients), 60000);
	return this;
	};
fio.Server.connect=function(socket) {
	socket=new fio.Client(socket, this.fio);
	socket.socket.send(this.fio.eventSetup+"\0"+socket.id);
	this.fio.sockets.push(socket);
	this.fio.connect.call(socket, socket);
	};
fio.Server.prototype.on=function(event, callback) {
	if(event==="connection") {
		this.connect=callback;
		}
	else if(event==="close") {
		this.disconnect=callback;
		}
	else {
		this.events.push(callback||nofunc);
		this.eventKeys[event]=this.events.length-1;
		this.eventSetup+="\0"+event;
		}
	return this;
	};
fio.Server.prototype.broadcast=function(room) {
	for(var i=0, data=new Array(arguments.length-1); i<data.length;) {
		data[i]=arguments[++i];
		}
	if(!room) {
		room=this;
		}
	for(var i=room.clients.length; i--;) {
		room.clients[i].send.apply(room.clients[i], data);
		}
	};

//fio.Room (server)
fio.Room=function() {
	this.clients=[];
	};
fio.Room.prototype.send=
fio.Room.prototype.broadcast=function() {
	for(var i=this.clients.length; i--;) {
		this.clients[i].send.apply(this.clients[i], arguments);
		}
	};

//fio.Client (server)
var	_B1=new Buffer(1);
fio.Client=function(socket, server) {
	this.id=++server.id;
	this.room=null;
	this.server=server;
	this.events=server.events;
	this.eventKeys=server.eventKeys;
	this.socket=socket;
	this.socket.fio=this;
	this.socket.addEventListener("message", fio.Client.message);
	this.socket.addEventListener("close", fio.Client.close);
	this.ip=socket.upgradeReq.connection.remoteAddress;
	return this;
	};
fio.Client.close=function(code, message) {
	for(var server=this.fio.server, i=server.sockets.length; i--;) {
		if(server.sockets[i]===this.fio) {
			server.sockets.splice(i, 1);
			break;
			}
		}
	server.disconnect(this.fio, code, message);
	};
fio.Client.message=function(message) {
	message=message.data;
	if(message instanceof Buffer) {
		var	event=this.fio.events[message[0]];
		if(event) {
			if(message.length===1) {
				event.call(this.fio);
				}
			else {
				event.call(this.fio, message.slice(1));
				}
			}
		}
	else {
		var	type=message.charCodeAt(1),
			event=this.fio.events[message.charCodeAt(0)];
		if(type===3) {
			try {
				message=JSON.parse(message.substring(2));
				}
			catch(error) {
				return;
				}
			event.apply(this.fio, message);
			}
		else if(type===2) {
			try {
				message=JSON.parse(message.substring(2));
				}
			catch(error) {
				return;
				}
			event.call(this.fio, message);
			}
		else if(type===1) {
			event.call(this.fio, +message.substring(2));
			}
		else {
			event.call(this.fio, message.substring(2));
			}
		}
	};
fio.Client.prototype.join=function(room) {
	this.room=room;
	room.clients.push(this);
	};
fio.Client.prototype.leave=function() {
	for(var i=this.room.clients.length; i--;) {
		if(this.room.clients[i]===this) {
			this.room.clients.splice(i, 1);
			break;
			}
		}
	this.room=null;
	};
fio.Client.prototype.send=function(event, data) {
	if(this.socket.readyState===WebSocket.OPEN) {
		if(arguments.length===1) {
			_B1[0]=this.eventKeys[event];
			this.socket.send(_B1);
			}
		else if(data instanceof Buffer) {
			var	buffer=new Buffer(data.length+1);
			buffer[0]=this.eventKeys[event];
			data.copy(buffer, 1);
			this.socket.send(buffer);
			}
		else if(data instanceof ArrayBuffer) {
			var	buffer=new Uint8Array(data.length+1);
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
		}
	return this;
	};
fio.Client.prototype.call=function() {
	for(var i=0, data=new Array(arguments.length); i<data.length; ++i) {
		data[i]=arguments[i];
		}
	this.events[this.eventKeys[data.shift()]].apply(this, data);
	};
fio.Client.prototype.broadcast=function() {
	for(var clients=this.room.clients, i=clients.length; i--;) {
		if(clients[i]!==this) {
			clients[i].send.apply(clients[i], arguments);
			}
		}
	};

//fio.Socket (client)
fio.Socket=function(host, port) {
	if(!host) {
		host=location.hostname;
		}
	if(!port) {
		port=location.port;
		}
	this.id=-1;
	this.events=[nofunc];
	this.eventKeys=Object.create(null);
	this.socket=new WebSocket("ws://"+host+":"+port);
	this.socket.fio=this;
	this.socket.once("message", fio.Socket.setup);
	return this;
	};
fio.Socket.setup=function(message) {
	message=JSON.parse(message);
	this.fio.id=message.pop();
	for(var i=message.length; i--;) {
		this.fio.eventKeys[message[i]]=i;
		}
	this.on("message", fio.Socket.message);
	if(this.fio.onsetup) {
		this.fio.onsetup(this.fio, this.fio.id);
		delete this.fio.onsetup;
		}
	};
fio.Socket.message=function(message) {
	if(message instanceof Buffer) {
		this.fio.events[message[0]].call(
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
fio.Socket.prototype=Object.create(fio.Client.prototype);
fio.Socket.prototype.constructor=fio.Socket;
fio.Socket.prototype.on=function(name, callback) {
	if(name==="close"||name==="error") {
		this.socket.addEventListener(name, function() {
			callback.apply(this.fio, arguments);
			});
		}
	else if(name==="open") {
		this.onsetup=callback;
		}
	else {
		this.events[this.eventKeys[name]]=callback;
		}
	return this;
	};
fio.Socket.prototype.close=function() {
	this.socket.close();
	return this;
	};
module.exports=fio;