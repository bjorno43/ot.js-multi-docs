var fs = require('fs');
var express = require('express');
var app = express();
var https = require('https');
var docId = 0;

var EditorSocketIOServer = require('./ot.js/editor-socketio-server.js');
var server = new EditorSocketIOServer();

server.loadGroupsAndDocs('./groups/');

// Certificate
const privateKey = fs.readFileSync('./your_private_key.pem', 'utf8');
const certificate = fs.readFileSync('./your_fullchain.pem', 'utf8');

const credentials = {
	key: privateKey,
	cert: certificate
};

app.use('/ot.js', express.static('ot.js'));
app.use('/node_modules', express.static('node_modules'));
app.use('/client', express.static("client"));

const httpsServer = https.createServer(credentials, app);

app.get('/', function(req, res){
	if(req.query.page !== undefined && req.query.page !== ''){
		res.sendFile(__dirname + '/client/page.html');
		docId = req.query.page;
	} else {
		res.sendFile(__dirname + '/client/index.html');
	}
});

httpsServer.listen(3000, function(){
	console.log('listening on *:3000');
});


var io = require('socket.io').listen(httpsServer);

io.set('origins', 'https://icecub.nl:*');

io.set('transports', ['websocket',
    'flashsocket',
    'htmlfile',
    'xhr-polling',
    'jsonp-polling',
    'polling']);

io.on('connection', function(socket) {
	server.registerOpenDoc(socket);
	if(docId === 0){
		server.addClient(socket, socket.handshake.query.groupid);
	} else {
		server.joinDoc(socket, docId);
		docId = 0;
	}
});
