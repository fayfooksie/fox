//Optimized WS system "FIO"
//by Fooffie
"use strict";

//setup
var	id=0,
	fio={},
	nofunc=function() {},
	WebSocket=require("ws", {
		protocolVersion: 13
		});

//fio.Server
fio.Server=function(settings) {
	this.events=[null];
	this.eventKeys=Object.create(null);
	this.eventKeyArray=["hb"];
	this.connect=nofunc;
	this.disconnect=nofunc;
	this.server=new WebSocket.Server(settings);
	this.server._fio=this;
	this.clients=this.sockets=[];
	this.server.on("connection", fio.Server.connect);
	this.heartbeat=setInterval(function(clients, buffer) {
		return function() {
			for(var i=0; i<clients.length; ++i) {
				clients[i].send(buffer);
				}
			};
		}(this.server.clients, fio.Server.heartbeat), 60000);
	return this;
	};
fio.Server.heartbeat=new Buffer([0]);
fio.Server.connect=function(socket) {
	socket=new fio.Client(socket, this._fio);
	socket.socket.send(JSON.stringify(this._fio.eventKeyArray.concat(socket.id)));
	this._fio.sockets.push(socket);
	this._fio.connect.call(socket, socket);
	};
fio.Server.prototype.on=function(event, callback) {
	if(event==="connection") {
		this.connect=callback;
		}
	else if(event==="close") {
		this.disconnect=callback;
		}
	return this;
	};
fio.Server.prototype.allEvents=function(events) {
	for(var key in events) {
		this.events.push(events[key]||nofunc);
		this.eventKeys[key]=this.eventKeyArray.length;
		this.eventKeyArray.push(key);
		}
	};
fio.Server.prototype.broadcast=function(room) {
	for(var i=0, data=new Array(arguments.length-1); i<data.length;) {
		data[i]=arguments[++i];
		}
	if(room) {
		for(var i=0; i<this.clients.length; ++i) {
			if(this.clients[i].room===room) {
				this.clients[i].send.apply(this.clients[i], data);
				}
			}
		}
	else {
		for(var i=0; i<this.clients.length; ++i) {
			this.clients[i].send.apply(this.clients[i], data);
			}
		}
	};

//fio.Client (server)
var	_B1=new Buffer(1);
fio.Client=function(socket, server) {
	this.id=++id;
	this.room=null;
	this.server=server;
	this.events=server.events;
	this.eventKeys=server.eventKeys;
	this.socket=socket;
	this.socket._fio=this;
	this.socket.addEventListener("message", fio.Client.message);
	this.socket.addEventListener("close", fio.Client.close);
	this.ip=socket.upgradeReq.connection.remoteAddress;
	return this;
	};
fio.Client.close=function() {
	var	server=this._fio.server;
	server.sockets.splice(server.sockets.indexOf(this._fio), 1);
	server.disconnect.apply(this._fio, arguments);
	};
fio.Client.message=function(message) {
	message=message.data;
	if(message instanceof Buffer) {
		var	event=this._fio.events[message[0]];
		if(event) {
			if(message.length===1) {
				event.call(this._fio);
				}
			else {
				event.call(this._fio, message.slice(1));
				}
			}
		else {
			console.error(new Error("Event does not exist").stack);
			}
		}
	else {
		message=JSON.parse(message);
		var	event=this._fio.events[message.pop()];
		if(event) {
			event.apply(this._fio, message);
			}
		else {
			console.error(new Error("Event does not exist").stack);
			}
		}
	};
fio.Client.prototype.send=function(event, data) {
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
		for(var i=0, data=new Array(arguments.length); i<arguments.length;) {
			data[i]=arguments[++i];
			}
		data[i-1]=this.eventKeys[event];
		this.socket.send(JSON.stringify(data));
		}
	return this;
	};
fio.Client.prototype.send1DB=function(event, array) {
	if(array instanceof Array&&arguments.length===2) {
		array.unshift(this.eventKeys[event]);
		}
	else {
		array=[this.eventKeys[event], array];
		for(var i=2; i<arguments.length; ++i) {
			array[i]=arguments[i];
			}
		}
	this.socket.send(fio.write1DB(array));
	};
fio.Client.prototype.call=function() {
	var	data=Array.prototype.slice.call(arguments);
	this.events[this.eventKeys[data.shift()]].apply(this, data);
	};

//fio.Socket (client)
fio.Socket=function(host, port) {
	if(!host) host=location.hostname;
	if(!port) port=location.port;
	this.id=-1;
	this.events=[nofunc];
	this.eventKeys=Object.create(null);
	this.socket=new WebSocket("ws://"+host+":"+port);
	this.socket._fio=this;
	this.socket.once("message", fio.Socket.setup);
	return this;
	};
fio.Socket.setup=function(message) {
	message=JSON.parse(message);
	this._fio.id=message.pop();
	for(var i=0; i<message.length; i++) {
		this._fio.eventKeys[message[i]]=i;
		}
	this.on("message", fio.Socket.message);
	if(this._fio.onsetup) {
		this._fio.onsetup(this._fio, this._fio.id);
		delete this._fio.onsetup;
		}
	};
fio.Socket.message=function(message) {
	if(message instanceof Buffer) {
		this._fio.events[message[0]].call(
			this._fio,
			message.slice(1)
			);
		}
	else {
		try {
			message=JSON.parse(message);
			}
		catch(error) {
			console.error(error);
			return;
			}
		this._fio.events[message.pop()].apply(this._fio, message);
		}
	};
fio.Socket.prototype=Object.create(fio.Client.prototype);
fio.Socket.prototype.constructor=fio.Socket;
fio.Socket.prototype.on=function(name, callback) {
	if(name==="close"||name==="error") {
		this.socket.addEventListener(name, function() {
			callback.apply(this._fio, arguments);
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

//utility functions
fio.broadcast=function() {
	for(var i=0, data=new Array(arguments.length); i<data.length;) {
		data[++i]=arguments[i];
		}
	for(var i=0; i<this.clients.length; ++i) {
		this.clients[i].send.apply(this.clients[i], data);
		}
	};
void function() {
var	TEMP=new Buffer(0xffff),
	INT8=0,
	INT8N=1,
	INT16=2,
	INT16N=3,
	INT32=4,
	INT32N=5,
	FLOAT32=6,
	STRING=7,
	STRING16=8,
	BUFFER=9,
	BUFFER16=10,
	ARRAY=11,
	ARRAY16=12,
	BOOLEAN=13,
	OBJECT=14,
	NULL=15;
fio.read1DB=function(buffer) {
	for(var i=0, dataType=0, output=[], len=buffer.length; i<len; ++i) {
		dataType=buffer[i];
		if(dataType===INT8) {
			output.push(buffer[++i]);
			}
		else if(dataType===INT8N) {
			output.push(-buffer[++i]);
			}
		else if(dataType===INT16) {
			output.push(buffer.readUInt16BE((i+=2)-1, true));
			}
		else if(dataType===INT16N) {
			output.push(-buffer.readUInt16BE((i+=2)-1, true));
			}
		else if(dataType===INT32) {
			output.push(buffer.readUInt32BE((i+=4)-3, true));
			}
		else if(dataType===INT32N) {
			output.push(-buffer.readUInt32BE((i+=4)-3, true));
			}
		else if(dataType===FLOAT32) {
			output.push(buffer.readFloatBE((i+=4)-3, true));
			}
		else if(dataType===STRING) {
			output.push(buffer.toString(null, ++i+1, (i+=buffer[i])+1));
			}
		else if(dataType===STRING16) {
			output.push(buffer.toString(null, ++i+1, (i+=dataView.getUint16(i, true))+2));
			}
		else if(dataType===BUFFER) {
			output.push(buffer.slice(++i+1, (i+=buffer[i])+1));
			}
		else if(dataType===BUFFER16) {
			output.push(buffer.slice(++i+1, (i+=dataView.getUint16(i, true))+2));
			}
		else if(dataType===ARRAY) {
			output.push(fio.read1DB(buffer.slice(++i+1, (i+=buffer[i])+1)));
			}
		else if(dataType===ARRAY16) {
			output.push(fio.read1DB(buffer.slice(++i+1, (i+=dataView.getUint16(i, true))+2)));
			}
		else if(dataType===BOOLEAN) {
			output.push(!!buffer[++i]);
			}
		else if(dataType===NULL) {
			output.push(null);
			}
		else {
			output.push(undefined);
			}
		}
	return output;
	};
fio.write1DB=function(array) {
	if(array.constructor!==Array) array=arguments;
	for(var i=0, j=0, ins=0, data=null; i<array.length; ++i) {
		if(!(data=array[i])) {
			if(data===0) {
				TEMP[ins]=UNDEF;
				TEMP[(ins+=2)-1]=0;
				}
			else if(data===null) {
				TEMP[ins++]=NULL;
				}
			else if(data===false) {
				TEMP[ins]=BOOLEAN;
				TEMP[(ins+=2)-1]=0;
				}
			else {
				TEMP[ins++]=255;
				}
			}
		else if(data.constructor===Number) {
			if(Math.abs(data)>>>0!==Math.abs(data)) {
				TEMP[ins]=FLOAT32;
				TEMP.writeFloatBE(data, (ins+=5)-4, true);
				}
			else if(data>0xffff) {
				TEMP[ins]=INT32;
				TEMP.writeUInt32BE(data, (ins+=5)-4, true);
				}
			else if(data<-0xffff) {
				TEMP[ins]=INT32N;
				TEMP.writeUInt32BE(-data, (ins+=5)-4, true);
				}
			else if(data>0xff) {
				TEMP[ins]=INT16;
				TEMP.writeUInt16BE(data, (ins+=3)-2, true);
				}
			else if(data<-0xff) {
				TEMP[ins]=INT16N;
				TEMP.writeUInt16BE(-data, (ins+=3)-2, true);
				}
			else if(data>0) {
				TEMP[ins]=INT8;
				TEMP[(ins+=2)-1]=data;
				}
			else {
				TEMP[ins]=INT8N;
				TEMP[(ins+=2)-1]=-data;
				}
			}
		else if(data.constructor===Boolean) {
			TEMP[ins]=BOOLEAN;
			TEMP[(ins+=2)-1]=1;
			}
		else if(data.constructor===String) {
			if(data.length>0xff) {
				TEMP[ins]=STRING16;
				TEMP.writeUInt16BE(data.length, ++ins, true);
				}
			else {
				TEMP[ins]=STRING;
				TEMP[ins+1]=data.length;
				}
			for(j=0, ins+=2; j<data.length; ++j) {
				TEMP[ins+j]=data.charCodeAt(j);
				}
			ins+=j;
			}
		else if(data.constructor===Buffer) {
			if(data.length>0xff) {
				TEMP[ins]=BUFFER16;
				TEMP.writeUInt16BE(data.length, ++ins, true);
				}
			else {
				TEMP[ins]=BUFFER;
				TEMP[ins+1]=data.length;
				}
			data.copy(TEMP, ins+2);
			ins+=2+data.length;
			}
		else if(data.constructor===Array) {
			var	_TEMP=new Buffer(TEMP);
			data=fio.write1DB(data);
			if(data.length>0xff) {
				_TEMP[ins]=ARRAY16;
				_TEMP.writeUInt16BE(data.length, ++ins, true);
				}
			else {
				_TEMP[ins]=ARRAY;
				_TEMP[ins+1]=data.length;
				}
			data.copy(_TEMP, ins+2);
			ins+=2+data.length;
			TEMP=_TEMP;
			}
		else {
			console.error(new Error("1DB format does not support objects or functions").stack);
			}
		}
	return TEMP.slice(0, ins);
	};
}();
fio.handle1DB=function(callback) {
	return function(buffer) {
		if(buffer instanceof Buffer) {
			callback.apply(this, fio.read1DB(buffer));
			}
		else {
			console.error(new Error("Object received was not a Buffer").stack);
			}
		};
	};
module.exports=fio;