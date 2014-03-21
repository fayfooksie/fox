(function() {
	"use strict";
	var	fio={};
	fio.connections={};
	fio.Socket=function(host, port) {
		if(!host) host=location.hostname;
		if(!port) port=location.port;
		this.id=-1;
		this.events=[];
		this.eventKeys=Object.create(null);
		this.socket=new WebSocket("ws://"+host+":"+port);
		this.socket._fio=this;
		this.socket.binaryType="arraybuffer";
		this.socket.addEventListener("message", fio.Socket.setup);
		fio.connections[host+":"+port]=this;
		return this;
		}
	fio.Socket.setup=function(message) {
		message=JSON.parse(message.data);
		this._fio.id=message.pop();
		for(var i=0; i<message.length; i++) {
			this._fio.eventKeys[message[i]]=i;
			}
		this.removeEventListener("message", fio.Socket.setup);
		this.addEventListener("message", fio.Socket.message);
		if(this._fio.onsetup) {
			this._fio.onsetup(this._fio, this._fio.id);
			delete this._fio.onsetup;
			}
		}
	fio.Socket.message=function(message) {
		if(message.data instanceof ArrayBuffer) {
			this._fio.events[new DataView(message.data).getUint8(0)].call(
				this._fio,
				message.data.slice(1)
				);
			}
		else {
			message=JSON.parse(message.data);
			if(this._fio.events[message[0]]) {
				this._fio.events[message.shift()].apply(this._fio, message);
				}
			}
		}
	fio.Socket.prototype.on=function(name, callback) {
		if(name==="open"||name==="close"||name==="error") {
			this.socket.addEventListener(name, function() {
				callback.apply(this._fio, arguments);
				});
			}
		else if(name==="setup") {
			this.onsetup=callback;
			}
		else {
			this.events[this.eventKeys[name]]=callback;
			}
		return this;
		}
	fio.Socket.prototype.send=function() {
		if(arguments[1] instanceof ArrayBuffer) {
			var	data=new Uint8Array(arguments[1].byteLength+1);
			data[0]=this.eventKeys[arguments[0]];
			data.set(new Uint8Array(arguments[1]), 1);
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
	fio.Socket.prototype.close=function() {
		this.socket.close();
		return this;
		}
	var	TEMP=new Uint8Array(0xffff),
		TEMPDV=new DataView(TEMP.buffer),
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
		var	dataArray=new Uint8Array(buffer),
			dataView=new DataView(buffer);
		for(var i=0, j=0, len=0, str="", output=[]; i<buffer.byteLength; ++i) {
			if(dataArray[i]===INT8) {
				output.push(dataArray[++i]);
				}
			else if(dataArray[i]===INT8N) {
				output.push(-dataArray[++i]);
				}
			else if(dataArray[i]===INT16) {
				output.push(dataView.getUint16(i+1));
				i+=2;
				}
			else if(dataArray[i]===INT16N) {
				output.push(-dataView.getUint16(i+1));
				i+=2;
				}
			else if(dataArray[i]===INT32) {
				output.push(dataView.getUint32(i+1));
				i+=4;
				}
			else if(dataArray[i]===INT32N) {
				output.push(-dataView.getUint32(i+1));
				i+=4;
				}
			else if(dataArray[i]===FLOAT32) {
				output.push(dataView.getFloat32(i+1));
				i+=4;
				}
			else if(dataArray[i]===STRING) {
				for(j=1, str="", len=dataArray[++i]+1; j<len; ++j) {
					str+=String.fromCharCode(dataArray[i+j]);
					}
				output.push(str);
				i+=j-1;
				}
			else if(dataArray[i]===BUFFER) {
				output.push(buffer.slice(i+=2, i+dataArray[i-1]));
				i+=dataArray[i];
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
					TEMPDV.setFloat32(ins+1, data);
					ins+=5;
					}
				else {
					if(data>0xffff) {
						TEMP[ins]=INT32;
						TEMPDV.setUint32(ins+1, data);
						ins+=5;
						}
					else if(data<-0xffff) {
						TEMP[ins]=INT32N;
						TEMPDV.setUint32(ins+1, -data);
						ins+=5;
						}
					else if(data>0xff) {
						TEMP[ins]=INT16;
						TEMPDV.setUint16(ins+1, data);
						ins+=3;
						}
					else if(data<-0xff) {
						TEMP[ins]=INT16N;
						TEMPDV.setUint16(ins+1, -data);
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
			else if(data.constructor===ArrayBuffer) {
				TEMP[ins]=BUFFER;
				TEMP[ins+1]=data.byteLength;
				TEMP.set(new Uint8Array(data), ins+2);
				ins+=2+data.byteLength;
				}
			}
		return TEMP.buffer.slice(0, ins);
		}
	window.fio=fio;
	})();
