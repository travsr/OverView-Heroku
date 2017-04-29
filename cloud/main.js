
Parse.Cloud.define('hello', function(req, res) {
    res.success('Hi');
});

// Create a new logSession when a log entry is saved if we need to
Parse.Cloud.beforeSave('LogEntry', function(request, response) {

    var q = new Parse.Query(Parse.Object.extend('LogSession'));
    q.equalTo('user', request.user);
    q.descending('createdAt');
    q.find({useMasterKey:true}).then(function(sessions) {


        console.log("Found " + sessions.length + " sessions");
        var d = new Date();

        var logSession;

        if(sessions.length == 0) {
            var LogSession = Parse.Object.extend('LogSession');
            logSession = new LogSession();
        }
        else {
            var lastSession = sessions[0];
            var lastDate = lastSession.get('lastGameDate');

            if(d.getTime() - lastDate.getTime() > 1000*60*60) { // one hour has passee
                var LogSession = Parse.Object.extend('LogSession');
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

// Count up wins/draws/losses in this log session
Parse.Cloud.afterDelete('LogEntry', function(request, response) {

    var logSession = request.object.get('logSession');

    if (logSession) {

        var q = new Parse.Query(Parse.Object.extend('LogEntry'));
        q.equalTo('logSession', logSession);
        q.find({useMasterKey: true}).then(function (logEntries) {

            var wins, losses, draws, summary;

            summary = [];
            wins = 0;
            losses = 0;
            draws = 0;

            logEntries.forEach(function (entry) {
                var result = entry.get('result');
                summary.push(result);

                if (result == 'win') {
                    wins++;
                }
                else if (result == 'loss') {
                    losses++;
                }
                else if (result == 'draw') {
                    draws++;
                }
            });

            logSession.save({
                wins: wins,
                losses: losses,
                draws: draws,
                summary: summary
            }).then(function () {
                response.success();
            });

        }, function (err) {

            response.error(err);
        });
    }
    else
    {
        response.success();
    }

});


// Count up wins/draws/losses in this log session
Parse.Cloud.beforeSave('LogSession', function(request, response) {


    var q = new Parse.Query(Parse.Object.extend('LogEntry'));
    q.equalTo('logSession', request.object);
    q.find({useMasterKey : true}).then(function(logEntries) {

        var wins, losses, draws, summary;

        summary = [];
        wins = 0; losses = 0; draws = 0;


        logEntries.forEach(function(entry) {
            var result = entry.get('result');

            summary.push( result );

            if(result == 'win') {
                wins++;
            }
            else if(result == 'loss') {
                losses++;
            }
            else if(result == 'draw') {
                draws++;
            }

        });


        request.object.set({
            wins : wins,
            losses : losses,
            draws : draws,
            summary : summary
        });

        response.success();

    }, function(err) {

        response.error(err);
    });

});


// Count up wins/draws/losses in this log session
Parse.Cloud.beforeSave('LogSession', function(request, response) {


    var q = new Parse.Query(Parse.Object.extend('LogEntry'));
    q.equalTo('logSession', request.object);
    q.find({useMasterKey : true}).then(function(logEntries) {

        var wins, losses, draws, summary;

        summary = [];
        wins = 0; losses = 0; draws = 0;


        logEntries.forEach(function(entry) {
            var result = entry.get('result');

            summary.push( result );

            if(result == 'win') {
                wins++;
            }
            else if(result == 'loss') {
                losses++;
            }
            else if(result == 'draw') {
                draws++;
            }

        });


        request.object.set({
            wins : wins,
            losses : losses,
            draws : draws,
            summary : summary
        });

        response.success();

    }, function(err) {

        response.error(err);
    });

});

