import {Attendance} from "../models/Attendance";
import {SchoolVisit} from "../models/SchoolVisit";
import {User} from "../models/User";
import jwt from "jsonwebtoken";
import * as path from 'path';
import * as fs from 'fs';

const { Op } = require("sequelize");


interface FileUploadResult {
  signPath: string | null;
  photoPath: string | null;
  uploadedPhotoPath: string | null;
  filePath: string | null;
}

class AttendanceRepository {
  //GET
  async list(req: any) {
    try {
      let user;
      let decodedToken: any;

      if (req.headers.authorization) {
        const jwtString = req.headers.authorization.split(" ")[1];
        decodedToken = jwt.decode(jwtString);
        user = await User.findOne({ where: { id: decodedToken.id } });
      }
      if (user) {
        const data = await Attendance.findAll();
        return data.length != 0 ? data : "no attendance found";
      }
    } catch (e: any) {
      return { error: e };
    }
  }
  async store(req: any) {
    let post = req.body

    if(req.body.mobile && req.body.mobile == "true")
      {
      // let post = req.body;
      // post = JSON.parse(post.objValue);
      console.log("parsed because mobile");
      console.log(post);

      if(!JSON.parse(post.schoolVisitId).visit_id)
      {
        console.log("visit id not found");
        if(JSON.parse(post.schoolVisitId).grievance_id)
        {
          const res: any = await SchoolVisit.findOne({
            where: { grievance_id: JSON.parse(post.schoolVisitId).grievance_id },
            attributes: ["id"]
          });
          console.log("found");
          console.log(res);

          JSON.parse(post.schoolVisitId).visit_id = res.dataValues.id;

        }
      }
    }

    let user;
    let decodedToken: any;
    if (req.headers.authorization) {
      const jwtString = req.headers.authorization.split(" ")[1];
      decodedToken = jwt.decode(jwtString);
      user = await User.findOne({ where: { id: decodedToken.id } });
    }
    if (user) {
      try {
        console.log(JSON.parse(post.schoolVisitId).visit_id)
        if(! JSON.parse(post.schoolVisitId).visit_id){

          throw new Error("Invalid Visit Id");
        }
      
        const result = await AttendanceRepository.handleFileUploads(req);
        
   
        const objValue: any = {
          check_out: JSON.parse(req.body.objValue).check_out,
          check_in: JSON.parse(req.body.objValue).check_in,
          feedback: JSON.parse(req.body.objValue).feedback,
          status: JSON.parse(req.body.objValue).status,
          sign: result.signPath,
          file: result.filePath,
          photo: result.photoPath ? result.photoPath : result.uploadedPhotoPath,
          visit_id: JSON.parse(post.schoolVisitId).visit_id,
          lat: JSON.parse(req.body.objValue).lat,
          long: JSON.parse(req.body.objValue).long,
        };

        const res = await Attendance.create(objValue);
       

        await SchoolVisit.update(
          {
            arrival: JSON.parse(req.body.objValue).check_in,
            departure: JSON.parse(req.body.objValue).check_out,
            status: JSON.parse(req.body.objValue).status,
            visited_date: res.dataValues.createdAt,
          },
          { where: { id: JSON.parse(post.schoolVisitId).visit_id } }
        );
        //  console.log(req.body)
        return res;
      } catch (e: any) {
        return { error: e };
      }
    }
  }


  async markVisit(req: any) {
    let post = req.body.objValue;

    // console.log(req.body);
    if(req.body.mobile && req.body.mobile == "true")
    {
      post = JSON.parse(post);
    
    }
 

    let user;
    let decodedToken: any;
    if (req.headers.authorization) {
      const jwtString = req.headers.authorization.split(" ")[1];
      decodedToken = jwt.decode(jwtString);
      user = await User.findOne({ where: { id: decodedToken.id } });
    }
    if (user && user.dataValues.user_type == 4) {
      try {
        const result = await AttendanceRepository.handleFileUploads(req);


        const obj: any = {
          school_id: post.schoolId,
          service_engineer: decodedToken.id,
          arrival: post.check_in,
          departure: post.check_out,
          status: post.status,
        };
        const visit = await SchoolVisit.create(obj);
        
        const objValue: any = {
          check_out: post.check_out,
          check_in: post.check_in,
          feedback: post.feedback,
          status: post.status,
          sign: result.signPath,
          file: result.filePath,
          photo: result.photoPath ? result.photoPath : result.uploadedPhotoPath,
          visit_id: visit.dataValues.id,
          lat: post.lat??0,
          long: post.long??0,
        };

        const res = await Attendance.create(objValue);
      
        await SchoolVisit.update(
          {
            date: res.dataValues.createdAt,
            visited_date: res.dataValues.createdAt,
          },
          { where: { id: visit.dataValues.id } }
        );
        return res;
      } catch (e: any) {
  
        return { error: e };
      }
    }
  }
  async update(req: any) {
    let user;
    let decodedToken: any;

    if (req.headers.authorization) {
      const jwtString = req.headers.authorization.split(" ")[1];
      decodedToken = jwt.decode(jwtString);
      user = await User.findOne({ where: { id: decodedToken.id } });
    }
    if (user) {
      // const IssueId: any = await Issue.findOne({where: {id: req.body.id, deletedAt: ''}})
      try {
        await Attendance.update(
          {
            ...req.body,
          },
          { where: { id: req.body.id } }
        );
      } catch (e: any) {
        return { error: e };
      }
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
        const res = await Attendance.findOne({ where: { id: req.body.id } });
        return res;
      }
    } catch (e: any) {
      return { error: e };
    }
  }
  async delete(req: any) {
    let user;
    let decodedToken: any;
    if (req.headers.authorization) {
      const jwtString = req.headers.authorization.split(" ")[1];
      decodedToken = jwt.decode(jwtString);
      user = await User.findOne({ where: { id: decodedToken.id } });
    }
    if (user) {
      const val = await Attendance.findOne({ where: { id: req.params.id } });

      if (!val) {
        throw new Error("id not found");
      } else {
        try {
          const res = await Attendance.destroy({
            where: { id: req.params.id },
          });
          return { res };
        } catch (e: any) {
          return { error: e };
        }
      }
    }
  }

  static async handleFileUploads(req: any): Promise<FileUploadResult> {
    // console.log('file----',req.files?.sign)
    // console.log('body----',req.body)

    const sign = req.files?.sign;
    const photo = req.files?.photo;
    const file = req.files?.file;
    const uploadedPhoto = req.files?.uploadedPhoto;
    // console.log("upload base is:"+process.env.UPLOAD_BASE);

    let signFileName = null;
    let photoFileName = null;
    let uploadedPhotoFileName = null;
    let attachFileName = null;
    // Define the upload directory

    const uploadPath = process.env.UPLOAD_BASE;

    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    // Move the files to the upload directory
    if (sign) {
      const uniqueSuffix = "sign_" + Date.now() + '-' + Math.round(Math.random() * 1E9);
      signFileName = uniqueSuffix + path.extname(sign.name);
      console.log(signFileName);
      await sign.mv(path.join(uploadPath, signFileName));
    }

    if (photo) {
      const uniqueSuffix = "photo_" + Date.now() + '-' + Math.round(Math.random() * 1E9);
      photoFileName = uniqueSuffix + path.extname(photo.name);
      await photo.mv(path.join(uploadPath, photoFileName));
    }

    if (file) {
      const uniqueSuffix = "file_" + Date.now() + '-' + Math.round(Math.random() * 1E9);
      attachFileName = uniqueSuffix + path.extname(file.name);
      await file.mv(path.join(uploadPath, attachFileName));
    }
    if (uploadedPhoto) {
      const uniqueSuffix = "uploadedPhoto_" + Date.now() + '-' + Math.round(Math.random() * 1E9);
      uploadedPhotoFileName = uniqueSuffix + path.extname(uploadedPhoto.name);
      await uploadedPhoto.mv(path.join(uploadPath, uploadedPhotoFileName));
    }
    const signPath = sign ? `/uploads/${signFileName}` : null;
    const photoPath = photo ? `/uploads/${photoFileName}` : null;
    const filePath = file ? `/uploads/${attachFileName}` : null;
    const uploadedPhotoPath = uploadedPhoto ? `/uploads/${uploadedPhotoFileName}` : null;


    return { signPath, photoPath, filePath, uploadedPhotoPath };
  }
}

export { AttendanceRepository };
