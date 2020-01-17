var express  = require('express');
var router = express.Router();
var Comment = require('../models/Comment');
var Post = require('../models/Post');
var util = require('../util');

// create
router.post('/', util.isLoggedin, checkPostId, function(req, res){
  var post = res.locals.post;

  req.body.author = req.user._id;
  req.body.post = post._id;

  Comment.create(req.body, function(err, comment){
    if(err){
      req.flash('commentForm', { _id:null, form:req.body });
      req.flash('commentError', { _id:null, parentComment:req.body.parentComment, errors:util.parseError(err) });
    }
    return res.redirect('/posts/'+post._id+res.locals.getPostQueryString());
  });
});

// update
router.put('/:id', util.isLoggedin, checkPermission, checkPostId, function(req, res){
  var post = res.locals.post;

  req.body.updatedAt = Date.now();
  Comment.findOneAndUpdate({_id:req.params.id}, req.body, {runValidators:true}, function(err, comment){
    if(err){
      req.flash('commentForm', { _id:req.params.id, form:req.body });
      req.flash('commentError', { _id:req.params.id, parentComment:req.body.parentComment, errors:util.parseError(err) });
    }
    return res.redirect('/posts/'+post._id+res.locals.getPostQueryString());
  });
});

// destroy
router.delete('/:id', util.isLoggedin, checkPermission, checkPostId, function(req, res){
  var post = res.locals.post;

  Comment.findOne({_id:req.params.id}, function(err, comment){
    if(err) return res.json(err);

    // save updated comment
    comment.isDeleted = true;
    comment.save(function(err, comment){
      if(err) return res.json(err);

      return res.redirect('/posts/'+post._id+res.locals.getPostQueryString());
    });
  });
});

module.exports = router;

// private functions
function checkPermission(req, res, next){
  Comment.findOne({_id:req.params.id}, function(err, comment){
    if(err) return res.json(err);
    if(comment.author != req.user.id) return util.noPermission(req, res);

    next();
  });
}

function checkPostId(req, res, next){
  Post.findOne({_id:req.query.postId}, function(err, post){
    if(err) return res.json(err);

    res.locals.post = post;
    next();
  });
}
