import { RequestHandler } from "express";
import { AuthRepository } from "../repositories/AuthRepository";
import { User } from "../models/User";
import bcrypt from "bcrypt";
import EmailConfig from '../config/mail-config';
import OtpEmailTemplate from "../views/OtpEmailTemplate";
const repo = new AuthRepository()
/**
 * @swagger
 * tags:
 *   name: Login
 *   description: User Login With Email And Password
 */

/**
 * @swagger
 * /api/app/login:
 *   post:
 *     summary: User Login With Email And Password
 *     tags: [Login]
 *     parameters:
 *       - in: query
 *         name: mobile
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: Login successfully 
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       500:
 *         description: Some server error
 */
export const Login: RequestHandler = async (req, res, next) => {
    try {
        const response = await repo.Login(req.body);
        return res.json(response);
    } catch (e: any) {
        res.status(400).json({ success: false, data:null, error: e.message })
    }
}

export const AppLogin: RequestHandler = async (req, res, next) => {
    try {
        const response = await repo.AppLogin(req);
        return res.json(response);
    } catch (e: any) {
        res.status(400).json({ success: false, data:null, error: e.message })
    }
}
export const TokenVerification: RequestHandler = async (req, res, next) => {
    try {
        const response = await repo.ServersideTokenVerification(req);
        return res.json(response);
    } catch (e: any) {
        res.status(400).json({ success: false, data:null, error: e.message })
    }
}
// export const forgotPassword: RequestHandler = async (req, res, next) => {
  
//     try{
//       const updated = await repo.updatePassword(req)
     
//       return res.json({success: true, data: updated, error: null})
//     }catch(e:any){
//         res.status(400).json({success: false, data: null, error: ['could not edit data', e.message]})
//     }
//   };


export const forgotPassword = async (req: any, res: any) => {
    // const id = req.params.id;
    const mail = req.body.email;
  
    if (!mail) {
      res.send("email required!");
    }
  console.log(mail)
  
    const find = await User.findOne({ where: { email: mail } });
    console.log(find)
    const otp:any = Math.floor(Math.random() * 10000 + 1);
    if (!find) {
      res.send({"error":"Can't find any email"});
    }
   else{
   await User.update({otp:otp}, { where: { email: mail } });
  
   setTimeout(async ()=> {
    const data:any = {otp: null}
    await User.update(data,{where: {email: mail}})
    
    }, 300000);
   
      // let mailTransporter = nodemailer.createTransport({
      //   service: "gmail",
      //   auth: {
      //     user: process.env.AUTH_NAME,
      //     pass: process.env.AUTH_PASSWORD,
      //   },
      //   tls: { rejectUnauthorized: false },
      // });
    
      let mailDetails = {
        from: "no-reply@assamsupportschoolnetindia.com",
        to: mail,
        subject: "otp",
        html: OtpEmailTemplate(otp),
      };
    
      console.log(mailDetails);
      EmailConfig.sendMail(mailDetails, function (err:any, data:any) {
        if (err) {
          throw err;
        } else {
          return res.json({"success":"Email sent successfully"});
        }
      });
   
   
  }
   
  };

  export const verifyOtp = async (req: any, res: any) => {
    const mail = req.body.email
    const otp = req.body.otp;
    const findId = await User.findOne({ where: { email: mail, otp: otp } });
      if (findId) {
        try {
          res.json({"success": "Otp verified successfully", "id": findId.dataValues.id})
        } catch (e: any) {
          return { error: e };
        }
      } else {
        res.json({"error":"your OTP does'nt match"});
      }
    } 

  export const changePassword = async (req:any,res:any)=>{
    const passwordRegex = /^[a-zA-Z0-9!@#$%^&*]{6,16}$/;
    const id = req.body.id
    // console.log(id)
    let old: any = req.body.obj.password;
    const newPassword = req.body.obj.newPassword;
    const find = await User.findOne({where:{id:id}})
    const data = JSON.parse(JSON.stringify(find))
    const existingPassword = data.password
    const compare = await bcrypt.compare(old,existingPassword)
  
    if (newPassword === req.body.obj.confirmPassword) {
      if(newPassword != existingPassword){
     if(compare){
        try {
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(newPassword, salt);
          old = hashedPassword;
          const result = await User.update({password:old}, { where: { id: id } });
          res.json({"success":"password changed successfully"})
        } catch (e: any) {
          return { error: e };
        }
     }else{
      res.json({"error":"previous password does'nt match"});
     }
    }else{
      res.json({"error":"Your old password and new password cannot be same"});
    }
    } else {
      res.json({"error":"your passwords doesnt match"});
    }
  }
  