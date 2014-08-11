# Biu v0.1

A simple URL shorter.

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