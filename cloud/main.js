
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


function updateLogSession(request, response) {
    var logSession = request.object.get('logSession');

    if (logSession) {

        console.log("updating log session");

        var q = new Parse.Query(Parse.Object.extend('LogEntry'));
        q.equalTo('logSession', logSession);
        q.find({useMasterKey: true}).then(function (logEntries) {

            console.log("finding log entries for this session");

            var wins, losses, draws, summary;
            var mapResults, characterResults;

            summary = [];
            wins = 0;
            losses = 0;
            draws = 0;

            mapResults = {};
            characterResults = {};

            console.log("looping through entries");

            logEntries.forEach(function (entry) {
                var result = entry.get('result');
                var characterNames = entry.get('characterNames');
                var mapNames = entry.get('mapNames');
                summary.push(result);

                // count up generic wins/losses/draws
                if (result == 'win') {
                    wins++;
                }
                else if (result == 'loss') {
                    losses++;
                }
                else if (result == 'draw') {
                    draws++;
                }

                //count up on a map by map basis
                characterNames.forEach(function(name, i) {
                    if(!characterResults[name])
                        characterResults[name]  = {};

                    //
                    // mapNames.forEach(function(map, j) {
                    //
                    //     if(!characterResults[name][map])
                    //         characterResults[name][map] = {}
                    //
                    //
                    //     if(!characterResults[name][map][result])
                    //         characterResults[name][map][result] = 0;
                    //
                    //     characterResults[name][map][result]++;
                    // });

                });

            });

            logSession.save({
                win: wins,
                loss: losses,
                draw: draws,
                summary: summary,
                characterResults : characterResults
            },{ useMasterKey : true }).then(function () {
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
}

// Count up wins/draws/losses in this log session
Parse.Cloud.afterDelete('LogEntry', updateLogSession);


// Count up wins/draws/losses in this log session
Parse.Cloud.afterSave('LogEntry', updateLogSession);


Parse.Cloud.afterSave('LogSession', function(request, response) {

    // Tally up total results for this user
    var user = request.object.get('user');

    var q = new Parse.Query(Parse.Object.extend('LogSession'));
    q.equalTo('user', user);
    q.find({useMasterKey:true}).then(function(logSessions) {

        var wins, losses, draws;
        wins = 0;
        losses = 0;
        draws = 0;

        logSessions.forEach(function(session) {
            wins += session.get('win') ? session.get('win') : 0;
            losses += session.get('loss') ? session.get('loss') : 0;
            draws += session.get('draw') ? session.get('draw') : 0;
        });

        user.save({
            win : wins,
            draw : draws,
            loss : losses
        },{useMasterKey:true}).then(function() {
            response.success();
        });

    }, function(err) {
        response.error(err);
    });
});

