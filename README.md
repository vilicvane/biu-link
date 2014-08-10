# Biu v0.1

A simple URL shorter.

![biu screenshot](/images/screenshot.png?raw=true)

**Hint**  
Click "short it" with meta/ctrl key to ignore existing path and overwrite it.

## Configuration

```json
{
	// the text file that saves links data
	"links-file": "links.txt",
	// a regex that tests whether the url is valid
	"url-regex": /^\w+:\S+$/,
	// a regex that tests whether the shorten path is valid
	"path-regex": /./,
	// the entrance of this biu
	"entrance": '/',
	// port to listen, fallbacks to process.env.PORT or 80
	"port": null
}
```