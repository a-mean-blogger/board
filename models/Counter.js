var mongoose = require('mongoose');

// schema
var counterSchema = mongoose.Schema({
  name:{type:String, required:true},
  count:{type:Number, default:0},
});

// model & export
var Counter = mongoose.model('counter', counterSchema);
module.exports = Counter;
