var express = require('express');
var app = express();
var ParseServer = require('parse-server').ParseServer;
var ParseDashboard = require('parse-dashboard');
var path = require('path');
var env = require('node-env-file');


env(__dirname + '/.env');
app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

var databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;
if (!databaseUri) { console.log('DATABASE_URI not specified, falling back to localhost.'); }


var api = new ParseServer({
    databaseURI   : databaseUri || 'mongodb://localhost:27017/dev',
    cloud         : process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
    appId         : process.env.APP_ID || 'OverLog',
    masterKey     : process.env.MASTER_KEY || 'OverLog1234', //Add your master key here. Keep it secret!
    serverURL     : process.env.SERVER_URL || __dirname + '/parse',  // Don't forget to change to https if needed
    // The email adapter and settings
    verifyUserEmails: false,
    publicServerURL: 'https://overlog.herokuapp.com/parse',
    appName: process.env.APP_NAME,
    liveQuery     : {
        classNames: ["Posts", "Comments"] // List of classes to support for query subscriptions
    }
});

// Initialize the parse dashboard
var allowInsecureHttp = true;
var serverUrl = process.env.SERVER_URL || /*__dirname +*/ '/parse';

var dashboard = new ParseDashboard({
    "apps": [
        {
            "serverURL": serverUrl,  // Don't forget to change to https if needed
            "appId": process.env.APP_ID || 'OverView',
            "masterKey": process.env.MASTER_KEY || 'OverView1234',
            "appName": "OverView"

        }
    ],
    "users" : [
        {
            "user" : "overviewadmin",
            "pass" : "bronz3plays!"

        }
    ]
}, allowInsecureHttp);


// make the Parse Dashboard available at /dashboard
app.use('/dashboard', dashboard);


// Client-keys like the javascript key or the .NET key are not necessary with parse-server
// If you wish you require them, you can set them as options in the initialization above:
// javascriptKey, restAPIKey, dotNetKey, clientKey

// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));

// Serve the Parse API on the /parse URL prefix
var mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, api);

// Parse Server plays nicely with the rest of your web routes
app.get('/', function(req, res) {
    res.status(200).send('I dream of being a website. Please star the parse-server repo on GitHub!');
    //res.redirect('https://overlog.herokuapp.com/PetTutorRT/');
});

var port = process.env.PORT || 5000;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function() {
    console.log('OverLog ' + port + '.');
    console.log(serverUrl);
});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);



