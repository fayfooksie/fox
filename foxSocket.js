(function() {
	"use strict";

	//foxSocks
	function fox() {
		return this;
		}
	fox.connections=new Object();

	//Fake socket
	fox.Socket=function(host,port) {
		if(!host) host=location.hostname;
		if(!port) port=location.port;
		this.events=Object.create(null);
		this.socket=new WebSocket("ws://"+host+":"+port);
		this.socket.addEventListener("message",function(socket) {
			return function(message) {
				message=JSON.parse(message.data);
				var	name=message.shift();
				if(socket.events[name]) {
					socket.events[name].apply(socket,message);
					}
				}
			}(this));
		fox.connections[host+":"+port]=this;
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

	//Globalize it
	window.fox=fox;
	})();