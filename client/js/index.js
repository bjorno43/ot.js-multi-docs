var docsOpen = 0;
var socket;
var groupId = "";
var docIds = [];
var docs = {};

$(document).ready(function(){
	$('.sidenav').sidenav();

	document.getElementById('btnNewDoc').addEventListener('click', function(e){
		e.preventDefault();

		const docName = Date.now().toString(36) + Math.random().toString(36).substr(2);
		addTab(docName);
		socket.emit('newdoc', docName);
		createButton(docName);
	});
	const url = new URL(window.location.href);
	const group = url.searchParams.get('groupId');

	// Check if a group UID was given in the url. If not, generate a random new one
	if(group === null || group === undefined || group === ""){
		groupId = Date.now().toString(36) + Math.random().toString(36).substr(2);
		window.location.href = window.location.href + '?groupId='+ groupId;
	} else {
		groupId = group;
	}

	socket = io.connect('', {query: 'groupid='+groupId});

	// Initial message only, used to gather the list of documents within the group
	socket.on('message', function(data){
		const docs = JSON.parse(data);
		createButtons(docs);
	});

	socket.on('newdoc', function(data){
		createButton(data.doc);
	});

	socket.on('doc', function(data) {
		const cm = CodeMirror.fromTextArea(document.getElementById('txt-'+data.docId), {lineNumbers: true, mode: "javascript"})
		cm.setValue(data.str);
		const serverAdapter = new ot.SocketIOAdapter(socket);
		const editorAdapter = new ot.CodeMirrorAdapter(cm);
		const client = new ot.EditorClient(data.docId, data.revision, data.clients, serverAdapter, editorAdapter);

		docs[data.docId] = client;
    });

	socket.on('client_left', function (clientId, docId) {
		for (var docId in docs) {
			if(docs.hasOwnProperty(docId)) {
				docs[docId].serverAdapter.trigger('client_left', clientId);
			}
		}
	});

	socket.on('set_name', function (clientId, name, docId) {
		docs[docId].serverAdapter.trigger('set_name', clientId, name);
	});

	socket.on('ack', function (docId) { docs[docId].serverAdapter.trigger('ack', docId); })
	socket.on('operation', function (clientId, docId, operation, selection) {
		docs[docId].serverAdapter.trigger('operation', docId, operation);
		docs[docId].serverAdapter.trigger('selection', clientId, docId, selection);
	});

	socket.on('selection', function (clientId, docId, selection) {
		docs[docId].serverAdapter.trigger('selection', clientId, docId, selection);
	});

	socket.on('reconnect', function (docId) {
		for (var docId in docs) {
			if(docs.hasOwnProperty(docId)) {
				docs[docId].serverAdapter.trigger('reconnect');
			}
		}
	});
});

function createButtons(docs){
	docs.forEach(function(doc){
		createButton(doc);
	});
}

function createButton(doc){
	$("#slide-out").append("<li><a class='waves-effect' onclick='addTab(\""+doc+"\")' href='#'>"+doc+"</a></li>");
}

function addTab(docName)
{
	if($("#tab-"+docName).length){
		const instance = M.Tabs.getInstance(document.getElementById('documents'));
		instance.select('tabC-'+docName);
	} else {
		$("#documents").children().removeAttr('style');
		$("#documents").append("<li id='tab-"+docName+"' class='tab col s1'><a class='tabMenu' href='#tabC-"+docName+"'>"+docName+"</a></li>");
		//$("#docContents").append("<div id='tabC-"+docName+"' class='col s12'><iframe src='https://icecub.nl:3000?page="+docName+"&groupid="+groupId+"' width='500' height='800' frameBorder='0'></iframe></div>");
		$("#docContents").append("<div id='tabC-"+docName+"' class='col s12 maxSize'><textarea id='txt-"+docName+"'></textarea></div>");

		$('.tabs').tabs();
		const instance = M.Tabs.getInstance(document.getElementById('documents'));
		instance.select('tabC-'+docName);

		docsOpen++;
		socket.emit('opendoc', docName, groupId);
	}
}

function removeTab(docName){
	$("#documents").children().removeAttr('style');
	$("#tabC-"+docName).remove();
	$("#tab-"+docName).remove();

	docsOpen--;

	if(docsOpen > 0){
		$('.tabs').tabs();
	}
}