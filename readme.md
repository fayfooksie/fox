## fio (fox i/o)
Optimized WS system for node.js using latest web technology. No fallbacks. No error-checking.

Requires rfc6455 and ArrayBuffer support.

### why?
Bandwidth. Aside from seamlessly replacing event names with 8bit integers, data itself may easily be compressed.

	data=[123,456,78910,"hello world",123.456,Infinity];
	JSON.stringify(data).length;
	// 42
	fio.write1DB(data).byteLength;
	// 33

If you're concerned about costs (especially for real-time games), you may find this useful. If you're concerned about compatibility, *leave this accursed place*.

##fio-server.js
`require` this file in your server app. Obviously.

###defining events
Events are predefined in fio-server using `server.allEvents`. All sockets share the same events, so they are defined prior to connection.

	var	server=new fio.Server({
			port: 4444
			});
	server.allEvents({
		ping: function(pong) {
			this.send("ping", pong);
			}
		});

`this` keyword is set to the socket receiving the event. If you need to access the socket within another function, simply use the old `var socket=this`

**warning:** all event names must be defined in `server.allEvents`, even if they are only used to send data to the client (never receiving). If you have events without listeners, just set them to `null`

###sending data
Simple as `socket.send("event", data1, data2, data3, ...)`

I recommend you to compress data into a single argument, however. Use `fio.write1DB` and `fio.read1DB` to do so.

###open / close

	server.on("connection", function(socket) { ... });
	server.on("close", function(event) { ... });

##fio-client.js
Like any other JS file. I recommend referencing the global `fio` in an IIFE then deleting it from `window`

###receiving data
Unlike the server, each client needs to define their own events. You can use the traditional `socket.on("event", callback)` to define events on the client side.

###sending data
Again, pretty straightforward. `socket.send("event", data)` Again as well, I suggest condensing this data through `fio.write1DB`

###open / close

	socket=new fox.Socket(location.hostname, 4444);
	socket.on("open", function(event) { ... });
	socket.on("close", function(event) { ... });

##fio.write1DB / fio.read1DB
To compress a 1D array of numbers, strings, and buffers into a single ArrayBuffer:

	socket.send("event", fio.write1DB(data1, data2, data3));

To read this data (client example):

	socket.on("event", function(data) {
		data=fio.read1DB(data);
		// [data1, data2, data3]
		});

**Know your limitations:** Objects (including the Array object) are *not* ideal formats with which to transfer data in a real-time game or whatever. `fio.write1DB` and `fio.read1DB` only work with primitives, which require fewer resources to represent the same data.

####Layered 1DB (multi-DB)
If you would like to transfer an ArrayBuffer representing any other format, it can be stored as well. Consequently, you can simulate a multidimensional array. This is probably never a good idea, though, and as such isn't included.

	fio.writeMDB=function(array) {
		for(var i=0; i<array.length; i++) {
			if(array[i].constructor===Array) {
				array[i]=fio.writeMDB(array[i]);
				}
			}
		return fio.write1DB(array);
		}
	fio.readMDB=function(buffer) {
		for(var i=0; output=fio.read1DB(buffer); i<output.length; i++) {
			if(output[i].constructor===ArrayBuffer) {
				output[i]=fio.readMDB(output[i]);
				}
			}
		return output;
		}

##Disclaimer
I wrote all of this for personal use. If you can think of a way to improve it, that would be appreciated; however, making it "newb-friendly" does not interest me. It should be assumed that users know what they're doing.

And I am fully aware of potential exploits (sending corrupted `1DB` data). This will be patched in the future, however until then it's fairly easy to simply anonymize the host function and authenticate clients upon connection.
