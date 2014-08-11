# Biu v0.1

A simple URL shorter for NodeJS.

As it's designed for private use, considering the links number won't be very large, Biu uses text file instead of a database to store links. And it will read all links data to memory when starts.

Demo http://biu.link

![biu screenshot](/images/screenshot.png?raw=true)

**Hint**  
Click "short it" with meta/ctrl key to ignore existing path and overwrite it.

## Configuration

config.json (the values below are defaults)

```javascript
{
	// the text file that saves links data
	"links-file": "links.txt",

	// a regex (string form) that tests whether the url is valid
	"url-regex": "^\\w+:\\S+$",
	
	// a regex (string form) that tests whether the shorten path is valid
	"path-regex": ".",
	
	// the entrance of this biu
	// change it to something else if you want to use this biu privately
	"entrance": "/",
	
	// port to listen, fallbacks to process.env.PORT or 80
	"port": null
}
```

## API

The API URL is the same as the entrance.

E.g. as http://biu.link has it entrance set to "/", the API URL is http://biu.link/; Or if its entrance is "/xxx", the API is then http://biu.link/xxx.

### Method and Formats

Use POST method to invoke the API. Accepted Content-Type includes urlencoded (application/x-www-form-urlencoded) and JSON (application/json). The response is always in JSON.

### Request Parameters

**type** should always be string "add".  
**url** the url to be shorten.  
**path** (optional) custom path.  
**force** (optional) if path is specified, true to ignore and overwrite if it already exists.  

### Response

#### Success

```typescript
{
	path: string
}
```

Here path is not full url, append it to the base url to make it complete.

#### Error

```typescript
{
	error: {
		message: string,
		code: number
	}
}
```