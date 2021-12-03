const sql = require("../config/db.config");
const bcrypt = require('bcrypt');

// constructor
const User = function(customer) {
  this.id = customer.id;
  this.first_name = customer.first_name;
  this.last_name = customer.last_name;
  this.username = customer.username;
  this.account_created = customer.account_created;
  this.account_updated = customer.account_updated;
  this.password = customer.password;
  this.isVerified = false

};

User.create = async (newCustomer, result) => {


    let conn = await sql.getDBConnection();
    try{
      let [data, fields] =await conn.query("INSERT INTO users SET ?", newCustomer)
      if(data.affectedRows){
        try{
          let [newData, fields1] = await conn.query("select * from users where username = ?", newCustomer.username)
          delete newData[0].password
          result(null, newData[0]);
          }catch(err1){
            return result(err1, null);
          }
      }
    }catch (err){
        return result(err, null);
    }

};


User.authenticate = async (newCustomer, result) => {
  var username = newCustomer.username;
	var password = newCustomer.password;
  let conn = await sql.getDBConnection();

	if (username && password) {

    try{

       let [user, fields] =await conn.query("SELECT * FROM users WHERE username = ?", username)
       if (user.length > 0) {
        bcrypt.compare(password, user[0].password, function(err1, res) {
          // console.log("err ", err1)
          if (res == true){
            // console.log("cSuccess ", user);
            delete user[0].password
            result(null, user[0]);

          }else{
            result("err1", null);
            return
          }
         });

			}

    }catch(err){
      console.log("err ", err)
    }
    
	} 
  
  else {
		result("err1", null);

	}
};

User.update = async (email, details, result) =>{


  let conn = await sql.getDBConnection();

  try{
    let [res, fields] =await conn.query("SELECT * FROM users WHERE username = ?", email)
    
    if (res.length) {
      console.log("found customer: ", res[0]);
      if(details.first_name == undefined){
        details.first_name = res[0].first_name
      }if(details.last_name == undefined){
        details.last_name = res[0].last_name
      }if(details.password == undefined){
        details.password = res[0].password
      }
      details.account_updated = new Date();
    let [res1, fields1] =await conn.query("UPDATE users SET ? where username = ?", [details, email])
    // let [newRes, fields2] =await conn.query("Select * from users where username = ?",  email)
    // delete newRes[0].password
    result(null, res1);
    return
    
   
  }

  }catch(err1){
    result(err1, null)
  }


}

User.updatePic = async (picInfo, result) =>{


  let conn = await sql.getDBConnection();

  try{
    // let [data1, fields1] =await conn.query(" DELETE FROM image WHERE username = ?",picInfo.username)
    let [data, fields] =await conn.query("INSERT INTO image SET ?", picInfo)
 
    result(null, data);
    return
    
   
  }catch (err){
    return result(err, null);
  }

}

User.updateStatus = async (username)=>{
  let conn = await sql.getDBConnection();
  try{
    // let [data1, fields1] =await conn.query(" DELETE FROM image WHERE username = ?",picInfo.username)
    let [data, fields] =await conn.query("UPDATE users set isVerified=? where username =?",[true, username])
 
    result(null, data);
    return
    
   
  }catch (err){

    return result(err, null);
  }

}

User.viewPic = async (username, result)=>{

  let conn = await sql.getDBConnection();

  try{
    let [data, fields] =await conn.query("SELECT * FROM image WHERE username = ?", username)
    
    result(null, data);
    return
    
   
  }catch (err){
    return result(err, null);
  }

}

User.deletePic = async (username, result)=>{

  let conn = await sql.getDBConnection();

  try{
    let [data, fields] =await conn.query("SELECT img_key FROM image WHERE username = ?", username)
 
    result(null, data);
    return
    
   
  }catch (err){
    return result(err, null);
  }

}

User.deletePicRow = async (username, result)=>{

  let conn = await sql.getDBConnection();

  try{
    let [data, fields] =await conn.query("DELETE FROM image WHERE username = ?", username)
 
    result(null, data);
    return
    
   
  }catch (err){
    return result(err, null);
  }

}

User.checkifPicExists = async (username,  ) =>{

  let conn = await sql.getDBConnection();

  try{
    let [data, fields] =await conn.query("select * image WHERE username = ?", username)
 
    result(null, data);
    return
    
   
  }catch (err){
    return result(err, null);
  }
}

User.isVerified = async(username, result)=>{

  let conn = await sql.getDBConnection();

  try{
    let [data, fields] =await conn.query("select * FROM users WHERE username =?", username)
 
    result(null, data);
    return
    
   
  }catch (err){
    return result(err, null);
  }
}


module.exports = User;