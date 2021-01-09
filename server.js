var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var docId = 0;

var EditorSocketIOServer = require('./ot.js/editor-socketio-server.js');
//var server = new EditorSocketIOServer("", [], 1);
var server = new EditorSocketIOServer();

app.get('/', function(req, res){
	if(req.query.page === undefined || req.query.page === ''){
		docId = 1;
	} else {
		docId = req.query.page;
	}
	server.makeDoc("Document "+docId, docId, []);
	res.sendFile(__dirname + '/index.html');
});

app.use('/ot.js', express.static('ot.js'));
app.use('/node_modules', express.static('node_modules'));

http.listen(3000, function(){
	console.log('listening on *:3000');
});

io.on('connection', function(socket) {
	server.joinDoc(socket, docId);
	server.addClient(socket, docId);
});
