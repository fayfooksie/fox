fio is a simple, optimized websocket wrapper

It creates a comfortable named event structure with minimal overhead (one-time setup and 1 byte representing each event). It also supports transporting buffers and soft reconnection without reconfiguration or setup.

##Client
Example of creating a socket...
```javascript
socket=new fio.Socket(location.hostname, 81);
socket.on("open", function(socket) {
    socket.call("chat", "connected!");
    });
socket.on("chat", function(message) {
    console.log(message);
    });
```

###Client: fio.Socket(host, port, flags)
When creating a socket, you can specify `host` (default `location.hostname`), `port` (required), and `flags` (optional).

- `id` - id # of client
- `flags` - explained below
- `socket` - `WebSocket` object

`flags` is a bit mask which can contain the following values...
```javascript
fio.WAIT // don't connect automatically; use socket.connect()
fio.AUTOCONNECT // automatically reconnect when possible
```
An example socket using both of these flags...
```javascript
socket=new fio.Socket(null, 81, fio.WAIT|fio.AUTOCONNECT);
```

###Client: fio.Socket.prototype
- `.on(event, callback)` - handle data from server
- `.call(event[, object, ...])` - invoke an event like above
- `.send(event[, object, ...])` - send data to the server
- `.close([code, reason])` - close the connection
- `.connect([callback])` - (re)open the connection

##Server
Example of creating a server...
```javascript
lobby=new fio.Server({
    port: 81
    });
lobby.on("chat", function(message) {
    this.broadcast("chat", message);
    });
lobby.on("connection", function(socket) {
    socket.broadcast("chat", socket.id+" joined!");
    });
lobby.on("close", function(socket) {
    socket.broadcast("chat", socket.id+" left!");
    });
```

###Server: fio.Server(settings)
When creating a server, you specify `settings`, which is an object containing information like `settings.port`
- `clients` - array of clients
- `events` - array of events
- `eventKeys` - event name-index object
- `server` - `WebSocket.Server` object

###Server: fio.Server.prototype
- `.on(event[, callback])` - defines event handler for all sockets, called with `this` set to the socket
- `.broadcast(room, event[, object, ...])` - broadcast an event to all sockets in `room` (default `this`)

###Server: fio.Room()
An optional feature is `fio.Room`, basically an object (presently) only containing `clients`: an array of clients in this room. Any object can be a room as long as it has a `clients` property (otherwise you may run into errors broadcasting to a room).

###Server: fio.Room.prototype
- `.send(event[, object, ...])` - send data to each `clients`
- `.broadcast(event[, object, ...])` - same as above

###Server: fio.Client
Object used internally for each client in a server. A `fio.Client` object is passed as `this` in any event called from the server.
- `id` - id # of client
- `ip` - connection ip
- `room` - client's room (default `null`)
- `server` - `fio.Server` object
- `socket` - `WebSocket` object

###Server: fio.Client.prototype
- `.call(event[, object, ...])` - invoke an event on self
- `.send(event[, object, ...])` - send data to the client
- `.join(room)` - add client to a room-like object
- `.leave(room)` - remove client from a room-like object
- `.broadcast(event[, object, ...])` - broadcast an event to all sockets in client's room
- `.close([code, reason])` - close the connection

##Server: fio.Socket
Similar in design to a client `fio.Socket`, allows a node.js app to connect to another node.js app running a `fio.Server`