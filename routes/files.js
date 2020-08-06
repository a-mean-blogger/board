var express  = require('express');
var router = express.Router();
var File = require('../models/File');

router.get('/:serverFileName/:originalFileName', function(req, res){
  File.findOne({serverFileName:req.params.serverFileName, originalFileName:req.params.originalFileName}, function(err, file){
    if(err) return res.json(err);

    var stream = file.getFileStream();
    if(stream){
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename=' + file.originalFileName
      });
      stream.pipe(res);
    }
    else {
      res.statusCode = 404;
      res.end();
    }
  });
});

module.exports = router;
