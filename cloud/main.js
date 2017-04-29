
Parse.Cloud.define('hello', function(req, res) {
    res.success('Hi');
});

// Create a new session entry if we need to
Parse.Cloud.beforeSave('LogEntry', function(request, response) {


    console.log("Running before save function");

    var q = new Parse.Query(Parse.Object.extend('LogSession'));
    q.equalTo('user', request.user);
    q.descending('createdAt');
    q.find({useMasterKey:true}).then(function(sessions) {


        console.log("Found " + sessions.length + " sessions");
        var d = new Date();

        var logSession;

        if(sessions.length == 0) {
            var LogSession = Parse.Object.Extend('LogSession');
            logSession = new LogSession();
        }
        else {
            var lastSession = sessions[0];
            var lastDate = lastSession.get('lastGameDate');

            if(d.getTime() - lastDate.getTime() > 1000*60*60) { // one hour has passee
                var LogSession = Parse.Object.Extend('LogSession');
                logSession = new LogSession();
            }
            else {
                logSession = lastSession;
            }
        }

        console.log("Saving log session");
        request.object.set({'logSession' : logSession});
        logSession.save({
            lastGameDate : d,
            user : request.user
        },{useMasterKey:true});

        response.success();

    }, function(err) {
        response.error(err);
    })
});

