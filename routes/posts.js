var express  = require('express');
var router = express.Router();
var multer = require('multer');
var upload = multer({ dest: 'uploadedFiles/' });
var Post = require('../models/Post');
var User = require('../models/User');
var Comment = require('../models/Comment');
var File = require('../models/File');
var util = require('../util');

// Index
router.get('/', async function(req, res){
  var page = Math.max(1, parseInt(req.query.page));
  var limit = Math.max(1, parseInt(req.query.limit));
  page = !isNaN(page)?page:1;
  limit = !isNaN(limit)?limit:10;

  var skip = (page-1)*limit;
  var maxPage = 0;
  var searchQuery = await createSearchQuery(req.query);
  var posts = [];

  if(searchQuery) {
    var count = await Post.countDocuments(searchQuery);
    maxPage = Math.ceil(count/limit);
    posts = await Post.aggregate([
      { $match: searchQuery },
      { $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author'
      } },
      { $unwind: '$author' },
      { $sort : { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $lookup: {
          from: 'comments',
          localField: '_id',
          foreignField: 'post',
          as: 'comments'
      } },
      { $lookup: {
          from: 'files',
          localField: 'attachment',
          foreignField: '_id',
          as: 'attachment'
      } },
      { $unwind: {
        path: '$attachment',
        preserveNullAndEmptyArrays: true
      } },
      { $project: {
          title: 1,
          author: {
            username: 1,
          },
          views: 1,
          numId: 1,
          attachment: { $cond: [{$and: ['$attachment', {$not: '$attachment.isDeleted'}]}, true, false] },
          createdAt: 1,
          commentCount: { $size: '$comments'}
      } },
    ]).exec();
  }

  res.render('posts/index', {
    posts:posts,
    currentPage:page,
    maxPage:maxPage,
    limit:limit,
    searchType:req.query.searchType,
    searchText:req.query.searchText
  });
});

// New
router.get('/new', util.isLoggedin, function(req, res){
  var post = req.flash('post')[0] || {};
  var errors = req.flash('errors')[0] || {};
  res.render('posts/new', { post:post, errors:errors });
});

// create
router.post('/', util.isLoggedin, upload.single('attachment'), async function(req, res){
  var attachment;
  try{
    attachment = req.file?await File.createNewInstance(req.file, req.user._id):undefined;
  }
  catch(err){
    return res.json(err);
  }
  req.body.attachment = attachment;
  req.body.author = req.user._id;
  Post.create(req.body, function(err, post){
    if(err){
      req.flash('post', req.body);
      req.flash('errors', util.parseError(err));
      return res.redirect('/posts/new'+res.locals.getPostQueryString());
    }
    if(attachment){
      attachment.postId = post._id;
      attachment.save();
    }
    res.redirect('/posts'+res.locals.getPostQueryString(false, { page:1, searchText:'' }));
  });
});

// show
router.get('/:id', function(req, res){
  var commentForm = req.flash('commentForm')[0] || { _id: null, form: {} };
  var commentError = req.flash('commentError')[0] || { _id:null, parentComment: null, errors:{} };

  Promise.all([
      Post.findOne({_id:req.params.id}).populate({ path: 'author', select: 'username' }).populate({path:'attachment',match:{isDeleted:false}}),
      Comment.find({post:req.params.id}).sort('createdAt').populate({ path: 'author', select: 'username' })
    ])
    .then(([post, comments]) => {
      post.views++;
      post.save();
      var commentTrees = util.convertToTrees(comments, '_id','parentComment','childComments');
      res.render('posts/show', { post:post, commentTrees:commentTrees, commentForm:commentForm, commentError:commentError});
    })
    .catch((err) => {
      return res.json(err);
    });
});

// edit
router.get('/:id/edit', util.isLoggedin, checkPermission, function(req, res){
  var post = req.flash('post')[0];
  var errors = req.flash('errors')[0] || {};
  if(!post){
    Post.findOne({_id:req.params.id})
      .populate({path:'attachment',match:{isDeleted:false}})
      .exec(function(err, post){
        if(err) return res.json(err);
        res.render('posts/edit', { post:post, errors:errors });
      });
  }
  else {
    post._id = req.params.id;
    res.render('posts/edit', { post:post, errors:errors });
  }
});

// update
router.put('/:id', util.isLoggedin, checkPermission, upload.single('newAttachment'), async function(req, res){
  var post = await Post.findOne({_id:req.params.id}).populate({path:'attachment',match:{isDeleted:false}});
  if(post.attachment && (req.file || !req.body.attachment)){
    post.attachment.processDelete();
  }
  try{
    req.body.attachment = req.file?await File.createNewInstance(req.file, req.user._id, req.params.id):post.attachment;
  }
  catch(err){
    return res.json(err);
  }
  req.body.updatedAt = Date.now();
  Post.findOneAndUpdate({_id:req.params.id}, req.body, {runValidators:true}, function(err, post){
    if(err){
      req.flash('post', req.body);
      req.flash('errors', util.parseError(err));
      return res.redirect('/posts/'+req.params.id+'/edit'+res.locals.getPostQueryString());
    }
    res.redirect('/posts/'+req.params.id+res.locals.getPostQueryString());
  });
});

// destroy
router.delete('/:id', util.isLoggedin, checkPermission, function(req, res){
  Post.deleteOne({_id:req.params.id}, function(err){
    if(err) return res.json(err);
    res.redirect('/posts'+res.locals.getPostQueryString());
  });
});

module.exports = router;

// private functions
function checkPermission(req, res, next){
  Post.findOne({_id:req.params.id}, function(err, post){
    if(err) return res.json(err);
    if(post.author != req.user.id) return util.noPermission(req, res);

    next();
  });
}

async function createSearchQuery(queries){
  var searchQuery = {};
  if(queries.searchType && queries.searchText && queries.searchText.length >= 3){
    var searchTypes = queries.searchType.toLowerCase().split(',');
    var postQueries = [];
    if(searchTypes.indexOf('title')>=0){
      postQueries.push({ title: { $regex: new RegExp(queries.searchText, 'i') } });
    }
    if(searchTypes.indexOf('body')>=0){
      postQueries.push({ body: { $regex: new RegExp(queries.searchText, 'i') } });
    }
    if(searchTypes.indexOf('author!')>=0){
      var user = await User.findOne({ username: queries.searchText }).exec();
      if(user) postQueries.push({author:user._id});
    }
    else if(searchTypes.indexOf('author')>=0){
      var users = await User.find({ username: { $regex: new RegExp(queries.searchText, 'i') } }).exec();
      var userIds = [];
      for(var user of users){
        userIds.push(user._id);
      }
      if(userIds.length>0) postQueries.push({author:{$in:userIds}});
    }
    if(postQueries.length>0) searchQuery = {$or:postQueries};
    else searchQuery = null;
  }
  return searchQuery;
}
