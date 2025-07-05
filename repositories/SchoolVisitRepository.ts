import moment from "moment";
import { School, SchoolMembers } from "../models/School";
import { SchoolVisit, SchoolVisitMembers } from "../models/SchoolVisit";
import { User, UserMember } from "../models/User";
import jwt from "jsonwebtoken";
import { Asset, AssetMembers } from "../models/Asset";
import { AssetType } from "../models/AssetType";
import { Attendance } from "../models/Attendance";
import { Grievance } from "../models/Grievance";
const { Op } = require("sequelize");
const bcrypt = require("bcrypt");
const parse = require("csv-parser");
const xlsx = require("xlsx");
const fs = require("fs");
import { literal } from "sequelize";
import { AssetCategory } from "../models/AssetCategory";
class SchoolVisitRepository {
  //GET
  async list(req: any) {
    try {
      let user;
      let decodedToken: any;
      // console.log(req)
      if (req.headers.authorization) {
        const jwtString = req.headers.authorization.split(" ")[1];
        decodedToken = jwt.decode(jwtString);
        user = await User.findOne({ where: { id: decodedToken.id } });
      }
      console.log(user);
      if (user) {
        if (user.dataValues.user_type == 3) {
          const data = await School.findAll({
            where: { id: user.dataValues.school_id, name: { [Op.ne]: "" } },
            attributes: ["id", "name"],
            order: [["name", "ASC"]],
          });
          console.log(data);
          return data;
        } else {
          const data = await School.findAll({
            where: { name: { [Op.ne]: "" } },
            attributes: ["id", "name"],
            order: [["name", "ASC"]],
          });
          return data;
        }
      }
    } catch (e: any) {
      return { error: e };
    }
  }
  async appDashboard(req: any) {
    try {
      let user;
      let decodedToken: any;
      const currentDate: any = moment().format("YYYY-MM-DD");
      // console.log(req)
      if (req.headers.authorization) {
        const jwtString = req.headers.authorization.split(" ")[1];
        decodedToken = jwt.decode(jwtString);
        user = await User.findOne({ where: { id: decodedToken.id } });
      }
      // console.log(user);
      if (user) {
        if (user.dataValues.user_type == 3) {
          const schoolDetails = await School.findOne({
            where: { id: user.dataValues.school_id, name: { [Op.ne]: "" } },
            attributes: [
              "id",
              "name",
              "address",
              "contact_person",
              "contact_person_designation",
              "contact_person_number",
              "school_type",
            ],
            order: [["name", "ASC"]],
          });
          const AssetDetails: any = await Asset.findAll({
            where: { school_id: user.dataValues.school_id },
            include: [{model: AssetType, attributes: ['id','name','asset_category_id'], include:[{model: AssetCategory, attributes: ['id','name']}]}],
            attributes: [
              "id",
              "model",
              "serial_no"
            ],
            order: [["id", "ASC"]],
          });
          const totalSchoolVisit: any = await SchoolVisit.findAll({
            where: { school_id: user.dataValues.school_id },
            attributes: ["id"],
          });
          const upcommingSchoolVisit: any = await SchoolVisit.findAll({
            where: {
              [Op.and]: [
              
              {school_id: user.dataValues.school_id,
              arrival: {[Op.eq] : null},
              departure: {[Op.eq] : null},
              grievance_id: {[Op.eq]: null}},

              literal(`DATE(SchoolVisit.date) >= '${currentDate}'`)
              ]
            },
            attributes: ["id"],
          });
          const completedSchoolVisit: any = await SchoolVisit.findAll({
            where: {
              [Op.and]: [
             
              {school_id: user.dataValues.school_id,
              arrival: {[Op.ne] : null},
              departure: {[Op.ne] : null},
              grievance_id: {[Op.eq]: null}

            },
              ]
            },
            attributes: ["id"],
          });
          const ongoingSchoolVisit: any = await SchoolVisit.findAll({
            where: {
              [Op.and]: [
                { school_id: user.dataValues.school_id },
                literal(`DATE(SchoolVisit.date) = '${currentDate}'`),
              ],
            },
            attributes: ["id"],
          });
          const totalGrievances: any = await Grievance.findAll({
            where: { school_id: user.dataValues.school_id },
            attributes: ["id"],
          });
          const pendingGrievances: any = await Grievance.findAll({
            where: {
              status: {[Op.notIn]: [4, 5]},
              school_id: user.dataValues.school_id,
            },
            attributes: ["id"],
          });
          const completedGrievances: any = await Grievance.findAll({
            where: { status:  [5,7], school_id: user.dataValues.school_id },
            attributes: ["id"],
          });
          const unresolvedGrievances: any = await Grievance.findAll({
            where: { status: 4, school_id: user.dataValues.school_id },
            attributes: ["id"],
          });
          return {
            schoolDetails,
            AssetDetails,
            countAssets : AssetDetails.length,
            pendingGrievances: pendingGrievances.length,
            unresolvedGrievances: unresolvedGrievances.length,
            completedGrievances: completedGrievances.length,
            totalGrievances: totalGrievances.length,
            completedSchoolVisit: completedSchoolVisit.length,
            upcommingSchoolVisit: upcommingSchoolVisit.length,
            ongoingSchoolVisit: ongoingSchoolVisit.length,
            totalSchoolVisit: totalSchoolVisit.length,
          };
        } else if (user.dataValues.user_type == 4) {
          const schoolDetails = await School.findAll({
            where: {
              service_engineer: user.dataValues.id,
              name: { [Op.ne]: "" },
            },
            attributes: [
              "id",
              "name",
              "address",
              "contact_person",
              "contact_person_designation",
              "contact_person_number",
              "school_type",
            ],
            order: [["name", "ASC"]],
          });
          const engineerSchool:any = await School.findAll({where: {id: user.dataValues.school_id}})
          schoolDetails.concat(engineerSchool)
          const totalSchoolVisit: any = await SchoolVisit.findAll({
            where: { service_engineer: user.dataValues.id },
            attributes: ["id"],
          });
          const upcommingSchoolVisit: any = await SchoolVisit.findAll({
            where: {
              [Op.and]: [
              //   { service_engineer: user.dataValues.id },
              //   literal(`DATE(SchoolVisit.date) > '${currentDate}'`),
              // ],
              {service_engineer: user.dataValues.id,
              arrival: {[Op.eq] : null},
              departure: {[Op.eq] : null},
              grievance_id: {[Op.eq]: null}},

              literal(`DATE(SchoolVisit.date) >= '${currentDate}'`)
              ]
            },
            attributes: ["id"],
          });
          const completedSchoolVisit: any = await SchoolVisit.findAll({
            where: {
              [Op.and]: [
             
              {service_engineer: user.dataValues.id,
              arrival: {[Op.ne] : null},
              departure: {[Op.ne] : null},
              grievance_id: {[Op.eq]: null}

            },
              ]
            },
            attributes: ["id"],
          });
          const ongoingSchoolVisit: any = await SchoolVisit.findAll({
            where: {
              [Op.and]: [
                { service_engineer: user.dataValues.id },
                literal(`DATE(SchoolVisit.date) = '${currentDate}'`),
              ],
            },
            attributes: ["id"],
          });

          const totalGrievances: any = await Grievance.findAll({
            where: { service_engineer: user.dataValues.id },
            attributes: ["id"],
          });
          const pendingGrievances: any = await Grievance.findAll({
            where: {
              service_engineer: user.dataValues.id,
              status: {[Op.notIn]: [4, 5]},
            },
            attributes: ["id"],
          });
          const completedGrievances: any = await Grievance.findAll({
            where: { service_engineer: user.dataValues.id, status: [5,7] },
            attributes: ["id"],
          });
          const unresolvedGrievances: any = await Grievance.findAll({
            where: { service_engineer: user.dataValues.id, status: 4 },
            attributes: ["id"],
          });
          return {
            countSchools: user.dataValues.school_id == null ?  schoolDetails.length : schoolDetails.length + 1,
            schoolDetails,
            pendingGrievances:pendingGrievances.length,
            unresolvedGrievances: unresolvedGrievances.length,
            completedGrievances: completedGrievances.length,
            totalGrievances: totalGrievances.length,
            completedSchoolVisit: completedSchoolVisit.length,
            upcommingSchoolVisit: upcommingSchoolVisit.length,
            ongoingSchoolVisit: ongoingSchoolVisit.length,
            totalSchoolVisit: totalSchoolVisit.length,
          };
        }
      }
    } catch (e: any) {
      return { error: e };
    }
  }
  async appSchoolVisit(req: any) {
    try {
      let user;
      let decodedToken: any;
      const currentDate: any = moment().format("YYYY-MM-DD");
      // console.log(req)
      if (req.headers.authorization) {
        const jwtString = req.headers.authorization.split(" ")[1];
        decodedToken = jwt.decode(jwtString);
        user = await User.findOne({ where: { id: decodedToken.id } });
      }
      // console.log(user);
      if (user) {
        if (user.dataValues.user_type == 3) {
          const upcommingSchoolVisit: any = await SchoolVisit.findAll({
            where:
              req.body.from && req.body.to
                ? {
                    school_id: user.dataValues.school_id,
                    date: {
                      [Op.and]: {
                        [Op.between]: [req.body.from, req.body.to],
                        [Op.gte]: moment().format("YYYY-MM-DD")
                      },
                    },
                    arrival: {[Op.eq]: null},
                    departure: {[Op.eq]: null},
                    grievance_id: {[Op.eq]: null}
                    // status: 1
                  }
                : {
                  school_id: user.dataValues.school_id,
                    date: { [Op.gte]: moment().format("YYYY-MM-DD") },
                    arrival: {[Op.eq]: null},
                    departure: {[Op.eq]: null},
                    grievance_id: {[Op.eq]: null}

                    // status: 1
                  },

            attributes: [
              "id",
              "school_id",
              "date",
              "status",
              "arrival",
              "departure",
            ],
            include: [
              {
                model: School,
                attributes: [
                  "id",
                  "name",
                  "address",
                  "contact_person",
                  "contact_person_designation",
                  "contact_person_number",
                  "school_type",
                ],
              },
            ],
          });
          const completedSchoolVisit: any = await SchoolVisit.findAll({
            where:
              req.body.from && req.body.to
                ? {
                  school_id: user.dataValues.school_id,
                    date: {
                      [Op.and]: {
                        [Op.between]: [req.body.from, req.body.to], 
                        [Op.lte]: moment().format("YYYY-MM-DD")

                        
                        // literal(`(SchoolVisit.arrival) != null`) ? {[Op.lte]: moment().format("YYYY-MM-DD")}: {[Op.lt]: moment().format("YYYY-MM-DD")},
                        // [Op.lte]: moment().format("YYYY-MM-DD")
                      },
                    },
                    grievance_id: {[Op.eq]: null},

                    // status: 5
                  }
              : {
                school_id: user.dataValues.school_id,
                    grievance_id: {[Op.eq]: null},
                    [Op.lte]: moment().format("YYYY-MM-DD")
                  
                    // date: {[Op.lte]: moment().format("YYYY-MM-DD")}
                    // literal(`(SchoolVisit.arrival) != null`) ? {date : {[Op.lte]: moment().format("YYYY-MM-DD")}}: {date: {[Op.lt]: moment().format("YYYY-MM-DD")}},

                    // [Op.and]: {
                    //   arrival: 
                    // }
                    // status: 5
                  },

            attributes: [
              "id",
              "school_id",
              "date",
              "status",
              "arrival",
              "departure",
            ],
            include: [
              {
                model: School,
                attributes: [
                  "id",
                  "name",
                  "address",
                  "contact_person",
                  "contact_person_designation",
                  "contact_person_number",
                  "school_type",
                ],
              },
            ],
          });
          const ongoingSchoolVisit: any = await SchoolVisit.findAll({
            where:
              req.body.from && req.body.to
                ? {
                  school_id: user.dataValues.school_id,
                    grievance_id: {[Op.eq]: null},

                    date: {
                      [Op.and]: {
                        [Op.between]: [req.body.from, req.body.to],
                        [Op.eq]: moment().format("YYYY-MM-DD"),
                      },
                    },
                  }
                : {
                  grievance_id: {[Op.eq]: null},
                  school_id: user.dataValues.school_id,
                    date: { [Op.eq]: moment().format("YYYY-MM-DD") },
                  },

            attributes: [
              "id",
              "school_id",
              "date",
              "status",
              "arrival",
              "departure",
            ],
            include: [
              {
                model: School,
                attributes: [
                  "id",
                  "name",
                  "address",
                  "contact_person",
                  "contact_person_designation",
                  "contact_person_number",
                  "school_type",
                ],
              },
            ],
          });

          return {
            completedSchoolVisit: completedSchoolVisit,
            upcommingSchoolVisit: upcommingSchoolVisit,
            ongoingSchoolVisit: ongoingSchoolVisit,
          };
        } else if (user.dataValues.user_type == 4) {
          const upcommingSchoolVisit: any = await SchoolVisit.findAll({
            where:
              req.body.from && req.body.to
                ? {
                    service_engineer: user.dataValues.id,
                    date: {
                      [Op.and]: {
                        [Op.between]: [req.body.from, req.body.to],
                        [Op.gte]: moment().format("YYYY-MM-DD")
                      },
                    },
                    arrival: {[Op.eq]: null},
                    departure: {[Op.eq]: null},
                    grievance_id: {[Op.eq]: null}
                    // status: 1
                  }
                : {
                    service_engineer: user.dataValues.id,
                    date: { [Op.gte]: moment().format("YYYY-MM-DD") },
                    arrival: {[Op.eq]: null},
                    departure: {[Op.eq]: null},
                    grievance_id: {[Op.eq]: null}

                    // status: 1
                  },

            attributes: [
              "id",
              "school_id",
              "date",
              "status",
              "arrival",
              "departure",
            ],
            include: [
              {
                model: School,
                attributes: [
                  "id",
                  "name",
                  "address",
                  "contact_person",
                  "contact_person_designation",
                  "contact_person_number",
                  "school_type",
                ],
              },
            ],
          });
          const completedSchoolVisit: any = await SchoolVisit.findAll({
            where:
              req.body.from && req.body.to
                ? {
                    service_engineer: user.dataValues.id,
                    date: {
                      [Op.and]: {
                        [Op.between]: [req.body.from, req.body.to], 
                        [Op.lte]: moment().format("YYYY-MM-DD")

                        
                        // literal(`(SchoolVisit.arrival) != null`) ? {[Op.lte]: moment().format("YYYY-MM-DD")}: {[Op.lt]: moment().format("YYYY-MM-DD")},
                        // [Op.lte]: moment().format("YYYY-MM-DD")
                      },
                    },
                    grievance_id: {[Op.eq]: null},

                    // status: 5
                  }
              : {
                    service_engineer: user.dataValues.id,
                    grievance_id: {[Op.eq]: null},
                    [Op.lte]: moment().format("YYYY-MM-DD")
                  
                    // date: {[Op.lte]: moment().format("YYYY-MM-DD")}
                    // literal(`(SchoolVisit.arrival) != null`) ? {date : {[Op.lte]: moment().format("YYYY-MM-DD")}}: {date: {[Op.lt]: moment().format("YYYY-MM-DD")}},

                    // [Op.and]: {
                    //   arrival: 
                    // }
                    // status: 5
                  },

            attributes: [
              "id",
              "school_id",
              "date",
              "status",
              "arrival",
              "departure",
            ],
            include: [
              {
                model: School,
                attributes: [
                  "id",
                  "name",
                  "address",
                  "contact_person",
                  "contact_person_designation",
                  "contact_person_number",
                  "school_type",
                ],
              },
            ],
          });
          const ongoingSchoolVisit: any = await SchoolVisit.findAll({
            where:
              req.body.from && req.body.to
                ? {
                    service_engineer: user.dataValues.id,
                    grievance_id: {[Op.eq]: null},

                    date: {
                      [Op.and]: {
                        [Op.between]: [req.body.from, req.body.to],
                        [Op.eq]: moment().format("YYYY-MM-DD"),
                      },
                    },
                  }
                : {
                  grievance_id: {[Op.eq]: null},
                    service_engineer: user.dataValues.id,
                    date: { [Op.eq]: moment().format("YYYY-MM-DD") },
                  },

            attributes: [
              "id",
              "school_id",
              "date",
              "status",
              "arrival",
              "departure",
            ],
            include: [
              {
                model: School,
                attributes: [
                  "id",
                  "name",
                  "address",
                  "contact_person",
                  "contact_person_designation",
                  "contact_person_number",
                  "school_type",
                ],
              },
            ],
          });

          return {
            completedSchoolVisit: completedSchoolVisit,
            upcommingSchoolVisit: upcommingSchoolVisit,
            ongoingSchoolVisit: ongoingSchoolVisit,
          };
        }
      }
    } catch (e: any) {
      return { error: e };
    }
  }
  async appGrievance(req: any) {
    try {
      let user;
      let decodedToken: any;

      if (req.headers.authorization) {
        const jwtString = req.headers.authorization.split(" ")[1];
        decodedToken = jwt.decode(jwtString);
        user = await User.findOne({ where: { id: decodedToken.id } });
      }
      // console.log(user);
      if (user) {
        if (user.dataValues.user_type == 3) {
          const pendingGrievances: any = await Grievance.findAll({
            where:
              req.body.from && req.body.to
                ? {
                    school_id: user.dataValues.school_id,
                    status: [0,1,2,3,6],
                    createdAt: { [Op.between]: [req.body.from, req.body.to] },
                  }
                : {
                  school_id: user.dataValues.school_id,
                    status: [0,1,2,3,6],
                  },
            attributes: ["id", "school_id", "visit_date", "status","code",'createdAt'],
            include: [
              {
                model: School,
                attributes: [
                  "id",
                  "name",
                  "address",
                  "contact_person",
                  "contact_person_designation",
                  "contact_person_number",
                  "school_type",
                ],
              },
              {
                model: Asset,
                attributes: ['id','model'],
                include: [{model: AssetType, attributes: ['id', 'name']}]
              },
              {
                model: SchoolVisit,
                attributes: ['id','status','date','visited_date']
              }
            ],
          });

          const completedGrievances: any = await Grievance.findAll({
            where:
              req.body.from && req.body.to
                ? {
                  school_id: user.dataValues.school_id,
                    status: [5,7],
                    visit_date: { [Op.between]: [req.body.from, req.body.to] },
                  }
                : { school_id: user.dataValues.school_id, status: [5,7] },
            attributes: ["id", "school_id", "visit_date", "status","code"],
            include: [
              {
                model: School,
                attributes: [
                  "id",
                  "name",
                  "address",
                  "contact_person",
                  "contact_person_designation",
                  "contact_person_number",
                  "school_type",
                ],
              },
              {
                model: Asset,
                attributes: ['id','model'],
                include: [{model: AssetType, attributes: ['id', 'name']}]
              }
            ],
          });
          const unresolvedGrievances: any = await Grievance.findAll({
            where:
              req.body.from && req.body.to
                ? {
                  school_id: user.dataValues.school_id,
                    status: 4,
                    visit_date: { [Op.between]: [req.body.from, req.body.to] },
                  }
                : { school_id: user.dataValues.school_id, status: 4 },
            attributes: ["id", "school_id", "visit_date", "status","code"],
            include: [
              {
                model: School,
                attributes: [
                  "id",
                  "name",
                  "address",
                  "contact_person",
                  "contact_person_designation",
                  "contact_person_number",
                  "school_type",
                ],
              },
              {
                model: Asset,
                attributes: ['id','model'],
                include: [{model: AssetType, attributes: ['id', 'name']}]
              }
            ],
          });
          return {
            pendingGrievances: pendingGrievances,
            unresolvedGrievances: unresolvedGrievances,
            completedGrievances: completedGrievances,
          };
        } else if (user.dataValues.user_type == 4) {
          const pendingGrievances: any = await Grievance.findAll({
            where:
              req.body.from && req.body.to
                ? {
                    service_engineer: user.dataValues.id,
                    status: [0,1,2,3,6],
                    visit_date: { [Op.between]: [req.body.from, req.body.to] },
                  }
                : {
                    service_engineer: user.dataValues.id,
                    status: [0,1,2,3,6],
                  },
            attributes: ["id", "school_id", "visit_date", "status","code"],
            include: [
              {
                model: School,
                attributes: [
                  "id",
                  "name",
                  "address",
                  "contact_person",
                  "contact_person_designation",
                  "contact_person_number",
                  "school_type",
                ],
              },
              {
                model: Asset,
                attributes: ['id','model'],
                include: [{model: AssetType, attributes: ['id', 'name']}]
              },
              {
                model: SchoolVisit,
                attributes: ['id','status','date','visited_date']
              }
            ],
          });

          const completedGrievances: any = await Grievance.findAll({
            where:
              req.body.from && req.body.to
                ? {
                    service_engineer: user.dataValues.id,
                    status: [5,7],
                    visit_date: { [Op.between]: [req.body.from, req.body.to] },
                  }
                : { service_engineer: user.dataValues.id, status: [5,7] },
            attributes: ["id", "school_id", "visit_date", "status","code"],
            include: [
              {
                model: School,
                attributes: [
                  "id",
                  "name",
                  "address",
                  "contact_person",
                  "contact_person_designation",
                  "contact_person_number",
                  "school_type",
                ],
              },
              {
                model: Asset,
                attributes: ['id','model'],
                include: [{model: AssetType, attributes: ['id', 'name']}]
              }
            ],
          });
          const unresolvedGrievances: any = await Grievance.findAll({
            where:
              req.body.from && req.body.to
                ? {
                    service_engineer: user.dataValues.id,
                    status: 4,
                    visit_date: { [Op.between]: [req.body.from, req.body.to] },
                  }
                : { service_engineer: user.dataValues.id, status: 4 },
            attributes: ["id", "school_id", "visit_date", "status","code"],
            include: [
              {
                model: School,
                attributes: [
                  "id",
                  "name",
                  "address",
                  "contact_person",
                  "contact_person_designation",
                  "contact_person_number",
                  "school_type",
                ],
              },
              {
                model: Asset,
                attributes: ['id','model'],
                include: [{model: AssetType, attributes: ['id', 'name']}]
              }
            ],
          });
          return {
            pendingGrievances: pendingGrievances,
            unresolvedGrievances: unresolvedGrievances,
            completedGrievances: completedGrievances,
          };
        }
      }
    } catch (e: any) {
      return { error: e };
    }
  }
  async store(req: any) {
    
    let user;
    let decodedToken: any;
    if (req.headers.authorization) {
      const jwtString = req.headers.authorization.split(" ")[1];
      decodedToken = jwt.decode(jwtString);
      user = await User.findOne({ where: { id: decodedToken.id } });
    }
    if (user) {
      const date = moment(req.body.date, "YYYY-MM-DD");
      try {
        let data;
          const obj: any = {
            date: date,
            school_id: req.body.school_id,
            service_engineer: req.body.service_engineer,
            status:1
           
          };

          data = await SchoolVisit.create(obj);
   
        return data;
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
      // const schoolId: any = await School.findOne({where: {id: req.body.id, deletedAt: ''}})
      try {
        await School.update(
          {
            school_type: req.body.school_type,
            name: req.body.name,
            code: req.body.code,
            UDISE_code: req.body.UDISE_code,
            contact_person: req.body.contact_person,
            contact_person_designation: req.body.contact_person_designation,
            contact_person_number: req.body.contact_person_number,
            master_name: req.body.master_name,
            master_number: req.body.master_number,
            address: req.body.address,
            pincode: req.body.pincode,
            service_engineer: req.body.service_engineer,
            district: req.body.district,
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
        const res: any = await SchoolVisit.findOne({
          where: { id: req.params.id },
          include: [
            { model: School, required: false },
            { model: User, required: false },
            {
              model: Grievance,
              required: false,
              include: [
                {
                  model: Asset,
                  required: false,
                  include: [{ model: AssetType, required: false }],
                },
              ],
            },
            { model: Attendance, required: false },
          ],
        });
        // console.log(res);
        const data: any = {
          id: res.dataValues.School && res.dataValues.School.dataValues.id,
          service_engineer:
            res.dataValues.User && res.dataValues.User.dataValues.user_name,
          service_engineer_id:
            res.dataValues.User && res.dataValues.User.dataValues.id,
          phone: res.dataValues.User && res.dataValues.User.dataValues.phone,
          name: res.dataValues.School && res.dataValues.School.dataValues.name,
          asset:
            res.dataValues.Grievance &&
            res.dataValues.Grievance.dataValues.Asset &&
            res.dataValues.Grievance.dataValues.Asset.dataValues.AssetType &&
            res.dataValues.Grievance.dataValues.Asset.dataValues.AssetType
              .dataValues.name,
          date: res.dataValues.date,
          arrival: res.dataValues.Attendances[0]
            ? res.dataValues.Attendances[0].check_in
            : null,
          departure: res.dataValues.Attendances[0]
            ? res.dataValues.Attendances[0].check_out
            : null,
          status: res.dataValues.status,
          grievance_code:
            res.dataValues.Grievance &&
            res.dataValues.Grievance.dataValues.Asset &&
            res.dataValues.Grievance.dataValues.code,
        };
        // console.log(data)
        return data;
      }
    } catch (e: any) {
      return { error: e };
    }
  }
  async getVisitSchoolById(req: any) {
    try {
      let user;
      let decodedToken: any;

      if (req.headers.authorization) {
        const jwtString = req.headers.authorization.split(" ")[1];
        decodedToken = jwt.decode(jwtString);
        user = await User.findOne({ where: { id: decodedToken.id } });
      }
      if (user) {
        const res: any = await SchoolVisit.findOne({
          where: { id: req.params.id },
          attributes: ["id", "date"],
          include: [
            { model: School, required: false, attributes: ["id", "name"] },
          ],
        });
        // console.log(res)
        const data: any = {
          name: res.dataValues.School && res.dataValues.School.dataValues.name,
          date: res.dataValues.date,
        };
        // console.log(data)
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
      const val = await School.findOne({ where: { id: req.params.id } });
      if (!val) {
        throw new Error("id not found");
      } else {
        try {
          const res = await School.destroy({ where: { id: req.params.id } });
          return { res };
        } catch (e: any) {
          return { error: e };
        }
      }
    }
  }

  async storeDoc(files: any) {
    let sampleFile: any;
    let uploadPath: any;

    if (!files || Object.keys(files).length === 0) {
      throw new Error("No files were uploaded.");
    }

    sampleFile = files.files;
    let file_name = new Date().getTime() + "_" + sampleFile.name;
    uploadPath = "./src/repositories/import/" + file_name;

    sampleFile.mv(uploadPath, function (err: any) {
      if (err) throw new Error(err);
      else {
        const workbook = xlsx.readFile(uploadPath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const csvData = xlsx.utils.sheet_to_csv(sheet, { FS: "," });
        const outputCsvFilePath =
          "./src/repositories/import/" + file_name + ".csv";
        fs.writeFileSync(outputCsvFilePath, csvData, "utf8");

        // console.log('Conversion successful. CSV file saved to', outputCsvFilePath);
        fs.createReadStream(outputCsvFilePath)
          .pipe(
            parse({
              delimiter: ",",
              headers: ["UDISE_code", "phone", "date"],
            })
          )
          .on("data", async (row: SchoolVisitMembers) => {
            const { UDISE_code, phone, date }: any = row;

            const deletedAt: Date | undefined = undefined;
            let schoolId: any = null;
            if (UDISE_code != undefined) {
              schoolId = await School.findOne({
                where: { UDISE_code: UDISE_code },
              });
            }
            let userId: any = null;
            if (phone != undefined) {
              userId = await User.findOne({ where: { phone: phone } });
            }
            if (schoolId && userId && date != undefined ) {
            
                const obj: any = {
                  date: date,
                  school_id: schoolId?.dataValues.id,
                  service_engineer: userId?.dataValues.id,
                 
                };

                await SchoolVisit.create(obj);
            
            }
          })
          .on("end", () => {
            console.log("CSV file successfully processed.");
          });
      }
    });
    return { body: "Documents Updated" };
  }
}

export { SchoolVisitRepository };
