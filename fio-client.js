(function() {
	"use strict";
	var	fio={},
		nofunc=function() {},
		_B1=new Uint8Array(1);
	fio.Socket=function(host, port) {
		if(!host) host=location.hostname;
		if(!port) port=location.port;
		this.id=-1;
		this.events=[nofunc];
		this.eventKeys=Object.create(null);
		this.socket=new WebSocket("ws://"+host+":"+port);
		this.socket._fio=this;
		this.socket.binaryType="arraybuffer";
		this.socket.addEventListener("message", fio.Socket.setup);
		return this;
		};
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
		};
	fio.Socket.message=function(message) {
		message=message.data;
		if(message instanceof ArrayBuffer) {
			this._fio.events[new DataView(message).getUint8(0)].call(
				this._fio,
				message.slice(1)
				);
			}
		else {
			message=JSON.parse(message);
			this._fio.events[message.pop()].apply(this._fio, message);
			}
		};
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
			for(var i=0, data=new Array(arguments.length); i<arguments.length;) {
				data[i]=arguments[++i];
				}
			data[i-1]=this.eventKeys[event];
			this.socket.send(JSON.stringify(data));
			}
		return this;
		};
	fio.Socket.prototype.send1DB=function(event, array) {
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
	fio.Socket.prototype.call=function() {
		var	data=Array.prototype.slice.call(arguments);
		this.events[this.eventKeys[data.shift()]].apply(this, data);
		};
	fio.Socket.prototype.close=function() {
		this.socket.close();
		return this;
		};
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
		STRING16=8,
		BUFFER=9,
		BUFFER16=10,
		ARRAY=11,
		ARRAY16=12,
		OBJECT=13;
	fio.read1DB=function(buffer) {
		var	dataArray=new Uint8Array(buffer),
			dataView=new DataView(buffer);
		for(var i=0, j=0, len=0, dataType=0, str="", output=[]; i<buffer.byteLength; ++i) {
			dataType=dataArray[i];
			if(dataType===STRING) {
				for(j=0, len=dataArray[(i+=2)-1], str=[]; j<len; ++j) {
					str[j]=dataArray[i+j];
					}
				output.push(String.fromCharCode.apply(null, str));
				i+=j-1;
				}
			else if(dataType===STRING16) {
				for(j=0, len=dataView.getUint16((i+=3)-1), str=[]; j<len; ++j) {
					str[j]=dataArray[i+j];
					}
				output.push(String.fromCharCode.apply(null, str));
				i+=j-1;
				}
			else output.push(
				dataType===INT8?
					dataArray[++i]:
				dataType===INT8N?
					-dataArray[++i]:
				dataType===INT16?
					dataView.getUint16((i+=2)-1):
				dataType===INT16N?
					-dataView.getUint16((i+=2)-1):
				dataType===INT32?
					dataView.getUint32((i+=4)-3):
				dataType===INT32N?
					-dataView.getUint32((i+=4)-3):
				dataType===FLOAT32?
					dataView.getFloat32((i+=4)-3):
				dataType===BUFFER?
					buffer.slice(++i+1, (i+=dataArray[i])+1):
				dataType===BUFFER16?
					buffer.slice(++i+1, (i+=dataView.getUint16(i))+2):
				dataType===ARRAY?
					fio.read1DB(buffer.slice(++i+1, (i+=dataArray[i])+1)):
				dataType===ARRAY16?
					fio.read1DB(buffer.slice(++i+1, (i+=dataView.getUint16(i))+2)):
					undefined
				);
			}
		return output;
		};
	fio.write1DB=function(array) {
		if(array.constructor!==Array) array=arguments;
		for(var i=0; i<array.length; ++i) {
			if(array[i].constructor===Array) {
				(array[i]=fio.write1DB(array[i])).type=ARRAY;
				}
			}
		for(var i=0, j=0, ins=0, data=null; i<array.length; ++i) {
			data=array[i];
			if(data.constructor===Number) {
				if(Math.abs(data)>>>0!==Math.abs(data)) {
					TEMP[ins]=FLOAT32;
					TEMPDV.setFloat32((ins+=5)-4, data);
					}
				else if(data>0xffff) {
					TEMP[ins]=INT32;
					TEMPDV.setUint32((ins+=5)-4, data);
					}
				else if(data<-0xffff) {
					TEMP[ins]=INT32N;
					TEMPDV.setUint32((ins+=5)-4, -data);
					}
				else if(data>0xff) {
					TEMP[ins]=INT16;
					TEMPDV.setUint16((ins+=3)-2, data);
					}
				else if(data<-0xff) {
					TEMP[ins]=INT16N;
					TEMPDV.setUint16((ins+=3)-2, -data);
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
			else if(data.constructor===String) {
				if(data.length>0xff) {
					TEMP[ins]=STRING16;
					TEMPDV.setUint16(++ins, data.length);
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
			else if(data.constructor===ArrayBuffer) {
				if(data.byteLength>0xff) {
					TEMP[ins]=data.type?ARRAY16:BUFFER16;
					TEMPDV.setUint16(++ins, data.byteLength);
					}
				else {
					TEMP[ins]=data.type||BUFFER;
					TEMP[ins+1]=data.byteLength;
					}
				TEMP.set(new Uint8Array(data), ins+2);
				ins+=2+data.byteLength;
				}
			}
		return TEMP.buffer.slice(0, ins);
		};
	fio.handle1DB=function(callback) {
		return function(buffer) {
			callback.apply(this, fio.read1DB(buffer));
			};
		};
	fio.handleMTB=function() {
		var	_types={
			Int8: 1,
			Uint8: 1,
			Int16: 2,
			Uint16: 2,
			Int32: 4,
			Uint32: 4,
			Float32: 4,
			Float64: 8
			};
		return function() {
			var	view=null,
				types=new Array(arguments.length-1),
				offset=new Uint8Array(types.length),
				output=new Float64Array(types.length);
			for(var i=0; i<types.length; ++i) {
				types[i]="get"+arguments[i];
				offset[i]=i?offset[i-1]+_types[arguments[i-1]]:0;
				}
			var	callback=arguments[i];
			return function(buffer) {
				view=new DataView(buffer);
				for(i=0; i<output.length; ++i) {
					output[i]=view[types[i]](offset[i]);
					}
				callback.apply(this, output);
				}
			};
		}();
	window.fio=fio;
	})();