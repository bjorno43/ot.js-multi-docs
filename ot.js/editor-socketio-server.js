'use strict';

var EventEmitter     = require('events').EventEmitter;
var TextOperation    = require('./text-operation');
var WrappedOperation = require('./wrapped-operation');
var Server           = require('./server');
var Selection        = require('./selection');
var util             = require('util');

function EditorSocketIOServer (mayWrite) {
	EventEmitter.call(this);
	Server.call(this);
	this.users = {};
	this.docIds = [];
	//this.docId = docId;
	this.mayWrite = mayWrite || function (_, cb) { cb(true); };
}

util.inherits(EditorSocketIOServer, Server);
extend(EditorSocketIOServer.prototype, EventEmitter.prototype);

function extend (target, source) {
	for (var key in source) {
		if (source.hasOwnProperty(key)) {
			target[key] = source[key];
		}
	}
}

EditorSocketIOServer.prototype.makeDoc = function(document, docId, operations){
	const findDocId = (el) => el === docId;
	if(this.docIds.findIndex(findDocId) !== -1){
		return;
	}
	this.createDoc(document, docId, operations);
	this.docIds.push(docId);
}

EditorSocketIOServer.prototype.joinDoc = function(socket, docId){
	//const findDocId = (el) => el === docId;

	socket.join(docId);

	//if(this.docIds.findIndex(findDocId) !== -1){
		//console.log(this.docIds.findIndex(findDocId));
		//socket.join(this.docIds.findIndex(findDocId));
	//}
}

EditorSocketIOServer.prototype.addClient = function (socket, docId) {
	var self = this;
	socket
		.emit('doc', {
			str: this.documents[docId],
			revision: this.docOperations[docId].length,
			clients: this.users,
			docId: docId
		})
		.on('operation', function (docId, revision, operation, selection) {
			//if(docId != self.docId){
			//	return;
			//}
			self.mayWrite(socket, function (mayWrite) {
				if (!mayWrite) {
					console.log("User doesn't have the right to edit.");
					return;
				}
				self.onOperation(socket, docId, revision, operation, selection);
			});
		})
		.on('selection', function (docId, obj) {
			//if(docId != self.docId){
			//	return;
			//}
			self.mayWrite(socket, function (mayWrite) {
				if (!mayWrite) {
					console.log("User doesn't have the right to edit.");
					return;
				}
				self.updateSelection(socket, docId, obj && Selection.fromJSON(obj));
			});
		})
		.on('disconnect', function () {
			console.log("Disconnect");
			socket.leave(self.docId);
			self.onDisconnect(socket);
			if (
				(socket.manager && socket.manager.sockets.clients(self.docId).length === 0) || // socket.io <= 0.9
				(socket.ns && Object.keys(socket.ns.connected).length === 0) // socket.io >= 1.0
			) {
				self.emit('empty-room');
			}
		});
};

EditorSocketIOServer.prototype.onOperation = function (socket, docId, revision, operation, selection) {
	var wrapped;
	try {
		wrapped = new WrappedOperation(
			TextOperation.fromJSON(operation),
			selection && Selection.fromJSON(selection)
		);
	} catch (exc) {
		console.error("Invalid operation received: " + exc);
		return;
	}

	try {
		var clientId = socket.id;
		var wrappedPrime = this.receiveOperation(docId, revision, wrapped);
		//console.log("new operation: " + JSON.stringify(wrapped));
		this.getClient(clientId).selection = wrappedPrime.meta;
		socket.emit('ack', docId);
		//socket.broadcast['in'](docId).emit('ack', docId);
		socket.broadcast['in'](docId).emit(
			'operation', clientId, docId,
			wrappedPrime.wrapped.toJSON(), wrappedPrime.meta
		);
	} catch (exc) {
		console.error(exc);
	}
};

EditorSocketIOServer.prototype.updateSelection = function (socket, docId, selection) {
	var clientId = socket.id;
	if (selection) {
		this.getClient(clientId).selection = selection;
	} else {
		delete this.getClient(clientId).selection;
	}
	socket.broadcast['in'](docId).emit('selection', clientId, docId, selection);
};

EditorSocketIOServer.prototype.setName = function (socket, name, docId) {
	var clientId = socket.id;
	this.getClient(clientId).name = name;
	socket.broadcast['in'](docId).emit('set_name', clientId, name);
};

EditorSocketIOServer.prototype.getClient = function (clientId) {
	return this.users[clientId] || (this.users[clientId] = {});
};

EditorSocketIOServer.prototype.onDisconnect = function (socket, docId) {
	var clientId = socket.id;
	delete this.users[clientId];
	socket.broadcast['in'](docId).emit('client_left', clientId);
};

module.exports = EditorSocketIOServer;
