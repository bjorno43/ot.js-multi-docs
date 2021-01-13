# ot.js multi-docs
Attempt to make ot.js support multiple documents

## Development
```
npm install
npm start
```

## How it works
- Make sure you edit server.js with your SSL certificate data first!!! Or modify it to use http instead of https
- To create a new group, simply visit the url where this app is running
- The url should automatically be replaced with `url?groupId=###`
- Share the full url including the groupId param for others to join the group instead of creating a new one
- Within the group, new documents will be shared amongst the group. They can be opened in tabs and collaborated on
- Right click tabs to close them (the download function does not work yet!)

## Useful info
- Documents are currently saved as plain text files. May have to implement a database for this later on
- Saving happens automatically upon 5 seconds of inactivity since the last edit was made

## Known bugs
- CodeMirror instances in different tabs sometimes refuse to update the viewer when switching tabs until you click on them
- If the server is restarted while clients are still trying to reconnect, the old instances on the clients become obsolete and new ones are added, resulting in double file names on the list
- It does not work properly on mobile devices. This is a CodeMirror 5 limitation. Will be fixed when version 6 is released and I can update this code for it

## Confirmed feature plans
- Make the download option work
- Add the option to share urls directly to a single document only as not to expose all files within a group
- Make New Document button interactive to select programming language, choose file name, folder stucture etc
- Add a chat system to allow groups to communicate
- Rework client side design to make it a lot more attractive than this basic design used for testing

## Possible feature plans
- Make sure that cursor colors remain the same throughout all documents to enable recognising users
- Add WebRTC to allow voice / video communication
- Add login system to enable privacy
- Add group owner admin features like revoking edit rights and removing users

## License
MIT
