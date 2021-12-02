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
var {bucketName, SNS_TOPIC_ARN } = require('../config.json')
const metrics = require("../metrics");
var SDC = require('statsd-client'),
	sdc = new SDC({port: 8125});

var User = require("../model/user")
const log = require("../logs")
const logger = log.getLogger('logs');
const querystring = require('querystring');
const url = require('url');


exports.register = function(req,res){

  logger.info("Register user called");

  sdc.increment("User.POST.createUser");
  let timer = new Date();
  let db_timer = new Date();  

  if(req.body.password == undefined || req.body.username == undefined || req.body.first_name == undefined || req.body.last_name == undefined){

    return res.status(400).send({message:"All the fields are required to create an account"})
  }

  var regexEmail = /\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*/;

  if (!regexEmail.test(req.body.username)) {
    return res.status(400).send({message:" Invalid Username. It should be email ID"})
    logger.error("Invalid Username. It should be email ID");

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
    "isVerified": false,
    "verifiedDate":""
   }

  User.create(users, (err,data) => {
    sdc.timing('User.POST.dbcreateUser',db_timer)
    if (err){
      if(err.errno == 1062){
        logger.error("Email ID already exists");

       return res.status(400).send({message: "Email ID already exists"})

      }
      console.log("err ",err)
      res.status(400).send({
        message: "Something went wrong while creating. Try again."
      });
      logger.error("Something went wrong while creating. Try again");

    }
    
    else {
      res.status(201).send(data);
      logger.info("Create success");

      sdc.timing("User.POST.createUser",timer);

      var docClient = new AWS.DynamoDB.DocumentClient();
      var table = "dynamo";


      var Dynamoparams = {
        TableName: table,
        Item:{
            id : req.body.username,
            // email: req.body.username,
            token: Math.random().toString(36).substr(2, 5)

        }
    };
    
    docClient.put(Dynamoparams, function(err, data) {
      if (err) {
        logger.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
        console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
      } else {
          logger.info("Added item:", JSON.stringify(data, null, 2));
      }
  });
      var params = {
        Message: req.body.username, /* required */
        TopicArn: SNS_TOPIC_ARN
      };
      var publishTextPromise = new AWS.SNS({apiVersion: '2010-03-31'}).publish(params).promise();

// Handle promise's fulfilled/rejected states
    publishTextPromise.then(
      function(data) {
        console.log(`Message ${params.Message} sent to the topic ${params.TopicArn}`);
        console.log("MessageID is " + data.MessageId);
      }).catch(
        function(err) {
        console.error(err, err.stack);
      });
    }
  });

}

exports.getDetails = function(req, res){
    logger.info("get user called");

    sdc.increment("User.get.getUser");
    let timer = new Date();
    let db_timer = new Date();  

    // console.log("users ", req.headers)

    const base64Credentials =  req.headers.authorization.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');
  
    if(username == undefined || password == undefined){
      res.status(400).send({message:"Authentication failed. Provide username and password"})
      logger.error("Authentication failed. Provide username and password");

      return
    }
  var auth = {
    username : username,
    password : password
  }
    sdc.timing('User.GET.dbgetUser',db_timer)

    User.authenticate(auth , (err, data)=>{
          if (!err)
          res.send(data)
        else {
          logger.error("Authentication failed. Provide username and password");

          res.status(400).send({message:"Authentication failed. Incorrect username or password"})
        }
    })
    sdc.timing('User.GET.getUser',db_timer)


    
}


exports.update = function (req, res){

  // console.log("users ", req.headers)
  logger.info("Update user called");
  sdc.increment("User.PUT.userUpdate");
  let timer = new Date();
  let db_timer = new Date();  

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
    logger.error("Cannot update the given values");

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
    sdc.timing('User.PUT.dbUpdateUser',db_timer)

        if (err){
        logger.error("Authentication failed. Incorrect username or password");

        return res.status(403).send({message:"Authentication failed. Incorrect username or password"})
        }
      else {
        //console.log("SS ", data[username])
        User.update(username, details, (err1, newValue) =>{
          
          console.log("err 1", err1)
          if(err1){
            res.status(403).send({
              message : "Username or Password incorrect"
            })

          }else{
            logger.info("Update Success");

            return res.status(204).send()
            
          }


        })
      }
  })
  sdc.timing('User.PUT.dbUpdateUser',db_timer)


}


exports.uploadPic = function(req, res){ 
 
  logger.info("Update pic called");
  sdc.increment("User.POST.UploadPic");
  let timer = new Date();
  let db_timer = new Date();  

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
    sdc.timing('User.POST.S3UploadPic',db_timer)

    User.authenticate(auth , (err, data)=>{
        if (err){
          logger.error("Authentication failed. Incorrect username or password");

          return res.status(403).send({message:"Authentication failed. Incorrect username or password"})
        }
        else {
          buf = Buffer.from(req.body.contents.replace(/^data:image\/\w+;base64,/, ""),'base64')
          var data1 = {
            Bucket: bucketName,
            Key: auth.username+"_"+req.body.filename, 
            Body: buf,
            ContentEncoding: 'base64',
            ContentType: 'image/jpeg'
          }; 
          
         
          User.viewPic(auth.username, (err5, resp)=>{
            if(err5){
              console.log(err5)
              res.status(404).send({message:"Not found"})
            }
              
            else{
              console.log("get image ", resp)
              if(resp.length > 0){
                console.log("No image found")
                var deteleData = {
                  Bucket: bucketName,
                  Key: resp[0].img_key, 
                 
                };
                console.log("dd ",deteleData.Bucket)
                console.log("dd tt",deteleData.Key)
                // res.status(200).send(resp)
                s3.deleteObject(deteleData, function(err1, data2){
                  if (err1) { 
                    console.log(err1);
                    console.log('Error deleting data: ', err1); 
                    res.status(404).send({message:"Not found"})
                  } else {
                    console.log("Delete success ", data2)
                    User.deletePicRow(auth.username, (err2, resp)=>{
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
                            var update = {
                              bucketName: bucketName,
                              img_key: resData.Key, 
                              username: auth.username,
                              filename :resData.Key,
                              url: resData.Location,
                              uploaded_date: new Date()
                            }; 
                            
                            User.updatePic(update,(updateErr, newValue) =>{
                              
                              if(updateErr){
                                console.log("updateErr", updateErr)
                         
                    
                              }else{
                    
                                console.log('Success', resData);
  
                                console.log('successfully uploaded the image!');
                                res.send(resData)
                              }
                                        
                            })
                                               
                          }
                      });
                    
                      }
                      
                    })
                    
                  }
              });
              }else{
                console.log("image found")

                s3.upload(data1, function(err3, resData){
                  if (err3) { 
                    console.log(err3);
                    res.status(403).send({
                      message : "Something went wrong while uploading",
                      error: err3
                    })
                    
                  } else {
                    var update = {
                      bucketName: bucketName,
                      img_key: resData.Key, 
                      username: auth.username,
                      filename :resData.Key,
                      url: resData.Location,
                      uploaded_date: new Date()
                    }; 
                    
                    User.updatePic(update,(updateErr, newValue) =>{
                      
                      if(updateErr){
                        console.log("updateErr", updateErr)
                 
            
                      }else{
            
                        console.log('Success', resData);

                        console.log('successfully uploaded the image!');
                        logger.info("successfully uploaded the image");

                        res.send(resData)
                      }
                                
                    })
                                       
                  }
              });
              }
              
            }
            
          })
        
         
        }
    })
    sdc.timing('User.POST.S3UploadPic',db_timer)

  }

  exports.viewPic = function(req, res){ 
    
    logger.info("View pic called");
    sdc.increment("User.GET.viewPic");
    let timer = new Date();
    let db_timer = new Date();  
    
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
      sdc.timing('User.GET.S3viewPic',db_timer)

      User.authenticate(auth , (err, data)=>{
          if (err){
            logger.error("Authentication failed. Incorrect username or password");

            return res.status(403).send({message:"Authentication failed. Incorrect username or password"})
          }
          else {
            //console.log("SS ", data[username])
            User.viewPic(auth.username, (err1, resp)=>{
              if(err1){
                console.log(err1)
                res.status(404).send({message:"Not found"})
              }
                
              else{
                logger.info("get image success");

                console.log("get image ", resp)
                res.status(200).send(resp)
              }
              
            })
          }
      })
      sdc.timing('User.GET.S3viewPic',db_timer)

  
    }

  
  exports.deletePic = function(req, res){

    logger.info("Delete pic called");
    sdc.increment("User.DELETE.deletePic");
    let timer = new Date();
    let db_timer = new Date();  

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
    sdc.timing("User.DELETE.deletePic");

      User.authenticate(auth , (err, data)=>{
            if (err){
            logger.error("Authentication failed. Incorrect username or password");

            return res.status(403).send({message:"Authentication failed. Incorrect username or password"})
            }
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
                          User.deletePicRow(auth.username, (dErr, resp)=>{
                            if(dErr){
                              console.log("delet row",dErr)
                              res.status(404).send({message:"Not found"})
                            }else{
                              logger.info("Delete success");

                              res.status(204).send({message:"Deleted Sucessfully"})
                            }
                          })
                         
                        }
                        
                      })
                    
                    }
                });
              }
            
            })
            
          
          }
      })
      sdc.timing("User.DELETE.deletePic");

          
}

exports.verifyToken = function(req, res){

  logger.info("Verify Token");

  console.log(querystring.parse(url));
  var query = require('url').parse(req.url,true).query;

  var email = query.email;
  var token = query.token;

  console.log("CT",email )
  console.log("CT",token )
  logger.info("Verify Token em", email);
  logger.info("Verify Token tk", token);

  var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

console.log("Querying for movies from 1985.");

let queryParams = {
  TableName: 'dynamo',
  Key: {
      "id": { "S": email }
  },
};
// first get item and check if email exists
//if does not exist put item and send email,
//if exists check if ttl > currentTime,
// if ttl is greater than current time do nothing,
// else send email
ddb.getItem(queryParams, (err, data) => {
  if (err) 
     logger.info("err", err)
  else {
      logger.info("****",data.Item)
      var d = data.Item.token
      d = d.split(":")
      logger.info("Tokennnnsss",data.Item.token)

      
       if(token == data.Item.token){
        User.updateStatus(username,(err1, newValue) =>{
          
          console.log("err 1", err1)
          if(err1){
            logger.error("Verification Failed");

            res.status(403).send({
              message : "Verification failed"
            })

          }else{
            logger.info("Verification Success");

            return res.status(200).send("Successfully Verified")
            
          }

        })

       }else{
        return res.status(400).send("Token invalid")
       }
   }
  
});


}

  