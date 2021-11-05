var mysql = require('mysql');
var jsonfile = require('jsonfile');
const connection = require("../config/db.config");
const { v4: uuidv4 } = require('uuid');
const formidable = require('formidable')
var fs = require('fs');
const bcrypt = require('bcrypt');
const saltRounds = 10;
var AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});

s3 = new AWS.S3({apiVersion: '2006-03-01'});
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
var {bucketName} = require('../config.json')


var User = require("../model/user")

exports.register = function(req,res){
  // console.log("register called");
  if(req.body.password == undefined || req.body.username == undefined || req.body.first_name == undefined || req.body.last_name == undefined){

    return res.status(400).send({message:"All the fields are required to create an account"})
  }

  var regexEmail = /\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*/;

  if (!regexEmail.test(req.body.username)) {
    return res.status(400).send({message:" Invalid Username. It should be email ID"})
  } 

  var today = new Date();
  const salt = bcrypt.genSaltSync(saltRounds);
  const hash = bcrypt.hashSync(req.body.password, salt);


  var users={
    "id":uuidv4(),
    "password":hash,
    "account_created":today,
    "account_updated":today,
    "username": req.body.username,
    "first_name" : req.body.first_name,
    "last_name" : req.body.last_name,
   }

  User.create(users, (err,data) => {
    if (err){
      if(err.errno == 1062){
       return res.status(400).send({message: "Email ID already exists"})
      }
      console.log("err ",err)
      res.status(400).send({
        message: "Something went wrong while creating. Try again."
      });
    }
    else res.status(201).send(data);
  });

}

exports.getDetails = function(req, res){


    // console.log("users ", req.headers)

    const base64Credentials =  req.headers.authorization.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');
  
    if(username == undefined || password == undefined){
      res.status(400).send({message:"Authentication failed. Provide username and password"})
      return
    }
  var auth = {
    username : username,
    password : password
  }
    User.authenticate(auth , (err, data)=>{
          if (!err)
          res.send(data)
        else {
          res.status(400).send({message:"Authentication failed. Incorrect username or password"})
        }
    })

    
}


exports.update = function (req, res){

  // console.log("users ", req.headers)

  const base64Credentials =  req.headers.authorization.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');
  var today = new Date();
  if(req.body.password != undefined || req.body.password != null){
    const salt = bcrypt.genSaltSync(saltRounds);
    var hash = bcrypt.hashSync(req.body.password, salt);
  }

  if(req.body.username !=undefined || req.body.account_created !=undefined || req.body.account_updated != undefined){
    res.status(400).send({
      message : "Cannot update the given values."
    })
    return
  }
  var details = {
    "first_name" : req.body.first_name,
    "last_name" : req.body.last_name,
    "password" : hash,
    "account_updated": new Date()
  }
  var auth = {
    username : username,
    password : password
  }
  User.authenticate(auth , (err, data)=>{
        if (err)
        return res.status(403).send({message:"Authentication failed. Incorrect username or password"})

      else {
        //console.log("SS ", data[username])
        User.update(username, details, (err1, newValue) =>{
          
          console.log("err 1", err1)
          if(err1){
            res.status(403).send({
              message : "Username or Password incorrect"
            })

          }else{

            return res.status(204).send()
            
          }


        })
      }
  })

}


exports.uploadPic = function(req, res){ 
 
  const base64Credentials =  req.headers.authorization.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');
  var today = new Date();
  if(req.body.password != undefined || req.body.password != null){
    const salt = bcrypt.genSaltSync(saltRounds);
    var hash = bcrypt.hashSync(req.body.password, salt);
  }
  
    console.log("upload called")
    var auth = {
      username : username,
      password : password
    }
    User.authenticate(auth , (err, data)=>{
        if (err)
          return res.status(403).send({message:"Authentication failed. Incorrect username or password"})
  
        else {
          buf = Buffer.from(req.body.contents.replace(/^data:image\/\w+;base64,/, ""),'base64')
          var data1 = {
            Bucket: bucketName,
            Key: auth.username+"_"+req.body.filename, 
            Body: buf,
            ContentEncoding: 'base64',
            ContentType: 'image/jpeg'
          }; 
          var deteleData = {
            Bucket: bucketName,
            Key: auth.username+"_"+req.body.filename, 
           
          };
          console.log("dd ",deteleData.Bucket)
          console.log("dd tt",deteleData.Key)

          s3.deleteObject(deteleData, function(err1, data2){
            if (err1) { 
              console.log(err1);
              console.log('Error deleting data: ', err1); 
              res.status(404).send({message:"Not found"})
            } else {
              console.log("Delete success ", data2)
              User.deletePic(auth.username, (err2, resp)=>{
                if(err2){
                  console.log("Upload",err2)
                  res.status(404).send({message:"Not found"})
                }

                  
                else{
                  console.log("going to upload")

                  s3.upload(data1, function(err3, resData){
                    if (err3) { 
                      console.log(err3);
                      res.status(403).send({
                        message : "Something went wrong while uploading",
                        error: err3
                      })
                      
                    } else {
                      console.log('Success', resData); 
                      var resData = {
                        username: data.username,
                        filename: resData.key,
                        bucketName : data1.Bucket,
                        url : resData.Location,
                        uploaded_date : new Date(),
                        img_key : resData.key
                      }
                      console.log('successfully uploaded the image!');
                      
                    }
                });
              
                }
                
              })
              
              //console.log("Deleted Sucessfully")
            }
        });
         
        }
    })

  }

  exports.viewPic = function(req, res){ 
 
    const base64Credentials =  req.headers.authorization.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');
    var today = new Date();
    if(req.body.password != undefined || req.body.password != null){
      const salt = bcrypt.genSaltSync(saltRounds);
      var hash = bcrypt.hashSync(req.body.password, salt);
    }
    
      console.log("view called")
      var auth = {
        username : username,
        password : password
      }
      User.authenticate(auth , (err, data)=>{
          if (err)
            return res.status(403).send({message:"Authentication failed. Incorrect username or password"})
    
          else {
            //console.log("SS ", data[username])
            User.viewPic(auth.username, (err1, resp)=>{
              if(err1){
                console.log(err1)
                res.status(404).send({message:"Not found"})
              }
                
              else{
                console.log("get image ", resp)
                res.status(200).send(resp)
              }
              
            })
          }
      })
  
    }

  
  exports.deletePic = function(req, res){

    const base64Credentials =  req.headers.authorization.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');
    var today = new Date();
    if(req.body.password != undefined || req.body.password != null){
      const salt = bcrypt.genSaltSync(saltRounds);
      var hash = bcrypt.hashSync(req.body.password, salt);
    }
    
      console.log("upload called", req.body)
      var auth = {
        username : username,
        password : password
      }
      User.authenticate(auth , (err, data)=>{
            if (err)
            return res.status(403).send({message:"Authentication failed. Incorrect username or password"})
    
          else {
            //console.log("SS ", data[username])
            User.viewPic(auth.username, (err1, key)=>{
              if(err1)
                console.log(err1)
              else{
                console.log("key", key)
                var data1 = {
                  Bucket: bucketName,
                  Key: key[0].img_key, 
                };
                console.log("Bucket name "+ bucketName)
                console.log("key ", data1.Key)
                s3.deleteObject(data1, function(err, data1){
                    if (err) { 
                      console.log(err);
                      console.log('Error deleting data: ', err); 
                      res.status(404).send({message:"Not found"})
                    } else {
                      User.deletePic(auth.username, (err1, resp)=>{
                        if(err1){
                          console.log("Delete PIC",err1)
                          res.status(404).send({message:"Not found"})
                        }
                          
                        else{
                          console.log("Delete row", resp)
                          res.status(204).send({message:"Deleted Sucessfully"})
                        }
                        
                      })
                      
                      //console.log("Deleted Sucessfully")
                    }
                });
              }
            
            })
            
          
          }
      })
          
}
  

  