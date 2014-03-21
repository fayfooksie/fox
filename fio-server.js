"use strict";
var	nofunc=function() {},
	WebSocket=require("ws", {
		protocolVersion: 13
		});
function fio() {
	return this;
	}
fio.Server=function(settings) {
	this.ids=0;
	this.events=[];
	this.eventKeys=Object.create(null);
	this.eventKeyArray=[];
	this.connect=nofunc;
	this.disconnect=nofunc;
	this.sockets=new fio.SockList();
	this.server=new WebSocket.Server(settings);
	this.server._fio=this;
	this.server.on("connection", function(socket) {
		socket=new fio.Socket(socket, this._fio);
		this._fio.sockets.add(socket);
		socket.socket.send(JSON.stringify(this._fio.eventKeyArray.concat(socket.id)));
		this._fio.connect.call(socket, socket);
		});
	return this;
	}
fio.Server.prototype.on=function(event, callback) {
	if(event==="connection") {
		this.connect=callback;
		}
	else if(event==="close") {
		this.disconnect=callback;
		}
	return this;
	}
fio.Server.prototype.allEvents=function(events) {
	for(var key in events) {
		this.events.push(events[key]);
		this.eventKeys[key]=this.eventKeyArray.length;
		this.eventKeyArray.push(key);
		}
	}
fio.Socket=function(socket, server) {
	this.id=++server.ids;
	this.room=null;
	this.server=server;
	this.events=server.events;
	this.eventKeys=server.eventKeys;
	this.socket=socket;
	this.socket._fio=this;
	this.socket.addEventListener("message", fio.Socket.message);
	this.socket.addEventListener("close", fio.Socket.close);
	this.ip=socket.upgradeReq.connection.remoteAddress;
	return this;
	}
fio.Socket.close=function() {
	this._fio.server.disconnect.apply(this._fio, arguments);
	}
fio.Socket.message=function(message) {
	if(message.data instanceof Buffer) {
		message=message.data;
		if(this._fio.events[message[0]]) {
			this._fio.events[message[0]].call(
				this._fio,
				message.slice(1)
				);
			}
		}
	else {
		message=JSON.parse(message.data);
		if(this._fio.events[message[0]]) {
			this._fio.events[message.shift()].apply(this._fio, message);
			}
		}
	}
fio.Socket.prototype.send=function() {
	if(arguments[1] instanceof Buffer) {
		var	buffer=arguments[1],
			data=new Uint8Array(buffer.length+1);
		data[0]=this.eventKeys[arguments[0]];
		for(var i=0; i<buffer.length; ++i) {
			data[i+1]=buffer[i];
			}
		this.socket.send(data.buffer);
		}
	else if(arguments[1] instanceof ArrayBuffer) {
		var	buffer=arguments[1],
			data=new Uint8Array(buffer.byteLength+1);
		data[0]=this.eventKeys[arguments[0]];
		data.set(new Uint8Array(buffer), 1);
		this.socket.send(data.buffer);
		}
	else {
		var	data=Array.prototype.slice.call(arguments);
		data[0]=this.eventKeys[data[0]];
		this.socket.send(JSON.stringify(data));
		}
	return this;
	}
fio.Socket.prototype.call=function() {
	var	data=Array.prototype.slice.call(arguments);
	this.events[this.eventKeys[data.shift()]].apply(this, data);
	}
fio.SockList=function() {
	this.sockets=Object.create(null);
	return this;
	}
fio.SockList.prototype.add=function(socket) {
	this.sockets[socket.id]=socket;
	return this;
	}
var	TEMP=new Buffer(0xffff),
	INT8=0,
	INT8N=1,
	INT16=2,
	INT16N=3,
	INT32=4,
	INT32N=5,
	FLOAT32=6,
	STRING=7,
	BUFFER=8;
fio.read1DB=function(buffer) {
	for(var i=0, output=[]; i<buffer.length; ++i) {
		if(buffer[i]===INT8) {
			output.push(buffer[++i]);
			}
		else if(buffer[i]===INT8N) {
			output.push(-buffer[++i]);
			}
		else if(buffer[i]===INT16) {
			output.push(buffer.readUInt16BE(i+1));
			i+=2;
			}
		else if(buffer[i]===INT16N) {
			output.push(-buffer.readUInt16BE(i+1));
			i+=2;
			}
		else if(buffer[i]===INT32) {
			output.push(buffer.readUInt32BE(i+1));
			i+=4;
			}
		else if(buffer[i]===INT32N) {
			output.push(-buffer.readUInt32BE(i+1));
			i+=4;
			}
		else if(buffer[i]===FLOAT32) {
			output.push(buffer.readFloat32BE(i+1));
			i+=4;
			}
		else if(buffer[i]===STRING) {
			output.push(buffer.toString(null, i+=2, i+buffer[i-1]));
			i+=buffer[i+1];
			}
		else if(buffer[i]===BUFFER) {
			output.push(buffer.slice(i+=2, i+buffer[i-1]));
			i+=buffer[i];
			}
		}
	return output;
	}
fio.write1DB=function(array) {
	if(array.constructor!==Array) array=arguments;
	for(var i=0, j=0, ins=0, data=null; i<array.length; ++i) {
		data=array[i];
		if(data.constructor===Number) {
			if(data%1!==0 || data<-0xffffffff || data>0xffffffff) {
				TEMP[ins]=FLOAT32;
				TEMP.writeFloatBE(data, ins+1);
				ins+=5;
				}
			else {
				if(data>0xffff) {
					TEMP[ins]=INT32;
					TEMP.writeUInt32BE(data, ins+1);
					ins+=5;
					}
				else if(data<-0xffff) {
					TEMP[ins]=INT32N;
					TEMP.writeUInt32BE(-data, ins+1);
					ins+=5;
					}
				else if(data>0xff) {
					TEMP[ins]=INT16;
					TEMP.writeUInt16BE(data, ins+1);
					ins+=3;
					}
				else if(data<-0xff) {
					TEMP[ins]=INT16N;
					TEMP.writeUInt16BE(-data, ins+1);
					ins+=3;
					}
				else if(data>0) {
					TEMP[ins]=INT8;
					TEMP[ins+1]=data;
					ins+=2;
					}
				else {
					TEMP[ins]=INT8N;
					TEMP[ins+1]=-data;
					ins+=2;
					}
				}
			}
		else if(data.constructor===String) {
			TEMP[ins]=STRING;
			TEMP[ins+1]=data.length;
			for(j=0, ins+=2; j<data.length; ++j) {
				TEMP[ins+j]=data.charCodeAt(j);
				}
			ins+=j;
			}
		else if(data.constructor===Buffer) {
			TEMP[ins]=BUFFER;
			TEMP[ins+1]=data.length;
			data.copy(TEMP, ins+2);
			ins+=2+data.byteLength;
			}
		}
	return TEMP.slice(0, ins);
	}
module.exports=fio;
