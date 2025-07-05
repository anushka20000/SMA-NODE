import { Grievance } from "../models/Grievance";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { Asset } from "../models/Asset";
import { School } from "../models/School";
import { AssetType } from "../models/AssetType";
import { GrievanceTimeline } from "../models/GrievanceTimeline";
import { SchoolVisit } from "../models/SchoolVisit";
import { Issue } from "../models/Issue";
import * as path from "path";
import fs from "fs";
import { Attendance } from "../models/Attendance";
import { Device } from "../models/Device";
import { ConnectionStatus } from "../models/DeviceConnectionStatus";

const moment = require("moment");
const { Op } = require("sequelize");
const axios = require("axios");
require("dotenv").config();
const apiKey = process.env.API_KEY;
const apiUrl =
  "https://api.scalefusion.com/api/v1/devices/connection_status.json?per_page=5000";

interface FileUploadResult {
  photoPath: string | null;
  filePath: string | null;
}

class GrievanceRepository {
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
        const data = await Grievance.findAll();
        return data;
      }
    } catch (e: any) {
      return { error: e };
    }
  }

  async grievanceAssetList(req: any) {
    try {
      let user;
      let decodedToken: any;

      if (req.headers.authorization) {
        const jwtString = req.headers.authorization.split(" ")[1];
        decodedToken = jwt.decode(jwtString);
        user = await User.findOne({ where: { id: decodedToken.id } });
      }

      if (user) {
        let obj = await Asset.findAll({
          where: { school_id: req.params.id },
          attributes: ["id", "model", "serial_no"],
          include: [{ model: AssetType, attributes: ["id", "name"] }],
        });
        const data = obj.map((res: any) => ({
          id: res.dataValues.id,
          name: res.dataValues.AssetType
            ? res.dataValues.AssetType.dataValues.name
            : "asset not found",
          assetTypeId: res.dataValues.AssetType
            ? res.dataValues.AssetType.dataValues.id
            : "asset not found",
          model: res.dataValues.model,
          serial_no: res.dataValues.serial_no,
        }));
        return data;
      }
    } catch (e: any) {
      return { error: e };
    }
  }

  // async grievanceSchoolList(req: any) {
  //   try {
  //     let user;
  //     let decodedToken: any;

  //     if (req.headers.authorization) {
  //       const jwtString = req.headers.authorization.split(" ")[1];
  //       decodedToken = jwt.decode(jwtString);
  //       user = await User.findOne({ where: { id: decodedToken.id } });
  //     }
  //     if (user && user.user_type == 3){
  //       const data = await Grievance.findAll({include: [{model: School, where: {id: user.school_id}, attributes: ['id', 'name', 'project']}]});
  //       return { data };
  //     }else{
  //       const data = await Grievance.findAll({include: [{model: School, attributes: ['id', 'name', 'project']}]});
  //       return { data };
  //     }
  //   } catch (e: any) {
  //     return { error: e };
  //   }
  // }
  async store(req: any) {
    let post: any = JSON.parse(req.body.data);
    let user: any;
    let decodedToken: any;
    if (req.headers.authorization) {
      const jwtString = req.headers.authorization.split(" ")[1];
      decodedToken = jwt.decode(jwtString);
      user = await User.findOne({ where: { id: decodedToken.id } });
    }

    if (user) {
      try {
        if (post.asset_id && post.issue_id) {
          const code = 100;
          const data: any = {
            code: code,
            school_id: post.school_id,
            asset_id: post.asset_id,
            issue_id: post.issue_id,
            // file: path,
            status: post.status,
            service_engineer: post.service_engineer,
            oem_id: post.oem_id,
            support_type: post.support_type,
            description: post.description,
            visit_date: post.visit_date,
            name: post.name,
          };

          if (req.files) {
            console.log(post);
            const result = await GrievanceRepository.handleFileUploads(req);
            console.log("file upload result");
            console.log(result);
            data.file = result.filePath;
          }
          const res = await Grievance.create(data);

          function generateCode() {
            const timestamp = moment().format("YYYYMMDD");
            let count = 100 + Number(res.dataValues.id);
            const code = `GR${timestamp}${count}`;
            return code;
          }

          const generatecode = generateCode();
          const userName = await User.findOne({
            where: { id: user.dataValues.id },
          });
          await Grievance.update(
            { code: generatecode, raised_by: userName?.dataValues.user_name },
            { where: { id: res.dataValues.id } }
          );
          if (post.visit_id) {
            await SchoolVisit.update(
              { grievance_id: res.dataValues.id },
              { where: { id: post.visit_id } }
            );
          }
          const object: any = {
            to: post.status == 2 ? post.oem_id : post.service_engineer,
            by: user.dataValues.id,
            description: post.description,
            grievance_id: res.dataValues.id,
            status: post.status,
          };

          await GrievanceTimeline.create(object);
          return { res };
        } else {
          return { error: "error" };
        }
      } catch (e: any) {
        return { error: e };
      }
    }
  }

  async update(req: any) {
    let user: any;
    let decodedToken: any;
    let post: any = JSON.parse(req.body.data);
    // console.log(post)
    if (req.headers.authorization) {
      const jwtString = req.headers.authorization.split(" ")[1];
      decodedToken = jwt.decode(jwtString);
      user = await User.findOne({ where: { id: decodedToken.id } });
    }
    if (user) {
      try {
        let obj;
        let sampleFile: any;
        let uploadPath: any;
        if (post.objValue.visit_date !== "") {
          if (req.files) {
            const result = await GrievanceRepository.handleFileUploads(req);
            console.log("file upload result");
            console.log(result);
            obj = await Grievance.update(
              {
                visit_date: post.objValue.visit_date,
                description: post.objValue.description,
                file: result.filePath,
                status: post.objValue.status,
                service_engineer: post.objValue.service_engineer,
                oem_id: post.objValue.oem_id,
              },
              { where: { id: post.grievanceID } }
            );
            const schoolId: any = await Grievance.findOne({
              where: { id: post.grievanceID },
            });
            const data: any = {
              grievance_id: post.grievanceID,
              school_id: schoolId.dataValues.school_id,
              service_engineer: post.objValue.service_engineer,
              to: post.objValue.visit_date,
              from: post.objValue.visit_date,
              date: post.objValue.visit_date,
            };
            await SchoolVisit.create(data);
            const object: any = {
              to:
                post.objValue.status == 2
                  ? post.objValue.oem_id
                  : post.objValue.service_engineer,
              by: user.dataValues.id,
              description: post.objValue.description,
              grievance_id: post.grievanceID,
              status: post.objValue.status,
            };

            await GrievanceTimeline.create(object);
          } else {
            obj = await Grievance.update(
              {
                visit_date: post.objValue.visit_date,
                description: post.objValue.description,
                file: post.objValue.file,
                status: post.objValue.status,
                service_engineer: post.objValue.service_engineer,
                oem_id: post.objValue.oem_id,
              },
              { where: { id: post.grievanceID } }
            );
            const schoolId: any = await Grievance.findOne({
              where: { id: post.grievanceID },
            });
            const data: any = {
              grievance_id: post.grievanceID,
              school_id: schoolId.dataValues.school_id,
              service_engineer: post.objValue.service_engineer,
              to: post.objValue.visit_date,
              from: post.objValue.visit_date,
              date: post.objValue.visit_date,
            };
            await SchoolVisit.create(data);
            const object: any = {
              to:
                post.objValue.status == 2
                  ? post.objValue.oem_id
                  : post.objValue.service_engineer,
              by: user.dataValues.id,
              description: post.objValue.description,
              grievance_id: post.grievanceID,
              status: post.objValue.status,
            };

            await GrievanceTimeline.create(object);
          }
        }
        // else {
        //     // console.log(post,req.files)

        //     if (req.files) {
        //         console.log(req.files.file)
        //         sampleFile = req.files.file;
        //         uploadPath = process.env.UPLOAD_BASE;
        //         let file_name = new Date().getTime() + '_' + sampleFile.name;
        //         uploadPath = path.join(uploadPath, file_name);
        //         let filePath = `/uploads/${file_name}`;

        //         sampleFile.mv(uploadPath, async function (err: any) {
        //             obj = await Grievance.update(
        //                 {
        //                     description: post.objValue.description,
        //                     file: filePath,
        //                     status: post.objValue.status,
        //                     service_engineer: post.objValue.service_engineer,
        //                     oem_id: post.objValue.oem_id,
        //                 },
        //                 {where: {id: post.grievanceID}}
        //             );
        //             const object: any = {
        //                 to:
        //                     post.objValue.status == 2
        //                         ? post.objValue.oem_id
        //                         : post.objValue.service_engineer,
        //                 by: user.dataValues.id,
        //                 description: post.objValue.description,
        //                 grievance_id: post.grievanceID,
        //                 status: post.objValue.status,
        //             };
        //             await GrievanceTimeline.create(object);
        //         })
        //     } else {
        //         obj = await Grievance.update(
        //             {
        //                 description: post.objValue.description,
        //                 file: post.objValue.file,
        //                 status: post.objValue.status,
        //                 service_engineer: post.objValue.service_engineer,
        //                 oem_id: post.objValue.oem_id,
        //             },
        //             {where: {id: post.grievanceID}}
        //         );
        //     }
        //     // console.log("obj", obj);
        //     const object: any = {
        //         to:
        //             post.objValue.status == 2
        //                 ? post.objValue.oem_id
        //                 : post.objValue.service_engineer,
        //         by: user.dataValues.id,
        //         description: post.objValue.description,
        //         grievance_id: post.grievanceID,
        //         status: post.objValue.status,
        //     };
        //     // console.log(object)
        //     await GrievanceTimeline.create(object);
        // }
      } catch (e: any) {
        return { error: e };
      }
    }
  }

  async updateGrievance(req: any) {
    let user: any;
    let decodedToken: any;
    let post: any = req.body.data;
    post = JSON.parse(post);

    console.log("updating grievance");
    console.log(post);

    if (req.headers.authorization) {
      const jwtString = req.headers.authorization.split(" ")[1];
      decodedToken = jwt.decode(jwtString);
      user = await User.findOne({ where: { id: decodedToken.id } });
    }
    if (user) {
      try {
        let result = null;
        if (req.files) {
          console.log(post);
          result = await GrievanceRepository.handleFileUploads(req);
          console.log("file upload result");
          console.log(result);
        }

        let updateParams: any = {
          visit_date: post.visit_date,
          description: post.description,
          status: post.status,
          service_engineer: post.service_engineer,
          oem_id: post.oem_id,
        };

        // Conditionally add the file field to updateParams only if result is not null
        if (result !== null) {
          updateParams.file =
            result.filePath !== null ? result.filePath : result.photoPath;
        }

        let obj = await Grievance.update(updateParams, {
          where: { id: post.grievanceID },
        });

        const object: any = {
          to: post.status == 2 ? post.oem_id : post.service_engineer,
          by: user.dataValues.id,
          description: post.description,
          grievance_id: post.grievanceID,
          status: post.status,
        };
        // console.log(object)
        await GrievanceTimeline.create(object);
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
        const obj: any = await Grievance.findOne({
          where: { id: req.params.id },
          include: [
            { model: School, attributes: ["id", "name"] },
            {
              model: User,
              attributes: ["id", "user_name"],
              as: "service_engineer_data",
            },
            { model: User, attributes: ["id", "user_name"], as: "oemID" },
            {
              model: GrievanceTimeline,
              include: [
                {
                  model: User,
                  attributes: ["id", "user_name", "user_type"],
                  as: "toUser",
                },
                {
                  model: User,
                  attributes: ["id", "user_name", "user_type"],
                  as: "byUser",
                },
              ],
            },
            {
              model: Asset,
              attributes: ["id", "model", "serial_no"],
              include: [
                {
                  model: AssetType,
                  attributes: ["id", "name"],
                },
              ],
            },
            {
              model: Issue,
              attributes: ["id", "description"],
            },
          ],
        });
        // console.log(obj.dataValues.Asset.dataValues.AssetType)
        let formattedDate;

        function formatTime(inputDate: any) {
          // Parse the input date string
          const dateObject = new Date(inputDate);

          // Format the time string in IST (Indian Standard Time)
          const formattedTime = dateObject.toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });

          return formattedTime;
        }

        if (obj.dataValues.createdAt != null) {
          const date = new Date(obj.dataValues.createdAt);

          // Get the individual components of the date (day, month, year)
          const day = date.getDate().toString().padStart(2, "0");
          const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Month is zero-based, so add 1
          const year = date.getFullYear();

          // Create a formatted date string
          formattedDate = `${day}/${month}/${year}`;
        }

        let grienvanceTimelineArray;
        if (obj.dataValues.GrievanceTimelines !== null) {
          grienvanceTimelineArray = obj.dataValues.GrievanceTimelines.map(
            (data: any) => ({
              to: data.toUser?.dataValues.user_name,
              designation:
                data.toUser?.dataValues.user_type == 4
                  ? "Service Engineer"
                  : data.toUser?.dataValues.user_type == 2
                  ? "OEM"
                  : "",
              by: data.byUser?.dataValues.user_name,
              grievance_id: data.grievance_id,
              updated_status:
                data.status == 0
                  ? "Unassigned"
                  : data.status == 1
                  ? "Assigned"
                  : data.status == 2
                  ? "Assigned OEM"
                  : data.status == 3
                  ? "Completed OEM"
                  : data.status == 4
                  ? "Unresolved"
                  : data.status == 6
                  ? "Resolved SE"
                  : data.status == 7
                  ? "Stolen"
                  : "Completed",
              description: data.description,
              byUserType: data.byUser?.dataValues.user_type,
              createdAt:
                new Date(data.createdAt).getDate().toString().padStart(2, "0") +
                "/" +
                (new Date(data.createdAt).getMonth() + 1)
                  .toString()
                  .padStart(2, "0") +
                "/" +
                new Date(data.createdAt).getFullYear() +
                " " +
                formatTime(data.createdAt),
              time: formatTime(data.createdAt),
            })
          );
        }
        const data = {
          // obj: obj,
          school_name: obj.dataValues.School.dataValues.name,
          code: obj.dataValues.code,
          createdAt: formattedDate,
          description: obj.dataValues.description,
          file: obj.dataValues.file,
          visit_date: obj.dataValues.visit_date,
          support_type: obj.dataValues.support_type,
          project: obj.dataValues.School.dataValues.project,
          status: obj.dataValues.status,
          service_engineer:
            obj.dataValues.service_engineer_data &&
            obj.dataValues.service_engineer_data.dataValues.id,
          engineer_name:
            obj.dataValues.service_engineer_data?.dataValues.user_name,
          oem: obj.dataValues.oemID && obj.dataValues.oemID.dataValues.id,
          oem_name: obj.dataValues.oemID?.dataValues.user_name,
          grievanceTimeline: grienvanceTimelineArray,
          raised_by: obj.dataValues.raised_by,
          asset_model: obj.dataValues.Asset?.dataValues.model,
          serial_no: obj.dataValues.Asset?.dataValues.serial_no,

          asset_name:
            obj.dataValues.Asset?.dataValues.AssetType?.dataValues.name,
          issue: obj.dataValues.Issue?.dataValues.description,
        };

        return data;
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
      const val = await Grievance.findOne({ where: { id: req.params.id } });
      if (!val) {
        throw new Error("id not found");
      } else {
        try {
          const res = await Grievance.destroy({ where: { id: req.params.id } });
          return { res };
        } catch (e: any) {
          return { error: e };
        }
      }
    }
  }

  async dashboard(req: any) {
    try {
      let user;
      let decodedToken: any;
      const startOfDay = moment().startOf("day").toDate();
      const endOfDay = moment().endOf("day").toDate();
      if (req.headers.authorization) {
        const jwtString = req.headers.authorization.split(" ")[1];
        decodedToken = jwt.decode(jwtString);
        user = await User.findOne({ where: { id: decodedToken.id } });
      }
      if (user) {
        if (user.dataValues.user_type == 1 || user.dataValues.user_type == 5) {
          const { count, rows } = await Grievance.findAndCountAll({
            attributes: ["id", "status"],
          });

          const ifpGrievance: any = await Grievance.findAll({
            attributes: ["id", "status"],

            include: [{ model: Asset, where: { project: 1 } }],
          });
          // console.log(ifpGrievance)
          const kyanGrievance: any = await Grievance.findAll({
            attributes: ["id", "status"],
            include: [{ model: Asset, where: { project: 2 } }],
          });
          const ifpcountCompleted = await Grievance.findAll({
            where: { status: 5, deletedAt: { [Op.eq]: null } },
            include: [{ model: Asset, where: { project: 1 } }],
          });
          const kyancountCompleted = await Grievance.findAll({
            where: { status: 5, deletedAt: { [Op.eq]: null } },
            include: [{ model: Asset, where: { project: 2 } }],
          });
          const ifpCountPending = await Grievance.findAll({
            where: { status: 0, deletedAt: { [Op.eq]: null } },
            include: [{ model: Asset, where: { project: 1 } }],
          });
          const kyanCountPending = await Grievance.findAll({
            where: { status: 0, deletedAt: { [Op.eq]: null } },
            include: [{ model: Asset, where: { project: 2 } }],
          });
          const serviceEngineerIFPCount = await User.count({
            where: { user_type: 4, deletedAt: { [Op.eq]: null }, project: 1 },
          });
          const serviceEngineerKYANCount = await User.count({
            where: { user_type: 4, deletedAt: { [Op.eq]: null }, project: 2 },
          });
          const OemCount = await User.count({
            where: { user_type: 2, deletedAt: { [Op.eq]: null } },
          });

          const countAttendancePerDay = await Attendance.count({
            where: {
              check_in: { [Op.ne]: null },
              check_out: { [Op.ne]: null },
              createdAt: { [Op.between]: [startOfDay, endOfDay] },
            },
          });

          const serviceEngineerVisit: any = await SchoolVisit.count({
            where: {
              date: { [Op.eq]: moment().format("YYYY-MM-DD") },
              deletedAt: { [Op.eq]: null },
              service_engineer: decodedToken.id,
            },
          });
          const totalVisit: any = await SchoolVisit.count({
            where: {
              date: { [Op.eq]: moment().format("YYYY-MM-DD") },
              deletedAt: { [Op.eq]: null },
              // service_engineer: decodedToken.id
            },
          });

          const countSchool: any = await School.count();
          const countSchoolForservice: any = await School.count({
            where: { service_engineer: decodedToken.id },
          });

          // const bothSchool:any  = await School.findAll({where: {ifp: 1, kyan: 1}})
          const ifpSchool: any = await School.findAll({ where: { ifp: 1 } });
          const kyanSchool: any = await School.findAll({ where: { kyan: 1 } });
          // console.log(ifpGrievance.length)
          const countAsset = await Asset.count();
          const allocatedAssets = await Asset.findAll({
            where: { school_id: { [Op.ne]: null }, project: 1 },
          });
          const kyanallocatedAssets = await Asset.findAll({
            where: { school_id: { [Op.ne]: null }, project: 2 },
          });

          const data: any = {
            count: count,
            ifpcompleted: ifpcountCompleted.length,
            kyancompleted: kyancountCompleted.length,
            ifppending: ifpCountPending.length,
            kyanpending: kyanCountPending.length,
            ifpprogress:
              ifpGrievance.length -
              (ifpcountCompleted.length + ifpCountPending.length),
            kyanprogress:
              kyanGrievance.length -
              (kyancountCompleted.length + kyanCountPending.length),
            asset: countAsset,
            school: countSchool,
            visit: totalVisit,
            serviceEngineerIfp: serviceEngineerIFPCount,
            serviceEngineerKyan: serviceEngineerKYANCount,
            oem: OemCount,
            ifpGrievance: ifpGrievance.length,
            kyanGrievance: kyanGrievance.length,
            ifpSchool: ifpSchool.length,
            kyanSchool: kyanSchool.length,
            allocatedAssets: allocatedAssets.length,
            kyanallocatedAssets: kyanallocatedAssets.length,
            serviceVisit: serviceEngineerVisit.length,
            countAttendance: countAttendancePerDay,
          };
          return data;
        } else if (user.dataValues.user_type == 6) {
          const countAttendancePerDay = await Attendance.count({
            where: {
              check_in: { [Op.ne]: null },
              check_out: { [Op.ne]: null },
              createdAt: { [Op.between]: [startOfDay, endOfDay] },
            },
          });
          const countSchool: any = await School.count();
          const ifpSchool: any = await School.findAll({ where: { ifp: 1 } });
          const countAsset = await Asset.count();
          const allocatedAssets = await Asset.findAll({
            where: { school_id: { [Op.ne]: null }, project: 1 },
          });
          const serviceEngineerIFPCount = await User.count({
            where: { user_type: 4, deletedAt: { [Op.eq]: null }, project: 1 },
          });
          const data: any = {
            asset: countAsset,
            school: countSchool,
            ifpSchool: ifpSchool.length,
            allocatedAssets: allocatedAssets.length,
            countAttendance: countAttendancePerDay,
            serviceEngineerIfp: serviceEngineerIFPCount,
          };
          return data;
        } else if (user.dataValues.user_type == 4) {
          const { count, rows } = await Grievance.findAndCountAll({
            attributes: ["id", "status"],
            where: {
              service_engineer: decodedToken.id,
              deletedAt: { [Op.eq]: null },
            },
          });
          const currentDate = moment();
          let countCompleted: any;
          let monthlyTotalGrievance: any;
          let resultsByMonth: any = [];
          let totalresultsByMonth: any = [];
          let resultsByMonthVisit: any = [];
          let totalresultsByMonthVisit: any = [];

          for (let i = 0; i < 6; i++) {
            // Calculate the start and end dates for the current month
            const startDate = currentDate
              .clone()
              .subtract(i, "months")
              .startOf("month")
              .toDate();
            const endDate = currentDate
              .clone()
              .subtract(i, "months")
              .endOf("month")
              .toDate();

            countCompleted = await Grievance.findAndCountAll({
              attributes: ["id", "status"],
              where: {
                status: 5,
                service_engineer: decodedToken.id,
                deletedAt: { [Op.eq]: null },
                updatedAt: {
                  [Op.between]: [startDate, endDate],
                },
                createdAt: {
                  [Op.between]: [startDate, endDate],
                }, //might remove
              },
            })
              .then((records) => {
                // Store the records for the current month in the results array
                resultsByMonth.push({
                  month: startDate.getMonth() + 1,
                  year: startDate.getFullYear(),
                  records,
                });

                // If this is the last iteration, process the results or return them as needed
                if (i === 5) {
                  // console.log(
                  //   "Results for the past six months:",
                  //   resultsByMonth
                  // );
                  // Further processing or returning results
                }
              })
              .catch((error) => {
                console.error("Error:", error);
              });
          }
          for (let i = 0; i < 6; i++) {
            // Calculate the start and end dates for the current month
            const startDate = currentDate
              .clone()
              .subtract(i, "months")
              .startOf("month")
              .toDate();
            const endDate = currentDate
              .clone()
              .subtract(i, "months")
              .endOf("month")
              .toDate();
            monthlyTotalGrievance = await Grievance.findAndCountAll({
              attributes: ["id", "status"],
              where: {
                service_engineer: decodedToken.id,
                deletedAt: { [Op.eq]: null },
                createdAt: {
                  [Op.between]: [startDate, endDate],
                },
              },
            })
              .then((records) => {
                // Store the records for the current month in the results array
                totalresultsByMonth.push({
                  month: startDate.getMonth() + 1,
                  year: startDate.getFullYear(),
                  records,
                });

                // If this is the last iteration, process the results or return them as needed
                if (i === 5) {
                  // console.log(
                  //   "Results for the past six months:",
                  //   totalresultsByMonth
                  // );
                  // Further processing or returning results
                }
              })
              .catch((error) => {
                console.error("Error:", error);
              });
          }
          for (let i = 0; i < 6; i++) {
            // Calculate the start and end dates for the current month
            const startDate = currentDate
              .clone()
              .subtract(i, "months")
              .startOf("month")
              .toDate();
            const endDate = currentDate
              .clone()
              .subtract(i, "months")
              .endOf("month")
              .toDate();

            await SchoolVisit.findAndCountAll({
              attributes: ["id", "status"],
              where: {
                deletedAt: { [Op.eq]: null },
                service_engineer: decodedToken.id,
                [Op.and]: {
                  date: {
                    [Op.and]: {
                      [Op.between]: [startDate, endDate],
                      [Op.lt]: moment().format("YYYY-MM-DD"),
                    },
                  },
                  // createdAt: {
                  //   [Op.between]: [startDate, endDate],
                  // },//might remove
                  arrival: { [Op.eq]: null },
                  departure: { [Op.eq]: null },
                },
              },
            })
              .then((records) => {
                // Store the records for the current month in the results array
                resultsByMonthVisit.push({
                  month: startDate.getMonth() + 1,
                  year: startDate.getFullYear(),
                  records,
                });

                // If this is the last iteration, process the results or return them as needed
                if (i === 5) {
                  // console.log(
                  //   "Results for the past six months:",
                  //   resultsByMonthVisit
                  // );
                  // Further processing or returning results
                }
              })
              .catch((error) => {
                console.error("Error:", error);
              });
          }
          for (let i = 0; i < 6; i++) {
            const startDate = currentDate
              .clone()
              .subtract(i, "months")
              .startOf("month")
              .toDate();
            const endDate = currentDate
              .clone()
              .subtract(i, "months")
              .endOf("month")
              .toDate();
            await SchoolVisit.findAndCountAll({
              attributes: ["id", "status"],
              where: {
                deletedAt: { [Op.eq]: null },
                service_engineer: decodedToken.id,
                date: {
                  [Op.between]: [startDate, endDate],
                },
              },
            })
              .then((records) => {
                totalresultsByMonthVisit.push({
                  month: startDate.getMonth() + 1,
                  year: startDate.getFullYear(),
                  records,
                });

                if (i === 5) {
                  // console.log(
                  //   "Results for the past six months:",
                  //   totalresultsByMonthVisit
                  // );
                }
              })
              .catch((error) => {
                console.error("Error:", error);
              });
          }

          const totalVisits = await SchoolVisit.count({
            where: {
              deletedAt: { [Op.eq]: null },
              service_engineer: decodedToken.id,
            },
          });
          const countSchool = await School.count({
            where: { service_engineer: user.dataValues.id },
          });

          // const engineerSchool = await User.findOne({
          //     where: {id: user.dataValues.id},
          //     include: {model: School}
          // });

          let grievanceMonth: any = [];
          resultsByMonth.map((res: any) =>
            grievanceMonth.push(
              res.month === 1
                ? "Jan"
                : res.month === 2
                ? "Feb"
                : res.month === 3
                ? "Mar"
                : res.month === 4
                ? "Apr"
                : res.month === 5
                ? "May"
                : res.month === 6
                ? "Jun"
                : res.month === 7
                ? "Jul"
                : res.month === 8
                ? "Aug"
                : res.month === 9
                ? "Sep"
                : res.month === 10
                ? "Oct"
                : res.month === 11
                ? "Nov"
                : res.month === 12
                ? "Dec"
                : "Invalid"
            )
          );
          let resolvedGrievance: any = [];
          resultsByMonth.map((res: any) =>
            resolvedGrievance.push(res.records.count)
          );
          let totalGrievance: any = [];
          totalresultsByMonth.map((res: any) =>
            totalGrievance.push(res.records.count)
          );
          let totalAbsent: any = [];
          resultsByMonthVisit.map((res: any) =>
            totalAbsent.push(res.records.count)
          );
          let totalVisit: any = [];
          totalresultsByMonthVisit.map((res: any) =>
            totalVisit.push(res.records.count)
          );
          const data: any = {
            count: count,
            school:
              user.dataValues.school_id == null ? countSchool : countSchool + 1,
            visit: totalVisits,
            completed: resultsByMonth,
            monthlyTotalGrievance: totalresultsByMonth,
            monthlyAbsent: resultsByMonthVisit,
            monthlySchoolVisit: totalresultsByMonthVisit,
            grievanceMonth: grievanceMonth,
            resolvedGrievance: resolvedGrievance,
            totalGrievance: totalGrievance,
            totalAbsent: totalAbsent,
            totalVisit: totalVisit,
          };
          return data;
        } else if (user.dataValues.user_type == 2) {
          const { count, rows } = await Grievance.findAndCountAll({
            attributes: ["id", "status"],
            where: { oem_id: user.dataValues.id, deletedAt: { [Op.eq]: null } },
          });
          const countCompleted = await Grievance.findAndCountAll({
            attributes: ["id", "status"],
            where: {
              status: 5,
              oem_id: user.dataValues.id,
              deletedAt: { [Op.eq]: null },
            },
          });
          const countPending = await Grievance.findAndCountAll({
            attributes: ["id", "status"],
            where: {
              status: 1,
              oem_id: user.dataValues.id,
              deletedAt: { [Op.eq]: null },
            },
          });

          const data: any = {
            count: count,
            completed: countCompleted?.count,
            pending: countPending?.count,
            progress: count - (countCompleted?.count + countPending?.count),
          };

          return data;
        } else if (user.dataValues.user_type == 3) {
          const currentDate = moment();
          let countCompleted: any;
          let monthlyTotalGrievance: any;
          let resultsByMonth: any = [];
          let totalresultsByMonth: any = [];
          let resultsByMonthVisit: any = [];
          let totalresultsByMonthVisit: any = [];

          for (let i = 0; i < 6; i++) {
            // Calculate the start and end dates for the current month
            const startDate = currentDate
              .clone()
              .subtract(i, "months")
              .startOf("month")
              .toDate();
            const endDate = currentDate
              .clone()
              .subtract(i, "months")
              .endOf("month")
              .toDate();

            countCompleted = await Grievance.findAndCountAll({
              attributes: ["id", "status"],
              where: {
                status: 5,
                school_id: user.dataValues.school_id,
                deletedAt: { [Op.eq]: null },
                updatedAt: {
                  [Op.between]: [startDate, endDate],
                },
                createdAt: {
                  [Op.between]: [startDate, endDate],
                }, //might remove
              },
            })
              .then((records) => {
                // Store the records for the current month in the results array
                resultsByMonth.push({
                  month: startDate.getMonth() + 1,
                  year: startDate.getFullYear(),
                  records,
                });

                // If this is the last iteration, process the results or return them as needed
                if (i === 5) {
                  // console.log(
                  //   "Results for the past six months:",
                  //   resultsByMonth
                  // );
                  // Further processing or returning results
                }
              })
              .catch((error) => {
                console.error("Error:", error);
              });
          }
          for (let i = 0; i < 6; i++) {
            // Calculate the start and end dates for the current month
            const startDate = currentDate
              .clone()
              .subtract(i, "months")
              .startOf("month")
              .toDate();
            const endDate = currentDate
              .clone()
              .subtract(i, "months")
              .endOf("month")
              .toDate();
            monthlyTotalGrievance = await Grievance.findAndCountAll({
              attributes: ["id", "status"],
              where: {
                school_id: user.dataValues.school_id,
                deletedAt: { [Op.eq]: null },
                createdAt: {
                  [Op.between]: [startDate, endDate],
                },
              },
            })
              .then((records) => {
                // Store the records for the current month in the results array
                totalresultsByMonth.push({
                  month: startDate.getMonth() + 1,
                  year: startDate.getFullYear(),
                  records,
                });

                // If this is the last iteration, process the results or return them as needed
                if (i === 5) {
                  // console.log(
                  //   "Results for the past six months:",
                  //   totalresultsByMonth
                  // );
                  // Further processing or returning results
                }
              })
              .catch((error) => {
                console.error("Error:", error);
              });
          }
          for (let i = 0; i < 6; i++) {
            // Calculate the start and end dates for the current month
            const startDate = currentDate
              .clone()
              .subtract(i, "months")
              .startOf("month")
              .toDate();
            const endDate = currentDate
              .clone()
              .subtract(i, "months")
              .endOf("month")
              .toDate();

            await SchoolVisit.findAndCountAll({
              attributes: ["id", "status"],
              where: {
                deletedAt: { [Op.eq]: null },
                school_id: user.dataValues.school_id,
                [Op.and]: {
                  date: {
                    [Op.and]: {
                      [Op.between]: [startDate, endDate],
                      [Op.lt]: moment().format("YYYY-MM-DD"),
                    },
                  },
                  // createdAt: {
                  //   [Op.between]: [startDate, endDate],
                  // },//might remove
                  arrival: { [Op.eq]: null },
                  departure: { [Op.eq]: null },
                },
              },
            })
              .then((records) => {
                // Store the records for the current month in the results array
                resultsByMonthVisit.push({
                  month: startDate.getMonth() + 1,
                  year: startDate.getFullYear(),
                  records,
                });

                // If this is the last iteration, process the results or return them as needed
                if (i === 5) {
                  console.log(
                    "Results for the past six months:",
                    resultsByMonthVisit
                  );
                  // Further processing or returning results
                }
              })
              .catch((error) => {
                console.error("Error:", error);
              });
          }
          for (let i = 0; i < 6; i++) {
            const startDate = currentDate
              .clone()
              .subtract(i, "months")
              .startOf("month")
              .toDate();
            const endDate = currentDate
              .clone()
              .subtract(i, "months")
              .endOf("month")
              .toDate();
            await SchoolVisit.findAndCountAll({
              attributes: ["id", "status"],
              where: {
                deletedAt: { [Op.eq]: null },
                school_id: user.dataValues.school_id,
                date: {
                  [Op.between]: [startDate, endDate],
                },
              },
            })
              .then((records) => {
                totalresultsByMonthVisit.push({
                  month: startDate.getMonth() + 1,
                  year: startDate.getFullYear(),
                  records,
                });

                if (i === 5) {
                  console.log(
                    "Results for the past six months:",
                    totalresultsByMonthVisit
                  );
                }
              })
              .catch((error) => {
                console.error("Error:", error);
              });
          }
          const { count, rows } = await Grievance.findAndCountAll({
            attributes: ["id", "status"],
            where: {
              school_id: user.dataValues.school_id,
              deletedAt: { [Op.eq]: null },
            },
          });

          const completed = await Grievance.findAll({
            attributes: ["id", "status"],
            where: {
              status: 5,
              school_id: user.dataValues.school_id,
              deletedAt: { [Op.eq]: null },
            },
          });
          const countPending = await Grievance.findAll({
            attributes: ["id", "status"],
            where: {
              status: { [Op.ne]: 5 },
              school_id: user?.dataValues.school_id,
              deletedAt: { [Op.eq]: null },
            },
          });
          const faulty = await Grievance.findAndCountAll({
            attributes: ["id", "status"],
            where: {
              status: 2,
              school_id: user?.dataValues.school_id,
              deletedAt: { [Op.eq]: null },
            },
          });

          const countAsset = await Asset.findAndCountAll({
            attributes: ["id"],
            where: {
              school_id: user.dataValues.school_id,
              deletedAt: { [Op.eq]: null },
            },
          });
          const countRecentAsset = await Asset.findAll({
            attributes: ["id", "createdAt", "school_id"],
            where: {
              school_id: user.dataValues.school_id,
              deletedAt: { [Op.eq]: null },
            },
          });
          let currentDates;
          let counter: any = 0;
          countRecentAsset.map(async (item: any) => {
            currentDates = moment(item.createdAt).format("DD/MM/YYYY");
            if (currentDates == moment().format("DD/MM/YYYY")) {
              counter++;
            }
          });
          let grievanceMonth: any = [];
          resultsByMonth.map((res: any) =>
            grievanceMonth.push(
              res.month === 1
                ? "Jan"
                : res.month === 2
                ? "Feb"
                : res.month === 3
                ? "Mar"
                : res.month === 4
                ? "Apr"
                : res.month === 5
                ? "May"
                : res.month === 6
                ? "Jun"
                : res.month === 7
                ? "Jul"
                : res.month === 8
                ? "Aug"
                : res.month === 9
                ? "Sep"
                : res.month === 10
                ? "Oct"
                : res.month === 11
                ? "Nov"
                : res.month === 12
                ? "Dec"
                : "Invalid"
            )
          );
          let resolvedGrievance: any = [];
          resultsByMonth.map((res: any) =>
            resolvedGrievance.push(res.records.count)
          );
          let totalGrievance: any = [];
          totalresultsByMonth.map((res: any) =>
            totalGrievance.push(res.records.count)
          );
          let totalAbsent: any = [];
          resultsByMonthVisit.map((res: any) =>
            totalAbsent.push(res.records.count)
          );
          let totalVisit: any = [];
          totalresultsByMonthVisit.map((res: any) =>
            totalVisit.push(res.records.count)
          );
          const data: any = {
            count: count && count,
            pending: countPending?.length,
            complete: completed?.length,
            faulty: faulty?.count,
            asset: countAsset?.count,
            recentAsset: counter,
            completed: resultsByMonth,
            monthlyTotalGrievance: totalresultsByMonth,
            monthlyAbsent: resultsByMonthVisit,
            monthlySchoolVisit: totalresultsByMonthVisit,
            grievanceMonth: grievanceMonth,
            resolvedGrievance: resolvedGrievance,
            totalGrievance: totalGrievance,
            totalAbsent: totalAbsent,
            totalVisit: totalVisit,
          };

          return data;
        }
      }
    } catch (e: any) {
      return { error: JSON.stringify(e) };
    }
  }
  async districtSegregatedDashboardInfo(req: any) {
    try {
      let user;
      let decodedToken: any;
      if (req.headers.authorization) {
        const jwtString = req.headers.authorization.split(" ")[1];
        decodedToken = jwt.decode(jwtString);
        user = await User.findOne({ where: { id: decodedToken.id } });
      }
      if (user.dataValues.user_type == 6) {
        let connected = 0;
        let disconnected = 0;
        let active = 0;
        let inactive = 0;
        let districtCounts = [];
        const totaldevices = await Device.findAll({
         
        });
        const devices = await Device.findAll({
          include: { model: ConnectionStatus },
           
        });

        // Step 3: Create a lookup for serial_no → district
        const assetLookup = {};
        devices.forEach((device: any) => {
          const district = device?.district;
          if (district) {
            assetLookup[device.id] = district;
          }
        });

        // Step 4: Process devices and calculate counts
            devices?.forEach((device: any) => {
                const connectionState = device?.connection_status;
                  if (connectionState === 1) {
                      active += 1;
                    } else if (connectionState === 0) {
                        inactive += 1;
                    }
            const districtName = assetLookup[device.id];
    
          const statusMap = new Map<number, boolean>();
          // console.log(device.createdAt)
          device?.ConnectionStatuses?.forEach((status: any) => {
          if(moment(status.createdAt).format('YYYY-MM-DD') == moment(new Date()).format('YYYY-MM-DD')){
      const statusId = status.device_id;
    
        if (status.availability_status === 1 && status?.duration_in_seconds > 0 ) {
          if (statusMap.has(statusId) && statusMap.get(statusId) === false) {
            statusMap.delete(statusId);
            statusMap.set(statusId, true);
          }
           else if (!statusMap.has(statusId)) {
            statusMap.set(statusId, true);
          }
        } 
        else if (!statusMap.has(statusId) || statusMap.get(statusId) == true)  {
          statusMap.set(statusId, false);
        }
      }
    });



          const normalizedDistrictName = districtName.trim().toLowerCase();

          // Update district-level counts
          if (normalizedDistrictName) {
            let districtEntry = districtCounts.find(
              (d) => d.district.toLowerCase() === normalizedDistrictName
            );

            if (!districtEntry) {
              districtEntry = {
                district: districtName.trim(),
                connected: 0,
                disconnected: 0,
              };
              districtCounts.push(districtEntry);
            }
            statusMap.forEach((isConnected) => {
                if (isConnected) {
                    districtEntry.connected += 1;
                    connected += 1
                }
            });
            if (connectionState === 0) {
                districtEntry.disconnected += 1;
            }
          }
        });

        const data: any = {
          totalDevices: totaldevices?.length,
          active: active,
          inactive: inactive,
          districtCounts: districtCounts,
          connected: connected,
          disconnected: (totaldevices?.length - connected),
        };
        return data;
      }
    } catch (e: any) {
      return { error: JSON.stringify(e) };
    }
  }

  static async handleFileUploads(req: any): Promise<FileUploadResult> {
    const file = req.files?.file;
    const photo = req.files?.photo;

    console.log("upload base is:" + process.env.UPLOAD_BASE);

    let attachFileName = null;
    let photoFileName = null;

    // Define the upload directory

    const uploadPath = process.env.UPLOAD_BASE;
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    if (file) {
      const uniqueSuffix =
        file.name.replace(" ", "_") +
        Date.now() +
        "-" +
        Math.round(Math.random() * 1e9);
      attachFileName = uniqueSuffix + path.extname(file.name);
      console.log(
        "file found, moving to:" + path.join(uploadPath, attachFileName)
      );
      await file.mv(path.join(uploadPath, attachFileName));
    }

    if (photo) {
      const uniqueSuffix =
        "photo_" + Date.now() + "-" + Math.round(Math.random() * 1e9);
      photoFileName = uniqueSuffix + path.extname(photo.name);
      await photo.mv(path.join(uploadPath, photoFileName));
    }
    const filePath = file ? `/uploads/${attachFileName}` : null;
    const photoPath = photo ? `/uploads/${photoFileName}` : null;

    return { photoPath, filePath };
  }
}

export { GrievanceRepository };
