'use strict';

var EventEmitter     = require('events').EventEmitter;
var TextOperation    = require('./text-operation');
var WrappedOperation = require('./wrapped-operation');
var Server           = require('./server');
var Selection        = require('./selection');
var util             = require('util');
var fs				 = require('fs');
var path			 = require('path');

function EditorSocketIOServer (mayWrite) {
	EventEmitter.call(this);
	Server.call(this);
	this.users = {};
	this.docIds = [];
	this.groupIds = [];
	this.groupsObject = {};
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

EditorSocketIOServer.prototype.loadGroupsAndDocs = function (dir){
	var self = this;

	fs.readdir(dir, (err, folders) => {
		if (err) {
			console.error(err);
			return;
		}
		folders.forEach(folder => {
			var file = path.resolve(dir, folder);
			fs.stat(file, function(err, stat) {
				if (stat && stat.isDirectory()) {
					// Create the group
					self.groupsObject[folder] = {};
					self.groupsObject[folder].docs = [];
					self.groupIds.push(folder);

					fs.readdir(dir + '/' + folder + '/', (err, files) => {
						if (err) {
							console.error(err);
							return;
						}
						files.forEach(docu => {
							var docuId = path.resolve(dir + '/' + folder + '/', docu);
							fs.stat(docuId, function(err2, stat2) {
								if (stat2 && stat2.isDirectory()) {
									self.groupsObject[folder].docs.push({name: docu, timer:null});
									self.docIds.push(docu);

									fs.readFile(dir + '/' + folder + '/' + docu + '/document.txt', 'utf8', function(err, data) {
										if (err) {
											console.error(err);
											return;
										}
										self.createDoc(data, docu, []);
									});
								}
							});
						});
					});
				}
			});
		});
	});
	
	
	
	/*fs.readdir(dir, function(err, list) {
		if (err) return done(err);
		var i = 0;
		(function next() {
			var file = list[i++];
			if (!file) return done(null, results);
			file = path.resolve(dir, file);
			fs.stat(file, function(err, stat) {
				if (stat && stat.isDirectory()) {
					self.loadGroupsAndDocs(file, function(err, res) {
						results = results.concat(res);
						next();
					});
				} else {
					results.push(file);
					next();
				}
			});
		})();
	});*/
}

EditorSocketIOServer.prototype.makeDoc = function(document, docId, operations, groupId, docName){
	var self = this;
	const findDocId = (el) => el === docId;
	if(this.docIds.findIndex(findDocId) !== -1){
		return;
	}
	this.groupsObject[groupId].docs.push({name: docName, timer:null});
	this.createDoc(document, docId, operations);
	this.docIds.push(docId);

	const path = './groups/'+groupId+'/';

	let groupExists = false;
	let docFolderExists = false;
	let docExists = false;

	if(fs.existsSync(path)) {
		groupExists = true;
	}

	if(fs.existsSync(path+'/'+ docId +'/')) {
		docFolderExists = true;
	}

	if(!groupExists){
		fs.mkdir(path, 0o0755, function(err) {
			if (err) {
				console.error(err);
				return;
			}
		});
	}

	if(!docFolderExists){
		fs.mkdir(path+'/'+ docId +'/', 0o0755, function(err) {
			if (err) {
				console.error(err);
				return;
			}
		});
	}

	fs.writeFile(path +'/'+ docId +'/' + 'document.txt', self.documents[docId], function (err) {
		if (err) {
			console.error(err);
			return;
		}
	});

	/*fs.access(path, fs.F_OK, (err) => {
		if (err) {
			fs.mkdir(path, 0o0755, function(err) {
				if (err) {
					console.error(err);
					return;
				}

				fs.mkdir(path+'/'+ docId +'/', 0o0755, function(err) {
					if (err) {
						console.error(err);
						return;
					}

					fs.writeFile(path +'/'+ docId +'/' + 'document.txt', self.documents[docId], function (err) {
						if (err) {
							console.error(err);
							return;
						}
					});
				});
			});
		} else {
			fs.access(path+'/'+ docId +'/', fs.F_OK, (err) => {
				if (err) {
					fs.mkdir(path+'/'+ docId +'/', 0o0755, function(err) {
						if (err) {
							console.error(err);
							return;
						}

						fs.writeFile(path +'/'+ docId +'/' + 'document.txt', self.documents[docId], function (err) {
							if (err) {
								console.error(err);
								return;
							}
						});
					});
				} else {
					fs.writeFile(path +'/'+ docId +'/' + 'document.txt', self.documents[docId], function (err) {
						if (err) {
							console.error(err);
							return;
						}
					});
				}
			});
		}
	});*/
}

EditorSocketIOServer.prototype.joinDoc = function(socket, docId){
	socket.join(docId);
}

EditorSocketIOServer.prototype.joinGroup = function(socket, groupId){
	// Check if group already exists
	const findGroupId = (el) => el === groupId;

	// Make new group if it doesn't
	if(this.groupIds.findIndex(findGroupId) === -1){
		this.groupsObject[groupId] = {};
		this.groupsObject[groupId].docs = [];
		this.groupIds.push(groupId);
	}

	// Join the group
	socket.join(groupId);

	// Inform client about any existing documents within the group
	this.initDocuments(socket, groupId);
}

EditorSocketIOServer.prototype.initDocuments = function (socket, groupId) {
	const docsArr = [];
	if(this.groupsObject[groupId].docs.length > 0){
		this.groupsObject[groupId].docs.forEach(function(obj){
			docsArr.push(obj.name);
		});
	}

	socket.send(JSON.stringify(docsArr));
}

EditorSocketIOServer.prototype.registerOpenDoc = function (socket){
	var self = this;
	var s = socket;
	socket
		.on('opendoc', function (docName, groupId) {
			self.makeDoc("", docName, [], groupId, docName);
			self.joinDoc(socket, docName);
			s.emit('doc', {
				str: self.documents[docName],
				revision: self.docOperations[docName].length,
				clients: self.users,
				docId: docName
			});
		});
}

EditorSocketIOServer.prototype.addClient = function (socket, groupId) {
	var self = this;
	var s = socket;
	this.joinGroup(socket, groupId);
	/*if(this.docOperations[docId] === undefined){
		this.makeDoc("", docId, [], groupId, docName);
		socket.broadcast['in'](groupId).emit(
			'newdoc', {doc:docName}
		);
	}*/
	socket
		/*.emit('doc', {
			str: this.documents[docId],
			revision: this.docOperations[docId].length,
			clients: this.users,
			docId: docId
		})*/
		.on('newdoc', function (docId) {
			s.broadcast['in'](groupId).emit(
				'newdoc', {doc:docId}
			);
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
				self.onOperation(socket, docId, revision, operation, selection, groupId);
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

EditorSocketIOServer.prototype.saveDocument = function (docId, groupId){
	const path = './groups/'+groupId+'/'+docId+'/document.txt';

	fs.access(path, fs.F_OK, (err) => {
		if (err) {
			console.error(err);
			return;
		}

		fs.writeFile(path, this.documents[docId], function (err) {
			if (err) {
				console.error(err);
				return;
			}
			console.log('Saved!');
		});
	});
}

EditorSocketIOServer.prototype.onOperation = function (socket, docId, revision, operation, selection, groupId) {
	for(let i = 0; i < this.groupsObject[groupId].docs.length; i++){
		if(this.groupsObject[groupId].docs[i].name === docId){
			if(this.groupsObject[groupId].docs[i].timer !== null){
				clearTimeout(this.groupsObject[groupId].docs[i].timer);
			}
		}
	}
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
		var self = this;
		for(let i = 0; i < this.groupsObject[groupId].docs.length; i++){
			if(this.groupsObject[groupId].docs[i].name === docId){
				this.groupsObject[groupId].docs[i].timer = setTimeout(function(){
					self.saveDocument(docId, groupId);
				}, 5000);
				break;
			}
		}
		
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
	socket.broadcast['in'](docId).emit('set_name', clientId, name, docId);
};

EditorSocketIOServer.prototype.setClient = function (socket) {
	this.users[socket.id] = {};
}

EditorSocketIOServer.prototype.getClient = function (clientId) {
	return this.users[clientId] || (this.users[clientId] = {});
};

EditorSocketIOServer.prototype.onDisconnect = function (socket, docId) {
	var clientId = socket.id;
	delete this.users[clientId];
	socket.broadcast['in'](docId).emit('client_left', clientId);
};

module.exports = EditorSocketIOServer;
