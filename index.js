// index.js
// -*- coding: utf-8 -*-
// vim:fenc=utf-8
// vim:foldmethod=syntax
// vim:foldnestmax=1
//
"use strict;";

require('./trainstatusraw');

var mongoose = require('mongoose');
var vtapi = require('./viaggiatreno-api');
var config = require('./config');
var async = require('async-q');

mongoose.connect(config.db.uri);

TrainStatusRaw = mongoose.model('TrainStatusRaw');

function doWork() {
  updateAllStatuses(true)
    .then(null, function(err) {
      console.error(err.stack);
    })
    .then(function() {
      setTimeout(doWork, config.updateTimeout * 60 * 1000);
    });
}
doWork();

function updateAllStatuses(printStatus) {

  var stInt;

  if (printStatus) {
    console.log('====== Starting', new Date());
    var status = {
      totalStations: 0,
      analyzedStations: 0,
      totalTrains: 0,
      analyzedTrains: 0
    };

    stInt = setInterval(function() {
      console.log('Status: ' + JSON.stringify(status, null, ' '));
    }, 5000);
  }

  var trains = [];
  var d = new Date();

  return vtapi.getStations()
    .then(function(stations) {
      status.totalStations = stations.length;

      console.log('   == Getting trains');
      var tObj = {};
      return async.eachLimit(stations, config.viaggiatreno.concurrent, function(station) {
        var stationId = station.codiceStazione;
        return vtapi.getArrivals(stationId, d)
          .then(function(arrivals) {
            fillTrains(status, tObj, trains, arrivals);
            return vtapi.getDepartures(stationId, d);
          })
          .then(function(departures) {
            fillTrains(status, tObj, trains, departures);
            status.analyzedStations += 1;
          });
      });
    })
    .then(function() {
      console.log('   == Getting trains status (' + trains.length + ')');
      return async.eachLimit(trains, config.viaggiatreno.concurrent, function(tr) {
        return updateStatus(tr.originId, tr.trainId)
          .then(function() {
            status.analyzedTrains += 1;
          });
      });
    })
    .then(function() {
      if (printStatus) {
        clearInterval(stInt);
        console.log('====== Done', new Date());
      }
    }, function(err) {
      if (printStatus) {
        clearInterval(stInt);
        console.log(err.stack);
        console.log('====== Done (with error)', new Date());
      }
      throw err;
    });
}

function updateStatus(originId, trainId) {
  return vtapi.getTrainStatus(originId, trainId)
    .then(function(b) {
      try {
        if (b.fermate && b.fermate.length > 0) {
          var t = parseInt(b.fermate[0].programmata);
          if (t === 0) {
            throw new Error('Wrong date ' + b.fermate[0].programmata);
          }

          for (var k in b) {
            if (/^(?:comp|desc)[A-Z]/.test(k)) { // Useless
              delete b[k];
            }
          }

          var departureTime = new Date(t).toISOString();

          return TrainStatusRaw.findOneAndUpdate({
            trainId: trainId,
            originId: originId,
            departureTime: departureTime
          }, {
            $set: {
              response: b
            }
          }, {
            upsert: true
          }).exec();
        } else {
          console.error('Malformed status:', JSON.stringify(b));
        }
      } catch (e) {
        console.error('-------------------');
        console.error(e.stack);
        console.error(b.fermate[0]);
        console.error('-------------------');
      }
    });
}

function fillTrains(status, tObj, trains, array) {
  array.forEach(function(a) {
    var tid = '' + a.numeroTreno;
    var oid = a.codOrigine;
    var id = tid + oid;
    if (!tObj[id]) {
      trains.push({
        trainId: tid,
        originId: oid
      });
      status.totalTrains += 1;
      tObj[id] = true;
    }
  });
}
