import * as jwt from "jsonwebtoken"
import { config } from "../config/jwt-config"
import { User } from "../models/User";
import bcrypt from "bcrypt";
import { Op } from "sequelize";
const nodemailer = require("nodemailer");
export class AuthRepository {

    async Login(data: any) {
        if (data.email == '' || data.password == '') {
            throw new Error("Invalid credentials!");
        }

        const user = await User.findOne({
            where: {
                email: data.email
            }
        });

        if (user) {
            const verifyPassword = bcrypt.compareSync(data.password, user.dataValues.password)
            if (!verifyPassword) {
                return { result: { token: null, error: 'Invalid password!' } }
            }

            const token = jwt.sign({ id: user.dataValues.id}, config.jwt.SECRET, { expiresIn: "30d" });
            const decodedToken: any = jwt.decode(token);
            const findUserDetails = await User.findOne({ where: { id: decodedToken.id } });
            return { "access_token": token,
            "token_type": "bearer",
            "expires_in": 2592000,
            "user": {
              "id": findUserDetails?.dataValues.id,
              "name": findUserDetails?.dataValues.user_name,
              "type": findUserDetails?.dataValues.user_type,
              "email": findUserDetails?.dataValues.email,
            "school_id": findUserDetails?.dataValues.school_id

          },
          "success": true
           };
        } else {
            return { result: { token: null, error: 'Invalid credentials!' } }
        }
    }

    async AppLogin(data: any) {
  
      if (data.body.email == '' || data.body.password == '') {
          throw new Error("Invalid credentials!");
      }
      let user = await User.findOne({
        where: {
            email: data.body.email
        }
    });
    if (user) {
      // console.log(user?.dataValues.user_type == 4)
      
      if((user?.dataValues.user_type == 3 || user?.dataValues.user_type == 4)  )
      {
        
        const verifyPassword = bcrypt.compareSync(data.body.password, user.dataValues.password)
        // console.log(verifyPassword)
        if (!verifyPassword) {
          return { "access_token": null,
          "token_type": null,
          "expires_in": null,
          "user": null,
         "success": false,
         "error": "Invalid password"
         };
        }

        const token = jwt.sign({ id: user.dataValues.id}, config.jwt.SECRET, { expiresIn: "30d" });
        const decodedToken: any = jwt.decode(token);
        const findUserDetails = await User.findOne({ where: { id: decodedToken.id } });
        return { 
          "access_token": token,
        "token_type": "bearer",
        "expires_in": 2592000,
        "user": {
          "id": findUserDetails?.dataValues.id,
          "name": findUserDetails?.dataValues.user_name,
          "type": findUserDetails?.dataValues.user_type,
          "email": findUserDetails?.dataValues.email,
          "school_id": findUserDetails?.dataValues.school_id,
          "profilePic": findUserDetails?.dataValues.profile_picture
        },
       "success": true,
       "error": false
       };
      }else{
        return { "access_token": null,
        "token_type": null,
        "expires_in": null,
        "user": null,
       "success": false,
       "error": "Invalid user details"
       };
      }
      } else {
        return { 
          "access_token": null,
        "token_type": null,
        "expires_in": null,
        "user": null,
       "success": false,
       "error": "Invalid Credentials"
       };
      }
  }
    async ServersideTokenVerification(data: any) {
      if (data.headers.authorization == '') {
          throw new Error("Token not found!");
      }else{
        const jwtString = data.headers.authorization.split(" ")[1];
        const decodedToken: any = jwt.decode(jwtString)
        const findUserDetails = await User.findOne({ where: { id: decodedToken.id } });
        const token = jwt.sign({ id: decodedToken.id}, config.jwt.SECRET, { expiresIn: "30d" });
        if(findUserDetails){

          return {
            "access_token": token,
            "token_type": "bearer",
            "expires_in": 2592000,
          "user": {
            "id": findUserDetails?.dataValues.id,
            "name": findUserDetails?.dataValues.user_name,
            "type": findUserDetails?.dataValues.user_type,
            "email": findUserDetails?.dataValues.email,
            "school_id": findUserDetails?.dataValues.school_id,
            "profilePic": findUserDetails?.dataValues.profile_picture
        },
        "success": true,
       "error": false

         };
        }
        else {
          return {
            "access_token": null,
            "token_type": null,
            "expires_in": null,
          "user": null,
        "success": false,
       "error": "Invalid User!"

         };
        }
      }
  }
    async updatePassword(req: any) {
        let user;
        let decodedToken: any;
        let count = 0;
    
        if (req.headers.authorization) {
          const jwtString = req.headers.authorization.split(" ")[1];
          decodedToken = jwt.decode(jwtString);
          user = await User.findOne({ where: { id: decodedToken.id } });
        }
    
        if (user) {
          let passwordIsValid = bcrypt.compareSync(
            req.body.currentPassword,
            user.dataValues.password
          );
          const findUserEmail = await User.findAll({
            where: { id: { [Op.ne]: decodedToken.id } },
          });
          findUserEmail.map(async (data) => {
            if (data.dataValues.email == req.body.email) {
              count++;
            }
          });
          if (!passwordIsValid) {
            return { result: { token: null, error: "Invalid current password!" } };
          }
          
    
          if (count != 0) throw new Error("Email Id already exists");
          else {
            const salt = await bcrypt.genSalt(10);
            const pass = req.body.newPassword;
            const hashedPassword = await bcrypt.hash(pass, salt);
            const token = jwt.sign({ id: user.dataValues.id }, config.jwt.SECRET, { expiresIn: "30d" });
    
            try {
              await User.update(
                {
                  password: hashedPassword,
                },
                { where: { id: decodedToken.id } }
              )
              return { result: { token: token } };
            } catch (e: any) {
              return { error: e };
            }
          }
        }
      }


}


