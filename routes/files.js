var express  = require('express');
var router = express.Router();
var File = require('../models/File');

router.get('/:serverFileName/:originalFileName', function(req, res){
  File.findOne({serverFileName:req.params.serverFileName, originalFileName:req.params.originalFileName}, async function(err, file){
    if(err) return res.json(err);

    var stream;
    var statusCode = 200;
    try{
      stream = await file.getFileStream();
    }
    catch(e){
      statusCode = e;
    }

    if(stream){
      res.writeHead(statusCode, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename=' + file.originalFileName
      });
      stream.pipe(res);
    }
    else {
      res.statusCode = statusCode;
      res.end();
    }
  });
});

module.exports = router;
