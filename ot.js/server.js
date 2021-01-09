if (typeof ot === 'undefined') {
	var ot = {};
}

ot.Server = (function (global) {
	'use strict';

	// Constructor. Takes the current document as a string and optionally the array
	// of all operations.
	function Server () {
		this.documents = {};
		this.docOperations = {};
	}

	Server.prototype.createDoc = function(document, docId, operations) {
		this.documents[docId] = document;
		this.docOperations[docId] = operations || [];
	}

	// Call this method whenever you receive an operation from a client.
	Server.prototype.receiveOperation = function (docId, revision, operation) {
		if (revision < 0 || this.docOperations[docId].length < revision) {
			throw new Error("operation revision not in history");
		}

		// Find all operations that the client didn't know of when it sent the
		// operation ...
		var concurrentOperations = this.docOperations[docId].slice(revision);

		// ... and transform the operation against all these operations ...
		var transform = operation.constructor.transform;

		for (var i = 0; i < concurrentOperations.length; i++) {
			operation = transform(operation, concurrentOperations[i])[0];
		}

		// ... and apply that on the document.
		this.documents[docId] = operation.apply(this.documents[docId]);

		// Store operation in history.
		this.docOperations[docId].push(operation);

		// It's the caller's responsibility to send the operation to all connected
		// clients and an acknowledgement to the creator.
		return operation;
	};

	return Server;

}(this));

if (typeof module === 'object') {
	module.exports = ot.Server;
}