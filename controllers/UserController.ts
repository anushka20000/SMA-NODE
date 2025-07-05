import { RequestHandler } from "express";
import Express, { Request, Response } from "express";
import { User, UserMember } from "../models/User";
import { UserRepository } from "../repositories/UserRepository";
const { Op } = require("sequelize");
import jwt from "jsonwebtoken";
import { School, SchoolMembers } from "../models/School";
const parse = require("csv-parser");
const fs = require("fs");
import bcrypt from "bcrypt";
import { Asset, AssetMembers } from "../models/Asset";
import { AssetTypeMembers } from "../models/AssetType";
const repo = new UserRepository();
//GET

export const getServiceEngineer: RequestHandler = async (req, res, next) => {
  try {
    const data = await repo.list(req);
    return res.json({ success: true, data: data });
  } catch (e: any) {
    res
      .status(404)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};

/**
 * @swagger
 * /api/user/edit/{id}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *     summary: Dashboard details
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             example:
 *               success : true
 *               data: {
 *                  "count": 0,
 *                  "completed": 0,
 *                  "pending": 0,
 *                  "progress": 0,
 *                  "school": 62,
 *                  "visit": 1
 *                   }
 *               error:
 *       500:
 *         description: Some server error
 *         content:
 *           application/json:
 *             example:
 *               success : false
 *               data : {}
 *               error:
 */
export const getUserById: RequestHandler = async (req, res, next) => {
  try {
    const data = await repo.getById(req);
    return res.json({ success: true, data: data });
  } catch (e: any) {
    res
      .status(404)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};
export const checkEmailUniqueness: RequestHandler = async (req, res, next) => {
  try {
    let user: any;
    let decodedToken: any;
    if (req.headers.authorization) {
      const jwtString = req.headers.authorization.split(" ")[1];
      decodedToken = jwt.decode(jwtString);
      user = await User.findOne({ where: { id: decodedToken.id } });
    }
    if (user) {
      const data = await User.findOne({ where: { email: req.body.email } });
      if (data) {
        return res.json({ success: false });
      } else {
        return res.json({ success: true });
      }
    }
  } catch (e: any) {
    return { error: e };
  }
};
export const checkPhoneUniqueness: RequestHandler = async (req, res, next) => {
  try {
    let user: any;
    let decodedToken: any;
    if (req.headers.authorization) {
      const jwtString = req.headers.authorization.split(" ")[1];
      decodedToken = jwt.decode(jwtString);
      user = await User.findOne({ where: { id: decodedToken.id } });
    }
    if (user) {
      const data = await User.findOne({ where: { phone: req.body.phone } });
      if (data) {
        return res.json({ success: false });
      } else {
        return res.json({ success: true });
      }
    }
  } catch (e: any) {
    return { error: e };
  }
};
export const saveUser: RequestHandler = async (req, res, next) => {
  try {
    const data = await repo.store(req);
    return res.json({ success: true, data: data });
  } catch (e: any) {
    res
      .status(400)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};
export const updateProfilePicture: RequestHandler = async (req, res, next) => {
  try {
    const data = await repo.uploadUserFile(req);
    return res.json({ success: true, data: data });
  } catch (e: any) {
    res
      .status(400)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};
export const updateUser: RequestHandler = async (req, res, next) => {
  try {
    await repo.update(req);
    return res.json({ success: true });
  } catch (e: any) {
    res
      .status(400)
      .json({ success: false, error: ["could not update data", e.message] });
  }
};
export const destroyUser: RequestHandler = async (req, res, next) => {
  try {
    await repo.delete(req);
    return res.json({ success: true });
  } catch (e: any) {
    res
      .status(400)
      .json({ success: false, error: ["could not update data", e.message] });
  }
};
export const getUsersList: RequestHandler = async (req, res, next) => {
  try {
    let user: any;
    let decodedToken: any;
    if (req.headers.authorization) {
      const jwtString = req.headers.authorization.split(" ")[1];
      decodedToken = jwt.decode(jwtString);
      user = await User.findOne({ where: { id: decodedToken.id } });
    }
    if (user) {
      const draw = req.body.draw;
      const start = parseInt(req.body.start as string, 10) || 0;
      const length = parseInt(req.body.length as string, 10) || 10;
      const searchValue = (req.body.search as any)?.value || "";

      // For ordering (sorting)
      const orderColumnIndex = (req.body.order as any)?.[0]?.column;
      const orderDir = (req.body.order as any)?.[0]?.dir || "asc";
      const orderColumnName =
        (req.body.columns as any)?.[orderColumnIndex]?.data || "id";

      // Search logic
      let searchCondition = {};
      if (searchValue) {
        searchCondition = {
          [Op.or]: [
            { id: { [Op.eq]: `${searchValue}` } },
            { user_name: { [Op.like]: `%${searchValue}%` } },
            { email: { [Op.like]: `%${searchValue}%` } },
            { phone: { [Op.like]: `%${searchValue}%` } },
            { role: { [Op.like]: `%${searchValue}%` } },


            // Add other fields if necessary
          ],
        };
      }

      // Fetching the users with pagination, search, and sort
      if(user.user_type == 1 || user.user_type == 5){

        const { count, rows } = await User.findAndCountAll({
          where: req.body.userType != 0 ? {...searchCondition, user_type: req.body.userType}: searchCondition,
          include: [{model: School,attributes: ["id", "name", "district"]}],
          order: [[orderColumnName, orderDir]],
          offset: start,
          limit: length,
        });

        const list = await Promise.all(rows.map(async (user:any) => {
          const userData = user.toJSON(); 
          userData.schools = await School.findOne({
            where: { id: user.school_id }, 
            attributes: ["id", "name", "district"]
          });
          return userData;
        }));
        const users = await User.findAll({
          order: [[orderColumnName, orderDir]]
        });
        
      
        const excelData = await Promise.all(users.map(async (user:any) => {
          const userData = user.toJSON(); 
          userData.schools = await School.findOne({
            where: { id: user.school_id }, 
            attributes: ["id", "name", "district"]
          });
          return userData;
        }));
        
        const data = list.map((user: any) => (
          {
          id: user.id,
          user_name: user.user_name,
          email: user.email,
          user_type: user.user_type,
          phone: user.phone,
          role: user.role,
          project:  user.project,
          district: user.schools != null ? user.schools.district : '',
          school: user.schools != null ? user.schools.name : '',
        }
       
        ));
        const dataForExcel = excelData.map((user: any) => (
          {
          // id: user.id,
          user_name: user.user_name,
          email: user.email,
          school_id: user.school_id,
          user_type: user.user_type == 1 ? 'Admin' : user.user_type == 2 ? 'OEM': user.user_type == 3 ? 'School View': user.user_type == 4 ? 'Service Engineer':user.user_type == 5 ? 'Help Desk': 'Management',
          phone: user.phone,
          role: user.role,
          project: user.project == 1 ? 'IFP': user.project == 2 ? 'KYAN':'',
          district: user.schools != null ? user.schools.district : '',
          school: user.schools != null ? user.schools.name : '',
        }
        ));
  
        res.json({
          draw: draw,
          recordsTotal: count,
          recordsFiltered: count,
          data: data,
          searchCondition: searchCondition,
          searchValue: searchValue,
          excel: dataForExcel
        });
      } else {
        res.status(404).send("Users not found!");
      }
      }
  } catch (error) {
    res.status(500).send("Error while fetching users" + JSON.stringify(error));
  }
};

export const exportServiceEngineerINSCHOOLToDB: RequestHandler = async (req, res, next) => {
  try {
    // const filePath = "./i";
    fs.createReadStream("./import/udise.csv")
      .pipe(
        parse({
          delimiter: ",",
          headers: ['UDISE_code','user_name'],
        })
      )
      .on("data", async (row: any) => {
        // console.log(row);
        // Extract relevant columns from CSV row
        const {UDISE_code, user_name}: any =
          row;

      const school = await School.findOne({where: {UDISE_code: UDISE_code}})
          if(school){
        const user = await  User.findOne({where: {user_name: user_name.trim()}})
        await User.update({school_id: school.dataValues.id},{where: {id: user.dataValues.id}})
     }
        // if(model == 'YES'){

          // const data = await School.findOne({where: {UDISE_code:  code !== undefined && code}})
          // // data.map(async(data: any)=>{
          //   // console.log(data)
          //   if(serial_no !== undefined){

          //     const res = await Asset.update({school_id: data?.dataValues.id}, {where: {serial_no: serial_no !== undefined && serial_no}})
          //   }
          //  console.log(data.id)
          // })
        // }
      })
      .on("end", () => {
        console.log("CSV file successfully processed.");
      });
  } catch (e: any) {
    res
      .status(404)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};

export const exportServiceEngineer: RequestHandler = async (req, res, next) => {
  try {
    const processedUsers = new Set();

    const readStream = fs.createReadStream("./import/kyanse.csv");
    const csvStream = parse({
      delimiter: ",",
      headers: ['project', 'user_name', "phone", "email", "gender", "role", "district", "address"],
    });

    csvStream.on("data", async (row: any) => {
      csvStream.pause(); // Pause the stream to process data sequentially

      const { project, user_name, phone, email, gender, role, district, address } = row;

      const userKey = `${phone.trim()}|${email.trim()}`;

      // Check if the user has already been processed
      if (!processedUsers.has(userKey)) {
        // Check for existing user in the database
        const userExists = await User.findOne({
          where: {
            phone: phone.trim(),
            email: email.trim(),
            user_type: 4,
          },
        });

        if (!userExists) {
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(phone.trim(), salt);

          const userData: any = {
            createdAt: new Date(),
            updatedAt: new Date(),
            user_name: user_name.trim(),
            phone: phone.trim(),
            email: email.trim(),
            district: district.trim(),
            gender: gender.trim(),
            password: hashedPassword,
            user_type: 4,
            project: project.trim() === 'IFP' ? 1 : 2,
            address: address.trim(),
            role: role.trim(),
          };

          await User.create(userData);
        }

        // Add the user to the processed set
        processedUsers.add(userKey);
      }

      csvStream.resume(); // Resume the stream after processing the data
    });

    csvStream.on("end", () => {
      console.log("CSV file successfully processed.");
      res.status(200).json({ success: true, message: "CSV file successfully processed." });
    });

    readStream.pipe(csvStream);
  } catch (e: any) {
    res.status(404).json({ success: false, error: ["could not read data", e.message] });
  }
};

export const exportSchoolUser: RequestHandler = async (req, res, next) => {
  try {
    fs.createReadStream("./import/schoolUser.csv")
      .pipe(
        parse({
          delimiter: ",",
          headers: ['project', 'school_id', 'user_name', "email", "phone", "gender", "role", "district", "address"],
        })
      )
      .on("data", async (row: UserMember) => {
        const {project,school_id, user_name, email,phone, gender, role, district, address }: any =
          row;
          let schoolId:any
          if(school_id != undefined){
            schoolId = await School.findOne({where: {UDISE_code: school_id}})
         }
        const deletedAt: Date | undefined = undefined;
        const salt = await bcrypt.genSalt(10);
        const pass = phone;
        const hashedPassword = await bcrypt.hash(pass, salt);
        await User.destroy({where:{email: 'undefined@gmail.com'}})
    
     
        
      })
      .on("end", () => {
        console.log("CSV file successfully processed.");
      });
  } catch (e: any) {
    res
      .status(404)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};

export const exportSchool: RequestHandler = async (req, res, next) => {
  try {
    fs.createReadStream("./import/debojit.csv")
      .pipe(
        parse({
          delimiter: ",",
          // headers: ['project', 'school_type', 'name', 'UDISE_code', "address", "district", "pincode", "block", "master_name", "master_number", "contact_person", "contact_person_number"],
          headers: ['UDISE_code'],
        })
      )
      .on("data", async (row: any) => {
        // const {project,school_type,name, UDISE_code, address, district, pincode, block, master_name, master_number, contact_person, contact_person_number }: any =
        //   row;
        const {UDISE_code}: any =
        row;
          // if(UDISE_code !== undefined || UDISE_code !== null){
          //   const schoolData: any = {
          //     createdAt: new Date(), 
          //     updatedAt: new Date(), 
          //     name: name,
          //     UDISE_code: UDISE_code,
          //     district: district,
          //     pincode: pincode,
          //     block: block,
          //     school_type: school_type == 'Secondary' ? 2 : 1,
          //     kyan: (project == 'KYAN' || project == 'BOTH') ? 1 : 0,
          //     ifp: (project == 'IFP' || project == 'BOTH') ? 1 : 0,
          //     master_name: master_name,
          //     address: address,
          //     master_number: master_number,
          //     contact_person: contact_person,
          //     contact_person_number: contact_person_number
          //   };
            // const school = await School.create(schoolData)
            // console.log(school);
          // }

          // one
          // const duplicate = await School.findAll({where: {UDISE_code: UDISE_code}})

          // if(duplicate.length > 1){
          //   duplicate.map(async data => {
          //     if(!(data.dataValues.kyan == 1 && data.dataValues.ifp == 1)){
          //       await School.destroy({where: {id: data.dataValues.id}})
          //     }
          //   })
          // }
          // if(duplicate.length > 1){
          //   duplicate.map(async data => {
          //     if(data.dataValues.ifp == 0){
          //       await School.update({ifp: 1, kyan: 1},{where: {id: data.dataValues.id}})
          //     }
          //   })
          // }
          
          const obj:any = {service_engineer: 11}
          await School.update(obj,{where: {UDISE_code: UDISE_code}})
        
      })
      .on("end", () => {
        console.log("CSV file successfully processed.");
      });
  } catch (e: any) {
    res
      .status(404)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};

export const exportAssetFileToDB = async (req: Request, res: Response) => {
 
  try {
    const created = await repo.storeDoc(req.files)
    return res.json({success: true,data: 'created'})
} catch (e: any) {
    res.status(400).json({error: e.message})
} 
};