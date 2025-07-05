import  {RequestHandler} from "express";
import { User } from "../models/User";
import { AttendanceRepository } from "../repositories/AttendanceRepository";
import { Attendance } from "../models/Attendance";
const { Op } = require("sequelize");
import jwt from "jsonwebtoken";
import { SchoolVisit } from "../models/SchoolVisit";
import { School } from "../models/School";
import moment from "moment";

const repo = new AttendanceRepository()
//GET 

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         objValue:
 *           type: string
 *         password:
 *           type: string
 */
export const getAttendanceById: RequestHandler = async (req, res, next) => {
  try{
      const data = await repo.list(req)
      return res.json({ success: true, data: data })
  }catch(e:any){
    res.status(404).json({success: false, error: ['could not read data', e.message]})
  }
  };

/**
  * @swagger
  * tags:
  *   name: Attendance
  *   description: Attendance Api
  */

/**
 * @swagger
 * /api/attendance/store:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: Save service engineer Attendance
 *     tags: [Attendance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               objValue:
 *                 type: object
 *                 properties:
 *                   check_in:
 *                     type: string
 *                     format: time
 *                   check_out:  
 *                     type: string
 *                     format: time
 *                   feedback: 
 *                     type: string
 *                   status:
 *                     type: tinyint
 *                   sign:
 *                     type: string
 *                   file: 
 *                     type: string
 *               schoolVisitId:
 *                  type: object
 *                  properties:
 *                    visit_id: 
 *                     type: bigint
 *     responses:
 *       200:
 *         description: Attendance saved successfully 
 *       500:
 *         description: Some server error
 */
  export const saveAttendance: RequestHandler = async(req, res, next)=>{
 
    try{
        const data = await repo.store(req)
        return res.json({success: true, data: data})
    }catch(e:any){
        res.status(400).json({success: false, error: ['could not read data', e.message]})
    }
  };
  export const markVisit: RequestHandler = async(req, res, next)=>{
 
    try{
        const data = await repo.markVisit(req)
        return res.json({success: true, data: data})
    }catch(e:any){
        res.status(400).json({success: false, error: ['could not read data', e.message]})
    }
  };
  export const updateAttendance: RequestHandler = async (req, res, next) => {
    try{
      await repo.update(req)
      return res.json({success: true})
    }catch(e:any){
        res.status(400).json({success: false, error: ['could not update data', e.message]})
    }
  };
  export const destroyAttendance: RequestHandler = async (req, res, next) => {
    try{
      await repo.delete(req)
      return res.json({success: true})
    }catch(e:any){
      res.status(400).json({success: false, error: ['could not update data', e.message]})
  }
  };

  export const getAttendanceList: RequestHandler = async (req, res, next) => {
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
        const orderColumnIndex = (req.body.order as any)?.[0]?.column;
        const orderDir = (req.body.order as any)?.[0]?.dir || "DESC";
        const orderColumnName =
          (req.body.columns as any)?.[orderColumnIndex]?.data || "name";
        let searchCondition = {};
        // req.body.to.setDate(req.body.to.getDate() + 1);
    
        if (searchValue) {
          searchCondition = {
            [Op.or]: [
              { user_name: { [Op.like]: `%${searchValue}%` } },
            ],
          };
        }
        if (user.user_type == 1 || user.user_type == 6) {
          let searchResult = await User.findAll({
            attributes: ["id", "user_name"],
            where:{
                    [Op.or]: {
                      user_name: { [Op.like]: `%${searchValue}%` }, 
                    },
                  }    
          });

          console.log(req.body.to, req.body.from)
          const toDate = new Date(req.body.to); // End date
          toDate.setDate(toDate.getDate());
          const { count, rows } = await Attendance.findAndCountAll({
            include: [{
              model: SchoolVisit,
              required: true,
              attributes: ["id", "grievance_id", "school_id", "service_engineer", "arrival", "departure", "status", "visited_date", "date"],
              where: req.body.from && req.body.to ? {
                visited_date : {
                  // [Op.gte]: req.body.from, // Greater than or equal to `from`
                  // [Op.lte]: toDate.toISOString().split('T')[0]
                  [Op.gte]: `${req.body.from} 00:00:00`,
                  [Op.lte]: `${req.body.to} 23:59:59`,
                },
              }:{},
              include: [
                {
                  model: User,
                  required: true,
                  attributes: ["id", "user_name"],
                  where:
                  searchResult != null 
                    ? {
                        ...searchCondition                        
                      }
                    : {}
                },
                {
                  model: School,
                  required: true,
                  attributes: ["id", "name"], 
                },
              ],
              
            },
          ],
            
            where: req.body.status ? {
                  status: req.body.status
                }:{},
            order: [["id", "DESC"]],
            offset: start,
            limit: length,
          });
        
          
  
          let data;
          data = req.body.project == 1 ? rows
            .filter((row: any) => row.dataValues.SchoolVisit?.dataValues.grievance_id === null)
            .map((data: any) => ({
              id: data.id,
              name: data.dataValues.SchoolVisit?.dataValues.User?.dataValues.user_name,
              school_name: data.dataValues.SchoolVisit?.dataValues.School?.dataValues.name,
              grievance: data.dataValues.SchoolVisit?.dataValues.grievance_id,
              check_in: data.dataValues.check_in,
              check_out: data.dataValues.check_out,
              status: data.dataValues.status, 
              lat: data.dataValues.lat,
              long: data.dataValues.long,
              sign: data.dataValues.sign,
              file: data.dataValues.file,
              photo: data.dataValues.photo,
              date: moment(data.dataValues.SchoolVisit?.dataValues.visited_date).format("DD/MM/YYYY"), 
              tag: data.dataValues.SchoolVisit?.dataValues.grievance_id != null ? "Grievnace Visit" : "Regular Visit"
            })) :req.body.project == 2 ?  rows
            .filter((row: any) => row.dataValues.SchoolVisit?.dataValues.grievance_id !== null)
            .map((data: any) => ({
              id: data.id,
              name: data.dataValues.SchoolVisit?.dataValues.User?.dataValues.user_name,
              school_name: data.dataValues.SchoolVisit?.dataValues.School?.dataValues.name,
              grievance: data.dataValues.SchoolVisit?.dataValues.grievance_id,
              check_in: data.dataValues.check_in,
              check_out: data.dataValues.check_out,
              status: data.dataValues.status, 
              lat: data.dataValues.lat,
              long: data.dataValues.long,
              sign: data.dataValues.sign,
              file: data.dataValues.file,
              photo: data.dataValues.photo,
              date: moment(data.dataValues.SchoolVisit?.dataValues.visited_date).format("DD/MM/YYYY"), 
              tag: data.dataValues.SchoolVisit?.dataValues.grievance_id != null ? "Grievnace Visit" : "Regular Visit"
            })):
            rows.map((data: any) => ({
              id: data.id,
              name: data.dataValues.SchoolVisit?.dataValues.User?.dataValues.user_name,
              school_name: data.dataValues.SchoolVisit?.dataValues.School?.dataValues.name,
              grievance: data.dataValues.SchoolVisit?.dataValues.grievance_id,
              check_in: data.dataValues.check_in,
              check_out: data.dataValues.check_out,
              status: data.dataValues.status, 
              lat: data.dataValues.lat,
              long: data.dataValues.long,
              sign: data.dataValues.sign,
              file: data.dataValues.file,
              photo: data.dataValues.photo,
              date: moment(data.dataValues.SchoolVisit?.dataValues.visited_date).format("DD/MM/YYYY"), 
              tag: data.dataValues.SchoolVisit?.dataValues.grievance_id != null ? "Grievnace Visit" : "Regular Visit"
            }));
          
  
          
  
          res.json({
            draw: draw,
            recordsTotal: count,
            recordsFiltered: count,
            data: data,
            searchCondition: searchCondition,
            searchValue: searchValue,
            
          });
        }else {
          res.status(404).send("Assets not found!");
        }
      }
    } catch (error) {
      res.status(500).send("Error while fetching assets" + JSON.stringify(error));
    }
  };

export const getExcelForAttendance: RequestHandler = async (req, res, next) => {
  try {
    let user: any;
    let decodedToken: any;
    if (req.headers.authorization) {
      const jwtString = req.headers.authorization.split(" ")[1];
      decodedToken = jwt.decode(jwtString);
      user = await User.findOne({ where: { id: decodedToken.id } });
    }
 
    const searchValue = (req.body.search as any)?.value || "";
    let searchCondition = {};
    
    if (user && (user.user_type == 1 || user.user_type == 6)) {     

      if (searchValue) {
        searchCondition = {
          [Op.or]: [
            { user_name: { [Op.like]: `%${searchValue}%` } },
          ],
        };
      }
      if (user.user_type == 1 || user.user_type == 6) {
        let searchResult = await User.findAll({
          attributes: ["id", "user_name"],
          where:{
                  [Op.or]: {
                    user_name: { [Op.like]: `%${searchValue}%` }, 
                  },
                }    
        });
        const toDate = new Date(req.body.to); // End date
        toDate.setDate(toDate.getDate() + 1);
        const { count, rows } = await Attendance.findAndCountAll({
          include: [{
            model: SchoolVisit,
            required: true,
            attributes: ["id", "grievance_id", "school_id", "service_engineer", "arrival", "departure", "status", "visited_date", "date"],
            where: req.body.from && req.body.to ? {
              visited_date : {
                [Op.gte]: req.body.from, // Greater than or equal to `from`
                [Op.lte]: toDate.toISOString().split('T')[0]
              },
            }:{},
            include: [
              {
                model: User,
                required: true,
                attributes: ["id", "user_name"],
                where:
                searchResult != null 
                  ? {
                      ...searchCondition                        
                    }
                  : {}
              },
              {
                model: School,
                required: true,
                attributes: ["id", "name", "UDISE_code","district"], 
              },
            ],
            
          },
        ],
          
          where: req.body.status ? {
                status: req.body.status
              }:{},
          order: [["id", "DESC"]],
          // offset: start,
          // limit: length,
        });

        let data;

        data = req.body.project == 1 ? rows
          .filter((row: any) => row.dataValues.SchoolVisit?.dataValues.grievance_id === null)
          .map((attendance: any) => ({
            date: moment(attendance.dataValues.SchoolVisit?.dataValues.visited_date).format("DD/MM/YYYY"), 
            check_in: attendance.check_in,
            check_out: attendance.check_out,
            feedback: attendance.feedback,
            status: attendance.status == 1? 'Working Fine' : attendance.status == 2 ? 'Issue': attendance.status == 3 ? 'Unresolved': attendance.status == 4 ? 'Resolved' : '',
            UDISE_code: attendance?.dataValues.SchoolVisit?.dataValues.School?.dataValues.UDISE_code,
            school_name: attendance?.dataValues.SchoolVisit?.dataValues.School?.dataValues.name,
            service_engineer: attendance?.dataValues.SchoolVisit?.dataValues.User?.dataValues.user_name,
            district: attendance?.dataValues.SchoolVisit?.dataValues.School?.dataValues.district,
            sign: 'https://assamsupportschoolnetindia.com'+attendance.sign,
            file: 'https://assamsupportschoolnetindia.com'+attendance.file,
            photo: 'https://assamsupportschoolnetindia.com'+attendance.photo,
            latitude: attendance.lat,
            longitude: attendance.long
          })) :req.body.project == 2 ?  rows
          .filter((row: any) => row.dataValues.SchoolVisit?.dataValues.grievance_id !== null)
          .map((attendance: any) => ({
            date: moment(attendance.dataValues.SchoolVisit?.dataValues.visited_date).format("DD/MM/YYYY"), 
            check_in: attendance.check_in,
            check_out: attendance.check_out,
            feedback: attendance.feedback,
            status: attendance.status == 1? 'Working Fine' : attendance.status == 2 ? 'Issue': attendance.status == 3 ? 'Unresolved': attendance.status == 4 ? 'Resolved' : '',
            UDISE_code: attendance?.dataValues.SchoolVisit?.dataValues.School?.dataValues.UDISE_code,
            school_name: attendance?.dataValues.SchoolVisit?.dataValues.School?.dataValues.name,
            service_engineer: attendance?.dataValues.SchoolVisit?.dataValues.User?.dataValues.user_name,
            district: attendance?.dataValues.SchoolVisit?.dataValues.School?.dataValues.district,
            sign: 'https://assamsupportschoolnetindia.com'+attendance.sign,
            file: 'https://assamsupportschoolnetindia.com'+attendance.file,
            photo: 'https://assamsupportschoolnetindia.com'+attendance.photo,
            latitude: attendance.lat,
            longitude: attendance.long
          })):
          rows.map((attendance: any) => ({
            date: moment(attendance.dataValues.SchoolVisit?.dataValues.visited_date).format("DD/MM/YYYY"), 
            check_in: attendance.check_in,
        check_out: attendance.check_out,
        feedback: attendance.feedback,
        status: attendance.status == 1? 'Working Fine' : attendance.status == 2 ? 'Issue': attendance.status == 3 ? 'Unresolved': attendance.status == 4 ? 'Resolved' : '',
        UDISE_code: attendance?.dataValues.SchoolVisit?.dataValues.School?.dataValues.UDISE_code,
        school_name: attendance?.dataValues.SchoolVisit?.dataValues.School?.dataValues.name,
        service_engineer: attendance?.dataValues.SchoolVisit?.dataValues.User?.dataValues.user_name,
        district: attendance?.dataValues.SchoolVisit?.dataValues.School?.dataValues.district,
        sign: 'https://assamsupportschoolnetindia.com'+attendance.sign,
        file: 'https://assamsupportschoolnetindia.com'+attendance.file,
        photo: 'https://assamsupportschoolnetindia.com'+attendance.photo,
        latitude: attendance.lat,
        longitude: attendance.long
          }));
        
        
        

        
      // const dataForExcel = req.body.project == 1 ? excelData
      // .filter((row: any) => row.dataValues.SchoolVisit?.dataValues.grievance_id === null).map((attendance: any) => ({
      //   date: moment(attendance?.dataValues.SchoolVisit?.dataValues.visited_date).format('DD/MM/YYYY'),
      //   check_in: attendance.check_in,
      //   check_out: attendance.check_out,
      //   feedback: attendance.feedback,
      //   status: attendance.status == 1? 'Working Fine' : attendance.status == 2 ? 'Issue': attendance.status == 3 ? 'Unresolved': attendance.status == 4 ? 'Resolved' : '',
      //   UDISE_code: attendance?.dataValues.SchoolVisit?.dataValues.School?.dataValues.UDISE_code,
      //   school_name: attendance?.dataValues.SchoolVisit?.dataValues.School?.dataValues.name,
      //   service_engineer: attendance?.dataValues.SchoolVisit?.dataValues.User?.dataValues.user_name,
      //   district: attendance?.dataValues.SchoolVisit?.dataValues.School?.dataValues.district,
      //   sign: 'https://assamsupportschoolnetindia.com'+attendance.sign,
      //   file: 'https://assamsupportschoolnetindia.com'+attendance.file,
      //   photo: 'https://assamsupportschoolnetindia.com'+attendance.photo,
      //   latitude: attendance.lat,
      //   longitude: attendance.long
      // })): {}

      res.json({
        excel: data,
      });
    }
    } else {
      res.status(403).send("Access denied");
    }
  } catch (e: any) {
    res.status(500).send("Error while fetching attendance" + JSON.stringify(e));
  }
};

