// trenoraw.js
// -*- coding: utf-8 -*-
// vim:fenc=utf-8
// vim:foldmethod=syntax
// vim:foldnestmax=1
//
"use strict;";

var mongoose = require('mongoose');

var TrainStatusRawSchema = new mongoose.Schema({
  departureTime: {type: Date, required: true, index: 1},
  trainId: {type: String, required: true, index: 1},
  originId: {type: String, required: true, index: 1},
  response: {}
});

mongoose.model('TrainStatusRaw', TrainStatusRawSchema);
