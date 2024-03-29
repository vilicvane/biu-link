﻿import fs = require('fs');

import express = require('express');
import bodyParser = require('body-parser');

var hop: {
    call(thisArg: any, property: string): boolean;
} = Object.prototype.hasOwnProperty;

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false    
}));

var staticFiles = [
    'robots.txt',
    'favicon.ico'
];

var staticFileHash: IDictionary<void> = {};
staticFiles.forEach(file => staticFileHash[file] = null);

interface IConfig {
    linksFile: string;
    urlRegex: string;
    pathRegex: string;
    entrance: string;
    redirect: string;
    port: number;    
}

var config: IConfig = require('./config.json');

var linksFile = config.linksFile || 'links.txt';
var urlRegex = new RegExp(config.urlRegex || '^\\w+:\\S+$');
var pathRegex = new RegExp(config.pathRegex || '.');
var redirect = config.redirect;

var entrance = config.entrance || '/';

if (!/^\//.test(entrance)) {
    entrance = '/' + entrance;
}

var entrancePath = entrance.substr(1);

var linksMap: IDictionary<string>;
var lastGeneratedPath = '09';

readLinks();

var updatingLinksFile = false;

fs.watch(linksFile, (file) => {
    if (!updatingLinksFile) {
        readLinks();
    }
});

// init
function readLinks() {
    linksMap = {};

    if (!fs.existsSync(linksFile)) {
        fs.appendFileSync(linksFile, '');
        return;
    }

    (fs.readFileSync(linksFile, 'utf-8').match(/.+/g) || []).forEach((line, lineNumber) => {
        var groups = /^(=)?([^ ]+) (.+)$/.exec(line);

        if (groups) {
            if (!groups[1]) {
                // it's generated
                lastGeneratedPath = groups[2];
            }

            linksMap[groups[2]] = groups[3];
        } else {
            console.error('corrupted link information in line ' + (lineNumber + 1));
        }
    });

    if (!entrancePath) {
        // root directory
        return;
    }

    if (hop.call(linksMap, entrancePath)) {
        console.warn('the entrance "/' + entrancePath + '" you are using was an link to ' + linksMap[entrancePath] + ', and using this entrance will disable that link id for redirection.');
    }
}

var pathChars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
var pathCharsFirstLower = 'a';
var pathCharsFirstUpper = 'A';
var pathNextCharsMap: IDictionary<string> = {};

pathChars.forEach((chr, i) => {
    pathNextCharsMap[chr] = pathChars[i + 1];
});

function nextPath() {
    var lastPathChars = lastGeneratedPath.split('');
    var allLower = true;
    var allNumber = true;

    var indexes = [];

    lastPathChars.reverse();

    var pathRawChars: string[] = [];

    var carry = true;

    var length = lastPathChars.length;
    var halfLength = Math.ceil(length / 2);

    var index: number;

    for (var i = 0; i < length; i++) {
        if (i < halfLength) {
            index = i * 2;
        } else {
            index = (i - halfLength) * 2 + 1;
        }

        var chr = lastPathChars[index];

        if (carry) {
            chr = pathNextCharsMap[chr];
            if (chr) {
                carry = false;
            } else {
                chr = pathCharsFirstLower;
            }
        }

        if (/[^a-z]/.test(chr)) {
            allLower = false;
        }

        if (/\D/.test(chr)) {
            allNumber = false;
        }

        pathRawChars.push(chr);
    }

    if (carry) {
        pathRawChars.push(pathCharsFirstLower);
        allNumber = false;
    }

    if (allNumber) {
        pathRawChars[0] = pathCharsFirstLower;
    } else if (allLower) {
        pathRawChars[0] = pathCharsFirstUpper;
    }

    var pathChars: string[] = [];
    length = pathRawChars.length;
    halfLength = Math.ceil(length / 2);

    for (var i = 0; i < length; i++) {
        if (i < halfLength) {
            index = i * 2;
        } else {
            index = (i - halfLength) * 2 + 1;
        }

        pathChars[index] = pathRawChars[i];
    }

    var path = pathChars.reverse().join('');

    lastGeneratedPath = path;

    if (!isPathAvailable(path)) {
        return nextPath();
    } else {
        return path;
    }
}

function isPathAvailable(path: string, ignoreExists = false) {
    return !(path == entrancePath || staticFiles.indexOf(path) >= 0 || (!ignoreExists && hop.call(linksMap, path)));
}

function isPathValid(path: string) {
    return pathRegex.test(path) && encodeURIComponent(path) == path;
}

var apisMap: IDictionary<express.RequestHandler> = {
    "add": (req: express.Request, res: express.Response) => {
        var path: string = req.body.path;
        var url: string = req.body.url;
        var force: boolean = req.body.force;

        var prefix: string;

        if (!urlRegex.test(url)) {
            res.json({
                error: {
                    code: 1011,
                    message: 'url is invalid'
                }
            });
            return;
        }

        if (path) {
            if (path == entrancePath) {
                res.json({
                    error: {
                        code: 1021,
                        message: 'path can\'t be the same as entrance'
                    }
                });
                return;
            }

            if (!isPathValid(path)) {
                res.json({
                    error: {
                        code: 1022,
                        message: 'path is invalid'
                    }
                });
                return;
            }

            if (!isPathAvailable(path, force)) {
                res.json({
                    error: {
                        code: 1023,
                        message: 'path is already taken'
                    }
                });
                return;
            }

            prefix = '=';
        } else {
            path = nextPath();
            prefix = '';
        }

        linksMap[path] = url;
        var line = prefix + path + ' ' + url + '\r\n';

        updatingLinksFile = true;
        fs.appendFileSync(linksFile, line);
        setTimeout(() => {
            updatingLinksFile = false;
        }, 100);

        res.json({
            path: path
        });
    }
};

app.all(entrance, (req, res, next) => {
    var type: string = req.body.type;

    console.log(type);

    if (type && hop.call(apisMap, type)) {
        apisMap[type](req, res, next);
    } else {
        res.sendFile(__dirname + '/entrance.html');
    }
});

if (entrancePath) {
    app.get('/', (req, res) => {
        res.sendFile(__dirname + '/index.html');
    });
}

app.get(/^\/(.+)/, (req, res) => {
    var path: string = req.params[0];

    if (hop.call(staticFileHash, path)) {
        res.sendFile(__dirname + '/' + path);
    } else if (hop.call(linksMap, path)) {
        res.redirect(linksMap[path]);
    } else if (redirect) {
        res.redirect(redirect + path);
    } else {
        res.redirect('/');
    }
});

var port = config.port || process.env.PORT || 1337;
app.listen(port);

console.log('biu has started.');
console.log('listening to port ' + port);