import { User, UserMember } from "../models/User";
const { Op } = require("sequelize");
import jwt from "jsonwebtoken";
import { config } from "../config/jwt-config";
import { School } from "../models/School";
const bcrypt = require("bcrypt");
import EmailConfig from '../config/mail-config';
import LoginTemplate from "../views/LoginTemplate";
import { Asset, AssetMembers } from "../models/Asset";
import path from "path";
const parse = require("csv-parser");
const xlsx = require('xlsx');
const fs = require('fs');
interface FileUploadResult {
  filePath: string | null;
}
class UserRepository {
  //GET

  async list(req: any) {
    try {
      let user: any;
      let decodedToken: any;
      let data;
      if (req.headers.authorization) {
        const jwtString = req.headers.authorization.split(" ")[1];
        decodedToken = jwt.decode(jwtString);
        user = await User.findOne({ where: { id: decodedToken.id } });
      }
      // console.log(req.params.type)
      if (user) {
        
        if(req.params.type == 1){
          if(req.params.ifp == 'true'  && req.params.kyan == 'true'){
            console.log('1',req.params.ifp == 'true' , '    ', req.params.kyan)
            data = await User.findAll({where: {user_type: 4}, attributes: ['id', 'user_name']});
          }else if(req.params.ifp == 'true' && req.params.kyan == 'false'){
            console.log('2',req.params.ifp , '    ', req.params.kyan)
            data = await User.findAll({where: {user_type: 4, project: 1}, attributes: ['id', 'user_name']});
          }else if(req.params.kyan=='true' && req.params.ifp=='false'){
            console.log('3',req.params.ifp , '    ', req.params.kyan)
            data = await User.findAll({where: {user_type: 4, project: 2}, attributes: ['id', 'user_name']});
          }
          else if(req.params.kyan=='false' && req.params.ifp=='false'){
            
            data =[]
          }
          else{
            data = await User.findAll({where: {user_type: 4}, attributes: ['id', 'user_name']});

          }
     
        }else{
          if(req.params.type == 2){
            data = await User.findAll({where: {user_type: 2}, attributes: ['id', 'user_name']});
          }

        }

        return data ;
      }
    } catch (e: any) {
      return { error: e };
    }
  }
  
  async getById(req: any) {
    try {
      let user;
      let decodedToken: any;

      if (req.headers.authorization) {
        const jwtString = req.headers.authorization.split(" ")[1];
        decodedToken = jwt.decode(jwtString);
        user = await User.findOne({ where: { id: decodedToken.id } });
      }
      if (user) {
        const data = await User.findOne({ where: { id: req.params.id } });
        return  data ;
      }
    } catch (e: any) {
      return { error: e };
    }
  }
  // store
  async store(req: any) {
    let post = req.body;
    let user;
    let decodedToken: any;
    const phoneno = /^\d{10}$/;
    const mailformat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    let phoneNumber = String(post.phone);
    const phone_number = await User.findOne({ where: { phone: phoneNumber } });
    const email = await User.findOne({ where: { email: post.email } });

    if (req.headers.authorization) {
      const jwtString = req.headers.authorization.split(" ")[1];
      decodedToken = jwt.decode(jwtString);
      user = await User.findOne({ where: { id: decodedToken.id } });
    }
    if (user) {
      if (!post.user_name) {
        throw new Error("Must include Name");
      }
       else if (!post.email.match(mailformat)) {
        throw new Error("Email is not valid");
      } else if (email) {
        throw new Error("Email is already present in the database");
      } else {
        try {
          const salt = await bcrypt.genSalt(10);
          const pass = req.body.phone;
          const hashedPassword = await bcrypt.hash(pass, salt);
          const res: any = {
            password: hashedPassword,
            user_name: req.body.user_name?.toLowerCase().replace(/(^|\s)\S/g, (match:any) => match.toUpperCase()),
            phone: req.body.phone,
            email: req.body.email,
            role: req.body.role,
            school_id: req.body.school_id != '' ? req.body.school_id : req.body.school_id != false ? req.body.school_id : null,
            user_type: req.body.user_type,
            gender: req.body.gender,
            district: req.body.district,
            address: req.body.address,
            project: req.body.user_type != 1 ? req.body.project : 0
          };
    //  console.log(res)
          const data = await User.create(res);
          let mailDetails = {
            from: "no-reply@assamsupportschoolnetindia.com",
            to: req.body.email,
            subject: "Account created successfully!",
            html: LoginTemplate(req.body),
          };
        
          // console.log(mailDetails);
          EmailConfig.sendMail(mailDetails, function (err:any, data:any) {
            if (err) {
              throw err;
            } else {
              return res.json({"success":"Email sent successfully"});
            }
          });
          return data;
        } catch (e: any) {
          return { error: e };
        }
      }
    }
  }

  async update(req: any) {
    let user;
    let decodedToken: any;
    let count = 0;

    if (req.headers.authorization) {
      const jwtString = req.headers.authorization.split(" ")[1];
      decodedToken = jwt.decode(jwtString);
      user = await User.findOne({ where: { id: decodedToken.id } });
    }
    if (user) {
      const findUserEmail = await User.findAll({where: {email: req.body.email , phone: req.body.phone}});

      findUserEmail.map(async (data) => {
        if ((data.dataValues.email == req.body.email || data.dataValues.phone == req.body.phone) && data.dataValues.id != req.params.id ) {
          count++;
        }
      });

      if (count > 0) {
        throw new Error("Email Id or Phone Number already exists");
      } else {
        try {
          await User.update(
            {
              user_name: req.body.user_name,
              phone: req.body.phone,
              email: req.body.email,
              role: req.body.role,
              school_id: req.body.school_id,
              user_type: req.body.user_type,
              gender: req.body.gender,
              district: req.body.district,
              address: req.body.address,
            },
            { where: { id: req.params.id } }
          );
        } catch (e: any) {
          return { error: e };
        }
      }
     
    }
  }

  //DELETE
  async delete(req: any) {
    let user;
    let decodedToken: any;
    if (req.headers.authorization) {
      const jwtString = req.headers.authorization.split(" ")[1];
      decodedToken = jwt.decode(jwtString);
      user = await User.findOne({
        where: { id: decodedToken.id, user_type: 1 },
      });
    }
    if (user) {
      const val = await User.findOne({ where: { id: req.params.id } });
      if (!val) {
        throw new Error("id not found");
      } else {
        try {
          const res = await User.destroy({ where: { id: req.params.id } });
          return { res };
        } catch (e: any) {
          return { error: e };
        }
      }
    }
  }

  async storeDoc(files:any) {
   
    let sampleFile:any;
    let uploadPath: any;
    
    if (!files || Object.keys(files).length === 0) {
       throw new Error('No files were uploaded.');
    }
   
    sampleFile = files.files;
    let file_name = new Date().getTime() +'_'+sampleFile.name;
    uploadPath = './src/repositories/import/' + file_name;
 
    sampleFile.mv(uploadPath, function(err:any) {
        if (err)
          throw new Error(err);
        else{
          const workbook = xlsx.readFile(uploadPath);
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          
          const csvData = xlsx.utils.sheet_to_csv(sheet, { FS: ',' });
          const outputCsvFilePath = './src/repositories/import/' + file_name+'.csv';
          fs.writeFileSync(outputCsvFilePath, csvData, 'utf8');
          
          // console.log('Conversion successful. CSV file saved to', outputCsvFilePath);
          fs.createReadStream(outputCsvFilePath)
          .pipe(
            parse({
              delimiter: ",",
              headers: ['project', 'asset_category_id', "asset_type_id", 'model', 'serial_no','UDISE_code','schoolnet_code'],
            })
          )
          .on("data", async (row: AssetMembers) => {
            const {project, asset_category_id, asset_type_id,model, serial_no, UDISE_code, schoolnet_code }: any =
              row;

            const deletedAt: Date | undefined = undefined;
            let schoolId: any = null;
            if(UDISE_code != undefined){
               schoolId = await School.findOne({where: {UDISE_code: UDISE_code}})
            }
            let assetType = (asset_type_id == 'Interactive Flat panel (65")') ? 1 : (asset_type_id == 'External Speaker Set') ? 2 : (asset_type_id == 'Wi-Fi Router') ? 3: 
            (asset_type_id == 'SIM') ? 4 : (asset_type_id == '1 KVA Online UPS') ? 5 : (asset_type_id == 'Electrification in Lab to connect devices') ? 6 :(asset_type_id ==  'Earthing for lab devices') ? 7 :(asset_type_id ==  'UPS SMF Batteries 26AH')?8: (asset_type_id == 
            'Metal Rack for Batteries')? 9 : (asset_type_id == 'Cabinet for Interactive Flat Panel')? 10 : (asset_type_id == 'K-Yan')? 11 : (asset_type_id == 'Almirah')? 12: (asset_type_id == 'Trolley Table')? 13 : 14
            if(project == "KYAN" || project == "IFP" || project == "BOTH"){
  
              const userData: any = {
                school_id: schoolId?.dataValues.id,
                project: project == "IFP" ? 1 : 2,
                updatedAt: new Date(), 
                deletedAt,
                model: model,
                serial_no: serial_no,
                asset_type_id: assetType,
                added_on: new Date(),
              };
              if(userData.model !== undefined || userData.serial_no !== undefined){
      
                await Asset.create(userData)
              }
            }
            
          })
          .on("end", () => {
            console.log("CSV file successfully processed.");
          });
        }                
      });
      return { body: "Documents Updated" };
}
async uploadUserFile(req: any) {
  let post: any = JSON.parse(req.body.data);
  let user: any;
  let decodedToken: any;

  // Decode token and find user
  if (req.headers.authorization) {
      const jwtString = req.headers.authorization.split(" ")[1];
      decodedToken = jwt.decode(jwtString);
      user = await User.findOne({ where: { id: decodedToken.id } });
  }

  if (user) {
      try {
          const userId = post.user_id || decodedToken.id; 
          const data: any = {};

          // Handle file uploads
          if (req.files) {
              const result = await UserRepository.handleFileUploads(req);
              console.log('File upload result:', result.filePath);
              data.file = result.filePath;
          }

          // Update the user's file field with the uploaded file path or URL
          await User.update(
              { profile_picture: data.file },
              { where: { id: userId } }
          );

          return { success: true, message: 'File uploaded and user updated successfully', file: data.file };
      } catch (e: any) {
          console.error('Error during file upload:', e);
          return { error: e.message };
      }
  } else {
      return { error: 'User not found or unauthorized' };
  }
}
static async handleFileUploads(req: any): Promise<FileUploadResult> {

  const file = req.files?.file;


  console.log("upload base is:" + process.env.UPLOAD_BASE);


  let attachFileName = null;

  // Define the upload directory

  const uploadPath = process.env.UPLOAD_BASE;
  // Ensure directory exists
  if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, {recursive: true});
  }

  if (file) {
      const uniqueSuffix = file.name.replace(" ", "_") + Date.now() + '-' + Math.round(Math.random() * 1E9);
      attachFileName = uniqueSuffix + path.extname(file.name);
      console.log("file found, moving to:" + path.join(uploadPath, attachFileName));
      await file.mv(path.join(uploadPath, attachFileName));
  }

  
  const filePath = file ? `/uploads/${attachFileName}` : null;
  
  return { filePath };
}
}

export { UserRepository };
