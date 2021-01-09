# ot.js multi-docs
Attempt to make ot.js support multiple documents

## Development
```
npm install
npm start
```

## How it works
- Browse to url with a page param: url:3000?page=x
- Replace x with some random id. Number is probably safest
- Anyone visiting the url with the same param id will get the same document
- Others can visit other random document id's to have their own document

## License
MIT
