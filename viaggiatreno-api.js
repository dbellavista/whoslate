// viaggiatreno-api.js
// -*- coding: utf-8 -*-
// vim:fenc=utf-8
// vim:foldmethod=syntax
// vim:foldnestmax=1
//
"use strict;";

var Promise = require('mongoose').Promise;
var config = require('./config');
var requ = require('request');

var url = config.viaggiatreno.uri + config.viaggiatreno.api.base;

// TODO: http://viaggiatreno.it/viaggiatrenonew/resteasy/viaggiatreno/partenze/S01700/Wed%20Mar%2004%202015%2020:19:07%20GMT+0100%20(CET)

exports.getStations = function() {
  var api = url + config.viaggiatreno.api.stations;

  return request({
    uri: api,
    json: true,
    method: 'GET'
  });
};

exports.getDepartures = function(stationId, date) {
  if (date instanceof Date)
    date = date.toString();

  var api = url + fillPars(config.viaggiatreno.api.departures, {
    stationId: stationId,
    date: date
  });

  return request({
    uri: api,
    json: true,
    method: 'GET'
  });
};

exports.getArrivals = function(stationId, date) {
  if (date instanceof Date)
    date = date.toString();

  var api = url + fillPars(config.viaggiatreno.api.arrivals, {
    stationId: stationId,
    date: date
  });

  return request({
    uri: api,
    json: true,
    method: 'GET'
  });
};

exports.getTrainStatus = function(originId, trainId) {
  var api = url + fillPars(config.viaggiatreno.api.trainStatus, {
    originId: originId,
    trainId: trainId
  });

  return request({
    uri: api,
    json: true,
    method: 'GET'
  });
};

function fillPars(base, obj) {
  for (var k in obj) {
    base = base.replace('{:' + k + '}', obj[k]);
  }

  return base;
}

function request() {
  var args = Array.prototype.slice.call(arguments, 0);
  var pr = new Promise();

  args.push(function(e, r, b) {
    if (e) {
      pr.reject(e);
    } else {
      pr.fulfill({
        code: r.statusCode,
        body: b
      });
    }
  });

  requ.apply(requ, args);
  return pr
  .then(function(res) {
    if (res.code !== 200)
      throw new Error('Failed:', JSON.stringify(args), JSON.stringify(res));
    return res.body;
  });
}
