var mongoose = require('mongoose');
var fs = require('fs');
var path = require('path');

// schema
var fileSchema = mongoose.Schema({
  originalFileName:{type:String},
  serverFileName:{type:String},
  size:{type:Number},
  uploadedBy:{type:mongoose.Schema.Types.ObjectId, ref:'user', required:true},
  postId:{type:mongoose.Schema.Types.ObjectId, ref:'post'},
  isDeleted:{type:Boolean, default:false},
});

// instance methods
fileSchema.methods.processDelete = function(){
  this.isDeleted = true;
  this.save();
};
fileSchema.methods.getFileStream = function(){
  var stream;
  var filePath = path.join(__dirname,'..','uploadedFiles',this.serverFileName);
  var fileExists = fs.existsSync(filePath);
  if(fileExists){
    stream = fs.createReadStream(filePath);
  }
  else {
    this.processDelete();
  }
  return stream;
};

// model & export
var File = mongoose.model('file', fileSchema);

// model methods
File.createNewInstance = async function(file, uploadedBy, postId){
  return await File.create({
      originalFileName:file.originalname,
      serverFileName:file.filename,
      size:file.size,
      uploadedBy:uploadedBy,
      postId:postId,
    });
};

module.exports = File;
