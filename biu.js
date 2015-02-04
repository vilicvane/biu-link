var fs = require('fs');
var express = require('express');
var bodyParseer = require('body-parser');
var hop = Object.prototype.hasOwnProperty;
var app = express();
app.use(bodyParseer.json());
app.use(bodyParseer.urlencoded());
var staticFiles = [
    'robots.txt',
    'favicon.ico'
];
var config = require('./config.json');
var linksFile = config['links-file'] || 'links.txt';
var urlRegex = new RegExp(config['url-regex'] || '^\\w+:\\S+$');
var pathRegex = new RegExp(config['path-regex'] || '.');
var entrance = config.entrance || '/';
if (!/^\//.test(entrance)) {
    entrance = '/' + entrance;
}
var entrancePath = entrance.substr(1);
var linksMap;
var lastGeneratedPath = '09';
readLinks();
var updatingLinksFile = false;
fs.watch(linksFile, function (file) {
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
    (fs.readFileSync(linksFile, 'utf-8').match(/.+/g) || []).forEach(function (line, lineNumber) {
        var groups = /^(=)?([^ ]+) (.+)$/.exec(line);
        if (groups) {
            if (!groups[1]) {
                // it's generated
                lastGeneratedPath = groups[2];
            }
            linksMap[groups[2]] = groups[3];
        }
        else {
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
var pathNextCharsMap = {};
pathChars.forEach(function (chr, i) {
    pathNextCharsMap[chr] = pathChars[i + 1];
});
function nextPath() {
    var lastPathChars = lastGeneratedPath.split('');
    var allLower = true;
    var allNumber = true;
    var indexes = [];
    lastPathChars.reverse();
    var pathRawChars = [];
    var carry = true;
    var length = lastPathChars.length;
    var halfLength = Math.ceil(length / 2);
    var index;
    for (var i = 0; i < length; i++) {
        if (i < halfLength) {
            index = i * 2;
        }
        else {
            index = (i - halfLength) * 2 + 1;
        }
        var chr = lastPathChars[index];
        if (carry) {
            chr = pathNextCharsMap[chr];
            if (chr) {
                carry = false;
            }
            else {
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
    }
    else if (allLower) {
        pathRawChars[0] = pathCharsFirstUpper;
    }
    var pathChars = [];
    length = pathRawChars.length;
    halfLength = Math.ceil(length / 2);
    for (var i = 0; i < length; i++) {
        if (i < halfLength) {
            index = i * 2;
        }
        else {
            index = (i - halfLength) * 2 + 1;
        }
        pathChars[index] = pathRawChars[i];
    }
    var path = pathChars.reverse().join('');
    lastGeneratedPath = path;
    if (!isPathAvailable(path)) {
        return nextPath();
    }
    else {
        return path;
    }
}
function isPathAvailable(path, ignoreExists) {
    if (ignoreExists === void 0) { ignoreExists = false; }
    return !(path == entrancePath || staticFiles.indexOf(path) >= 0 || (!ignoreExists && hop.call(linksMap, path)));
}
function isPathValid(path) {
    return pathRegex.test(path) && encodeURIComponent(path) == path;
}
var apisMap = {
    "add": function (req, res) {
        var path = req.body.path;
        var url = req.body.url;
        var force = req.body.force;
        var prefix;
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
        }
        else {
            path = nextPath();
            prefix = '';
        }
        linksMap[path] = url;
        var line = prefix + path + ' ' + url + '\r\n';
        updatingLinksFile = true;
        fs.appendFileSync(linksFile, line);
        setTimeout(function () {
            updatingLinksFile = false;
        }, 100);
        res.json({
            path: path
        });
    }
};
app.all(entrance, function (req, res, next) {
    var type = req.body.type;
    console.log(type);
    if (type && hop.call(apisMap, type)) {
        apisMap[type](req, res, next);
    }
    else {
        res.sendFile(__dirname + '/entrance.html');
    }
});
if (entrancePath) {
    app.get('/', function (req, res) {
        res.sendFile(__dirname + '/index.html');
    });
}
app.get(/^\/(.+)/, function (req, res) {
    var path = req.params[0];
    if (staticFiles.indexOf(path) >= 0) {
        res.sendFile(__dirname + '/' + path);
    }
    else if (hop.call(linksMap, path)) {
        res.redirect(linksMap[path]);
    }
    else {
        res.redirect('/');
    }
});
var port = config.port || process.env.PORT || 80;
app.listen(port);
console.log('biu has started.');
console.log('listening to port ' + port);
//# sourceMappingURL=biu.js.map