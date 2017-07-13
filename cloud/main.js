
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
        return logSession.save({lastGameDate : d, user : request.user},{useMasterKey:true});

    }).then(function() {
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

            logEntries.forEach(function (entry) {
                var result = entry.get('result');
                var characterNames = entry.get('characterNames');
                var mapName = entry.get('mapName');

                if(result)
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

                //count up on a character-specific basis
                characterNames.forEach(function(name, i) {
                    if(!characterResults[name])
                        characterResults[name]  = {};

                    if(!characterResults[name]["_all"])
                        characterResults[name]["_all"] = [0,0,0];
                    if(!characterResults[name][mapName])
                        characterResults[name][mapName] = [0, 0, 0];

                    if (result == 'win') {
                        characterResults[name][mapName][0]++;
                        characterResults[name]["_all"][0]++;
                    }
                    else if (result == 'loss') {
                        characterResults[name][mapName][1]++;
                        characterResults[name]["_all"][1]++;
                    }
                    else if (result == 'draw') {
                        characterResults[name][mapName][2]++;
                        characterResults[name]["_all"][2]++;
                    }
                });

                // count up on a map-specific basis
                if(!mapResults[mapName])
                    mapResults[mapName] = {};

                if(!mapResults[mapName]["_all"])
                    mapResults[mapName]["_all"] = [0,0,0];
                if (result == 'win')
                    mapResults[mapName]["_all"][0]++;
                else if (result == 'loss')
                    mapResults[mapName]["_all"][1]++;
                else if (result == 'draw')
                    mapResults[mapName]["_all"][2]++;

                characterNames.forEach(function(name, i) {
                    if(!mapResults[mapName][name])
                        mapResults[mapName][name] = [0,0,0];
                    if (result == 'win')
                        mapResults[mapName][name][0]++;
                    else if (result == 'loss')
                        mapResults[mapName][name][1]++;
                    else if (result == 'draw')
                        mapResults[mapName][name][2]++;
                });



            });

            logSession.save({
                win: wins,
                loss: losses,
                draw: draws,
                summary: summary,
                characterResults : characterResults,
                mapResults : mapResults
            },{ useMasterKey : true }).then(function () {
                response.success();
            });

        }, function (err) {

            response.error(err);
        });
    }
    else {
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

        var allMapResults = user.get('mapResults') ? user.get('mapResults') : {};
        var allCharacterResults = user.get('characterResults') ? user.get('characterResults') : {};

        logSessions.forEach(function(session) {
            wins += session.get('win') ? session.get('win') : 0;
            losses += session.get('loss') ? session.get('loss') : 0;
            draws += session.get('draw') ? session.get('draw') : 0;



            var mapResults = session.get('mapResults');
            var characterResults = session.get('characterResults');

            for(mapName in mapResults) {
                var map = mapResults[mapName];
                for(characterName in map) {

                    var record = map[characterName];

                    if(!allMapResults[mapName])
                        allMapResults[mapName] = {};

                    if(!allMapResults[mapName][characterName])
                        allMapResults[mapName][characterName] = [0,0,0];

                    allMapResults[mapName][characterName][0] += record[0];
                    allMapResults[mapName][characterName][1] += record[1];
                    allMapResults[mapName][characterName][2] += record[2];
                }
            }


            for(charName in characterResults) {
                var character = characterResults[charName];
                for(mapName in character) {

                    var record = character[mapName];

                    if(!allCharacterResults[charName])
                        allCharacterResults[charName] = {};

                    if(!allCharacterResults[charName][mapName])
                        allCharacterResults[charName][mapName] = [0,0,0];

                    allCharacterResults[charName][mapName][0] += record[0];
                    allCharacterResults[charName][mapName][1] += record[1];
                    allCharacterResults[charName][mapName][2] += record[2];
                }
            }

        });

        user.save({
            win : wins,
            draw : draws,
            loss : losses,
            mapResults : allMapResults,
            characterResults : allCharacterResults
        },{useMasterKey:true}).then(function() {
            response.success();
        });

    }, function(err) {
        response.error(err);
    });
});




