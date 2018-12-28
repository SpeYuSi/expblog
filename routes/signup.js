const fs = require('fs')
const path = require('path')
const sha1 = require('sha1')
const express = require('express')
const router = express.Router()

const UserModel = require('../models/users')
const checkNotLogin = require('../middlewares/check').checkNotLogin

// GET /signup 注册页
router.get('/', checkNotLogin, function (req, res, next) {
  res.render('signup')
})

// POST /signup 用户注册
router.post('/', checkNotLogin, function (req, res, next) {
  const name = req.fields.name
  const bio = req.fields.bio
  const tel = req.fields.tel
  var avatar = req.files.avatar.path.split(path.sep).pop()
  let password = req.fields.password

  const phoneReg = /(^1[3|4|5|7|8]\d{9}$)|(^09\d{8}$)/;


  // 校验参数
  try {
    if (!(name.length >= 1 && name.length <= 10)) {
      throw new Error('名字请限制在 1-10 个字符！')
    }
    if (password.length < 6) {
      throw new Error('密码至少 6 个字符！')
    }
    if (!phoneReg.test(tel)) {
      throw new Error('请输入有效的手机号码！')
    }
    //头像是否上传
    if(!avatar.match('\\.')){
      avatar = 'default.jpg'
    }

  } catch (e) {
    // 注册失败，异步删除上传的头像
    fs.unlink(req.files.avatar.path)
    req.flash('error', e.message)
    return res.redirect('/signup')
  }

  // 明文密码加密
  password = sha1(password)

  // 待写入数据库的用户信息
  let user = {
    name: name,
    password: password,
    bio: bio,
    tel: tel,
    avatar: avatar
  }
  // 用户信息写入数据库
  UserModel.create(user)
    .then(function (result) {
      // 此 user 是插入 mongodb 后的值，包含 _id
      user = result.ops[0]
      // 删除密码这种敏感信息，将用户信息存入 session
      delete user.password
      req.session.user = user
      // 写入 flash
      req.flash('success', '注册成功')
      // 跳转到首页
      res.redirect('/posts')
    })
    .catch(function (e) {
      // 注册失败，异步删除上传的头像
      fs.unlink(req.files.avatar.path)
      try{


      // 用户名被占用则跳回注册页，而不是错误页
      if (e.message.match('name')) {
        throw new Error('用户名已被占用!')
      }
       if (e.message.match('tel')) {
        throw new Error('手机号已被注册!')
      }
      }catch (e) {
         req.flash('error', e.message)
        return res.redirect('/signup')
      }


    })
})

module.exports = router