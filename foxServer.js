"use strict";

//Require actual websockets
var	WebSocket=require('ws');

//foxSocks
function fox() {
	return this;
	}

//Fake server
fox.Server=function(settings) {
	this.server=new WebSocket.Server(settings);
	this.sockets=new fox.SockList();
	return this;
	}
fox.Server.prototype.on=function(event,callback) {
	if(event==="connection") {
		this.server.on("connection",function(server) {
			return function(socket) {
				socket=new fox.Socket(socket);
				server.sockets.add(socket);
				callback.call(socket,socket);
				}
			}(this));
		}
	return this;
	}

//Fake socket
fox.Socket=function(socket) {
	this.id=Date.now().toString(36);
	this.room=null;
	this.socket=socket;
	this.events=Object.create(null);
	this.socket.addEventListener("message",function(socket) {
		return function(message) {
			message=JSON.parse(message.data);
			var	name=message.shift();
			if(socket.events[name]) {
				socket.events[name].apply(socket,message);
				}
			}
		}(this));
	return this;
	}
fox.Socket.prototype.on=function(name,callback) {
	if(name==="open"||name==="close"||name==="error") {
		this.socket.on(name,function(socket) {
			return function() {
				callback.apply(socket,arguments);
				}
			}(this));
		}
	else {
		this.events[name]=callback;
		}
	return this;
	}
fox.Socket.prototype.send=function() {
	if(this.socket.readyState===WebSocket.OPEN) {
		this.socket.send(JSON.stringify(Array.prototype.slice.call(arguments)));
		}
	return this;
	}

//Fake list of sockets
fox.SockList=function(sockets) {
	this.sockets=new Object();
	return this;
	}
fox.SockList.prototype.add=function(socket) {
	this.sockets[socket.id]=socket;
	return this;
	}
fox.SockList.prototype.in=function(room) {
	var	id,
		sockets=new fox.SockList();
	for(id in this.sockets) {
		if(this.sockets[id].room===room) {
			sockets.add(this.sockets[id]);
			}
		}
	return sockets;
	}
fox.SockList.prototype.send=function() {
	var	id;
	for(id in this.sockets) {
		this.sockets[id].send.apply(this.sockets[id],arguments);
		}
	return this;
	}

//Export it
module.exports=fox;