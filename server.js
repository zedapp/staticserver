var http = require("zed/http");
var fs = require("zed/fs");
var configFs = require("zed/config_fs");
var ui = require("zed/ui");

var mimeTypes = require("./mime_types");
// TODO: make this configurable

function getContentType(path) {
    var parts = path.split('.');
    var ext = parts[parts.length - 1];
    return mimeTypes[ext] || "application/octet-stream";
}

function serveFileListing() {
    return fs.listFiles().then(function(allFiles) {
        var html = "<body><h1>File listing</h1><ul>";
        allFiles.forEach(function(path) {
            html += "<li><a href='" + path + "'>" + path + "</a></li>";
        });
        html += "<ul></body>";
        return {
            status: 200,
            headers: {
                "Content-Type": "text/html",
            },
            body: html
        };
    });
}

function requestHandler(fs, prefix, req) {
    var path = req.path;
    var pathParts = path.split('/');
    var isDir = path[path.length - 1] === '/' || pathParts[pathParts.length - 1].indexOf('.') === -1;
    if (isDir) {
        // Let's normalize the path a bit
        if (path[path.length - 1] === "/") {
            path = path.substring(0, path.length - 1);
        }

        return fs.readFile(prefix + path + "/index.html", true).then(function(content) {
            return {
                status: 200,
                headers: {
                    "Content-Type": "text/html"
                },
                body: content
            };
        }, function() {
            return serveFileListing();
        });
    } else {
        return fs.readFile(prefix + path, true).then(function(content) {
            return {
                status: 200,
                headers: {
                    "Content-Type": getContentType(path)
                },
                body: content
            };
        }, function() {
            return {
                status: 404,
                headers: {
                    "Content-Type": "text/plain"
                },
                body: "Not found"
            };
        });
    }
}

module.exports = function(info) {
    switch (info.action) {
        case 'start':
            http.startServer("staticserver", "Tools:Static Server:Request").then(function(url) {
                console.log("Listening on", url);
                ui.openUrl(url);
            });
            break;
        case 'request':
            var fs_ = fs;
            if(info.fs === "config") {
                fs_ = configFs;
            }
            var prefix = info.prefix || "";
            return requestHandler(fs_, prefix, info.request);
        case 'stop':
            http.stopServer("staticserver");
            break;
    }
};
