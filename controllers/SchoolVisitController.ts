import { RequestHandler } from "express";
import Express, { Request, Response } from "express";
import { SchoolVisitRepository } from "../repositories/SchoolVisitRepository";
const { Op } = require("sequelize");
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { School } from "../models/School";
import { SchoolVisit, SchoolVisitMembers } from "../models/SchoolVisit";
import { Attendance } from "../models/Attendance";
import { Grievance } from "../models/Grievance";
import { Asset } from "../models/Asset";
import { AssetType } from "../models/AssetType";
import moment from "moment";
import { literal } from "sequelize";
const parse = require("csv-parser");
const fs = require("fs");
const repo = new SchoolVisitRepository();
export const getSchoolVisit: RequestHandler = async (req, res, next) => {
  try {
    const data = await repo.list(req);
    return res.json({ success: true, data: data });
  } catch (e: any) {
    res
      .status(404)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};
export const getAppDashboard: RequestHandler = async (req, res, next) => {
  try {
    const data = await repo.appDashboard(req);
    return res.json({ success: true, data });
  } catch (e: any) {
    res
      .status(404)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};
export const getAppSchoolVisit: RequestHandler = async (req, res, next) => {
  try {
    const data = await repo.appSchoolVisit(req);
    return res.json({ success: true, data });
  } catch (e: any) {
    res
      .status(404)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};
export const getAppGrievance: RequestHandler = async (req, res, next) => {
  try {
    const data = await repo.appGrievance(req);
    return res.json({ success: true, data });
  } catch (e: any) {
    res
      .status(404)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};
export const getSchoolVisitById: RequestHandler = async (req, res, next) => {
  try {
    const data = await repo.getById(req);
    return res.json({ success: true, data: data });
  } catch (e: any) {
    res
      .status(404)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};
export const getSchoolVisitNameById: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const data = await repo.getVisitSchoolById(req);
    return res.json({ success: true, data: data });
  } catch (e: any) {
    res
      .status(404)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};
export const saveSchoolVisit: RequestHandler = async (req, res, next) => {
  try {
    const data = await repo.store(req);
    return res.json({ success: true, data: data });
  } catch (e: any) {
    res
      .status(400)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};

export const updateSchoolVisit: RequestHandler = async (req, res, next) => {
  try {
    await repo.update(req);
    return res.json({ success: true });
  } catch (e: any) {
    res
      .status(400)
      .json({ success: false, error: ["could not update data", e.message] });
  }
};
export const destroySchoolVisit: RequestHandler = async (req, res, next) => {
  try {
    await repo.delete(req);
    return res.json({ success: true });
  } catch (e: any) {
    res
      .status(400)
      .json({ success: false, error: ["could not update data", e.message] });
  }
};
export const getSchoolVisitList: RequestHandler = async (req, res, next) => {
  try {
    // console.log(req.body)
    let user: any;
    let decodedToken: any;
    if (req.headers.authorization) {
      const jwtString = req.headers.authorization.split(" ")[1];
      decodedToken = jwt.decode(jwtString);
      user = await User.findOne({ where: { id: decodedToken.id } });
    }
    if (user) {
      // console.log(user);
      const currentDate: any = moment().format("YYYY-MM-DD");

      const draw = req.body.draw;
      const start = parseInt(req.body.start as string, 10) || 0;
      const length = parseInt(req.body.length as string, 10) || 10;
      const searchValue = (req.body.search as any)?.value || "";
      // console.log(req.body.order)
      // For ordering (sorting)
      const orderColumnIndex = (req.body.order as any)?.[0]?.column;
      const orderDir = (req.body.order as any)?.[0]?.dir || "asc";
      const orderColumnName =
        (req.body.columns as any)?.[orderColumnIndex]?.data || "id";

      // Search logic
      let searchCondition = {};
      if (searchValue) {
        searchCondition = {
          date: { [Op.like]: `%${searchValue}%` },
        };
      }
      // Fetching the users with pagination, search, and sort

      if (!req.query.upcoming) {
        if (user.user_type == 3 && user.school_id != null) {
          let searchCondition = {};
          if (searchValue) {
            searchCondition = {
              date: { [Op.like]: `%${searchValue}%` },
            };
          }
          let outerSearchResults = await SchoolVisit.findAll({
            attributes: ["id", "date"],
            where:
              searchValue !== null
                ? { date: { [Op.like]: `%${searchValue}%` } }
                : {},
          });
          let outerSearchCondition =
            outerSearchResults.length > 0 ? { [Op.not]: null } : null;

          let innerSearchResults = await SchoolVisit.findAll({
            include: [
              {
                model: User,
                required: true,
                attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
                where:
                  outerSearchCondition == null
                    ? { user_name: { [Op.like]: `%${searchValue}%` } }
                    : {},
                order: [["user_name", orderDir]],
              },
            ],
          });
          let innerSearchCondition =
            innerSearchResults.length > 0 ? { [Op.not]: null } : null;

          let secondinnerSearchResults = await SchoolVisit.findAll({
            include: [
              {
                model: Grievance,
                required: innerSearchCondition == null ? true : false,
                attributes: ["id", "asset_id"],
                include: [
                  {
                    model: Asset,
                    attributes: ["id", "model"],
                    required: innerSearchCondition == null ? true : false,
                    where:
                      innerSearchCondition == null
                        ? { model: { [Op.like]: `%${searchValue}%` } }
                        : {},
                  },
                ],
              },
            ],
          });
          let secondinnerSearchCondition =
            secondinnerSearchResults.length > 0 ? { [Op.not]: null } : null;
            if(req.body.type == 1){
              if( req.body.tab == 1){

                const { count, rows } = await SchoolVisit.findAndCountAll({
                  include: [
                    {
                      model: User,
                      required: true,
                      attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
                      where:
                        outerSearchCondition == null && innerSearchCondition != null
                          ? { user_name: { [Op.like]: `%${searchValue}%` } }
                          : {},
                      order: [["user_name", orderDir]],
                    },
                    {
                      model: Attendance,
                      required: false,
                      attributes: ["id", "check_in", "check_out", "status"],
                      order: [
                        ["check_in", orderDir],
                        ["check_out", orderDir],
                        ["status", orderDir],
                      ],
                    },
                    {
                      model: School,
                      required: false,
                      attributes: ["id", "name", "school_type"],
                      order: [["name", orderDir]],
                    },
                  
                  ],
                  where:
                  outerSearchCondition != null
                  ? {
                    [Op.and]: [
                      literal(`DATE(SchoolVisit.date) = '${currentDate}'`), // Compare only the date part
                      {...searchCondition,grievance_id: {[Op.is]: null}, school_id: user.school_id},
                    ]
                    }
                  : {[Op.and]: [
                    literal(`DATE(SchoolVisit.date) = '${currentDate}'`), // Compare only the date part
                   {grievance_id: {[Op.is]: null}, school_id: user.school_id},
                  ],},
                  order: [[orderColumnName, orderDir]],
                  offset: start,
                  limit: length,
                });
      
                let data = {};
                if (rows.length > 0) {
                  data =
                    rows &&
                    rows.map((data: any) => ({
                      id: data.id,
                      date: data.date,
                      type: user.user_type,
                      name: data.dataValues.School
                        ? data.dataValues.School.dataValues.name
                        : "-- --",
                      school_type: data.dataValues.School
                        ? data.dataValues.School.dataValues.school_type
                        : "-- --",
                      service_engineer: data.dataValues.User
                        ? data.dataValues.User.dataValues.user_name
                        : "-- --",
                      phone: data.dataValues.User
                        ? data.dataValues.User.dataValues.phone
                        : "-- --",
                        arrival: data.dataValues.Attendances[0]
                        ? data.dataValues.Attendances[0] &&
                          data.dataValues.Attendances[0].dataValues.check_in
                        : "-- --",
                      departure: data.dataValues.Attendances[0]
                        ? data.dataValues.Attendances[0] &&
                          data.dataValues.Attendances[0].dataValues.check_out
                        : "-- --",
                      status: data.dataValues.Attendances[0]
                      ? data.dataValues.Attendances[0] &&
                        data.dataValues.Attendances[0].dataValues.status
                        : "-- --",
                      model: data.dataValues.Grievance
                        ? data.dataValues.Grievance.dataValues.Asset &&
                          data.dataValues.Grievance.dataValues.Asset.dataValues.model
                        : "",
                      asset: data.dataValues.Grievance
                        ? data.dataValues.Grievance.dataValues.Asset &&
                          data.dataValues.Grievance.dataValues.Asset.dataValues
                            .AssetType &&
                          data.dataValues.Grievance.dataValues.Asset.dataValues
                            .AssetType.dataValues.name
                        : "-- --",
                        visited_date: data.dataValues.visited_date != null ?  data.dataValues.visited_date : '',
                    }));
                }

                const excelData = await SchoolVisit.findAll({
                  include: [
                    {
                      model: User,
                      required: true,
                      attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
                      where:
                        outerSearchCondition == null && innerSearchCondition != null
                          ? { user_name: { [Op.like]: `%${searchValue}%` } }
                          : {},
                      order: [["user_name", orderDir]],
                    },
                    {
                      model: Attendance,
                      required: false,
                      attributes: ["id", "check_in", "check_out", "status"],
                      order: [
                        ["check_in", orderDir],
                        ["check_out", orderDir],
                        ["status", orderDir],
                      ],
                    },
                    {
                      model: School,
                      required: false,
                      attributes: ["id", "name", "school_type"],
                      order: [["name", orderDir]],
                    },
                  
                  ],
                  where:{grievance_id: {[Op.is]: null}, school_id: user.school_id},
                  order: [[orderColumnName, orderDir]]
                });
                let dataForExcel:any;
                if(excelData.length > 0){
                  dataForExcel = excelData.map((data: any) => ({
                    // id: data.id,
                    date: data.date,
                    type: 
                    user.user_type == 1
                      ? "Admin"
                      : user.user_type == 2
                      ? "OEM"
                      : user.user_type == 3
                      ? "School View"
                      : user.user_type == 4
                      ? "Service Engineer"
                      : user.user_type == 5
                      ? "Help Desk"
                      : "Management",
                    name: data.dataValues.School
                      ? data.dataValues.School.dataValues.name
                      : "-- --",
                    school_type: data.dataValues.School?.dataValues.school_type == 1 ? "Elementary" : "Secondary",
                    service_engineer: data.dataValues.User
                      ? data.dataValues.User.dataValues.user_name
                      : "-- --",
                    phone: data.dataValues.User
                      ? data.dataValues.User.dataValues.phone
                      : "-- --",
                    arrival: data.dataValues.Attendances[0]
                      ? data.dataValues.Attendances[0] &&
                        data.dataValues.Attendances[0].dataValues.check_in
                      : "-- --",
                    departure: data.dataValues.Attendances[0]
                      ? data.dataValues.Attendances[0] &&
                        data.dataValues.Attendances[0].dataValues.check_out
                      : "-- --",
                    status: data.dataValues.Attendances[0]?.dataValues.status == 1 ? 'Working Fine' : data.dataValues.Attendances[0]?.dataValues.status == 2 ? 'Issue':data.dataValues.Attendances[0]?.dataValues.status == 3 ? 'Unresolved' : data.dataValues.Attendances[0]?.dataValues.status == 4 ? 'Resolved' : "-- --",
                    model: data.dataValues.Grievance
                      ? data.dataValues.Grievance.dataValues.Asset &&
                        data.dataValues.Grievance.dataValues.Asset.dataValues.model
                      : "",
                    asset: data.dataValues.Grievance
                      ? data.dataValues.Grievance.dataValues.Asset &&
                        data.dataValues.Grievance.dataValues.Asset.dataValues
                          .AssetType &&
                        data.dataValues.Grievance.dataValues.Asset.dataValues
                          .AssetType.dataValues.name
                      : "-- --",
                      visited_date: data.dataValues.visited_date != null ?  data.dataValues.visited_date : '',
                  }));
                }
                res.json({
                  draw: draw,
                  recordsTotal: count,
                  recordsFiltered: count,
                  data: data,
                  searchCondition: searchCondition,
                  searchValue: searchValue,
                  excel: dataForExcel
                });
              }else{
                const { count, rows } = await SchoolVisit.findAndCountAll({
                  include: [
                    {
                      model: User,
                      required: true,
                      attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
                      where:
                        outerSearchCondition == null && innerSearchCondition != null
                          ? { user_name: { [Op.like]: `%${searchValue}%` } }
                          : {},
                      order: [["user_name", orderDir]],
                    },
                    {
                      model: Attendance,
                      required: false,
                      attributes: ["id", "check_in", "check_out", "status"],
                      order: [
                        ["check_in", orderDir],
                        ["check_out", orderDir],
                        ["status", orderDir],
                      ],
                    },
                    {
                      model: School,
                      required: false,
                      attributes: ["id", "name", "school_type"],
                      order: [["name", orderDir]],
                    },
                    {
                      model: Grievance,
                      required: innerSearchCondition == null ? true : false,
                      attributes: ["id", "asset_id"],
                      include: [
                        {
                          model: Asset,
                          attributes: ["id", "model"],
                          required: innerSearchCondition == null ? true : false,
                          where:
                            innerSearchCondition == null &&
                            secondinnerSearchCondition != null
                              ? { model: { [Op.like]: `%${searchValue}%` } }
                              : {},
                          include: [
                            {
                              model: AssetType,
                              attributes: ["id", "name"],
                              required: innerSearchCondition == null ? true : false,
                              where:
                                secondinnerSearchCondition == null
                                  ? { name: { [Op.like]: `%${searchValue}%` } }
                                  : {},
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  where:
                    outerSearchCondition != null
                      ? {
                        [Op.and]: [
                          literal(`DATE(SchoolVisit.date) = '${currentDate}'`), // Compare only the date part
                          {...searchCondition,grievance_id: {[Op.not]: null}, school_id: user.school_id},
                        ]}
                      : {[Op.and]: [
                        literal(`DATE(SchoolVisit.date) = '${currentDate}'`), // Compare only the date part
                        {grievance_id: {[Op.not]: null}, school_id: user.school_id},
                      ],},
                  order: [[orderColumnName, orderDir]],
                  offset: start,
                  limit: length,
                });
      
                let data = {};
                if (rows.length > 0) {
                  data =
                    rows &&
                    rows.map((data: any) => ({
                      id: data.id,
                      date: data.date,
                      type: user.user_type,
                      name: data.dataValues.School
                        ? data.dataValues.School.dataValues.name
                        : "-- --",
                      school_type: data.dataValues.School
                        ? data.dataValues.School.dataValues.school_type
                        : "-- --",
                      service_engineer: data.dataValues.User
                        ? data.dataValues.User.dataValues.user_name
                        : "-- --",
                      phone: data.dataValues.User
                        ? data.dataValues.User.dataValues.phone
                        : "-- --",
                        arrival: data.dataValues.Attendances[0]
                        ? data.dataValues.Attendances[0] &&
                          data.dataValues.Attendances[0].dataValues.check_in
                        : "-- --",
                      departure: data.dataValues.Attendances[0]
                        ? data.dataValues.Attendances[0] &&
                          data.dataValues.Attendances[0].dataValues.check_out
                        : "-- --",
                      status: data.dataValues.Attendances[0]
                      ? data.dataValues.Attendances[0] &&
                        data.dataValues.Attendances[0].dataValues.status
                        : "-- --",
                      model: data.dataValues.Grievance
                        ? data.dataValues.Grievance.dataValues.Asset &&
                          data.dataValues.Grievance.dataValues.Asset.dataValues.model
                        : "",
                      asset: data.dataValues.Grievance
                        ? data.dataValues.Grievance.dataValues.Asset &&
                          data.dataValues.Grievance.dataValues.Asset.dataValues
                            .AssetType &&
                          data.dataValues.Grievance.dataValues.Asset.dataValues
                            .AssetType.dataValues.name
                        : "-- --",
                        visited_date: data.dataValues.visited_date != null ?  data.dataValues.visited_date : '',
                    }));
                }
                const excelData = await SchoolVisit.findAll({
                  include: [
                    {
                      model: User,
                      required: true,
                      attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
                      where:
                        outerSearchCondition == null && innerSearchCondition != null
                          ? { user_name: { [Op.like]: `%${searchValue}%` } }
                          : {},
                      order: [["user_name", orderDir]],
                    },
                    {
                      model: Attendance,
                      required: false,
                      attributes: ["id", "check_in", "check_out", "status"],
                      order: [
                        ["check_in", orderDir],
                        ["check_out", orderDir],
                        ["status", orderDir],
                      ],
                    },
                    {
                      model: School,
                      required: false,
                      attributes: ["id", "name", "school_type"],
                      order: [["name", orderDir]],
                    },
                  
                  ],
                  where:{grievance_id: {[Op.not]: null}, school_id: user.school_id},
                  order: [[orderColumnName, orderDir]]
                });
                let dataForExcel:any;
                if(excelData.length > 0){
                  dataForExcel = excelData.map((data: any) => ({
                    // id: data.id,
                    date: data.date,
                    type: 
                    user.user_type == 1
                      ? "Admin"
                      : user.user_type == 2
                      ? "OEM"
                      : user.user_type == 3
                      ? "School View"
                      : user.user_type == 4
                      ? "Service Engineer"
                      : user.user_type == 5
                      ? "Help Desk"
                      : "Management",
                    name: data.dataValues.School
                      ? data.dataValues.School.dataValues.name
                      : "-- --",
                    school_type: data.dataValues.School?.dataValues.school_type == 1 ? "Elementary" : "Secondary",
                    service_engineer: data.dataValues.User
                      ? data.dataValues.User.dataValues.user_name
                      : "-- --",
                    phone: data.dataValues.User
                      ? data.dataValues.User.dataValues.phone
                      : "-- --",
                    arrival: data.dataValues.Attendances[0]
                      ? data.dataValues.Attendances[0] &&
                        data.dataValues.Attendances[0].dataValues.check_in
                      : "-- --",
                    departure: data.dataValues.Attendances[0]
                      ? data.dataValues.Attendances[0] &&
                        data.dataValues.Attendances[0].dataValues.check_out
                      : "-- --",
                    status: data.dataValues.Attendances[0]?.dataValues.status == 1 ? 'Working Fine' : data.dataValues.Attendances[0]?.dataValues.status == 2 ? 'Issue':data.dataValues.Attendances[0]?.dataValues.status == 3 ? 'Unresolved' : data.dataValues.Attendances[0]?.dataValues.status == 4 ? 'Resolved' : "-- --",
                    model: data.dataValues.Grievance
                      ? data.dataValues.Grievance.dataValues.Asset &&
                        data.dataValues.Grievance.dataValues.Asset.dataValues.model
                      : "",
                    asset: data.dataValues.Grievance
                      ? data.dataValues.Grievance.dataValues.Asset &&
                        data.dataValues.Grievance.dataValues.Asset.dataValues
                          .AssetType &&
                        data.dataValues.Grievance.dataValues.Asset.dataValues
                          .AssetType.dataValues.name
                      : "-- --",
                      visited_date: data.dataValues.visited_date != null ?  data.dataValues.visited_date : '',
                  }));
                }
                res.json({
                  draw: draw,
                  recordsTotal: count,
                  recordsFiltered: count,
                  data: data,
                  searchCondition: searchCondition,
                  searchValue: searchValue,
                  excel: dataForExcel
                });
              }
            }else{
              if( req.body.tab == 1){

                const { count, rows } = await SchoolVisit.findAndCountAll({
                  include: [
                    {
                      model: User,
                      required: true,
                      attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
                      where:
                        outerSearchCondition == null && innerSearchCondition != null
                          ? { user_name: { [Op.like]: `%${searchValue}%` } }
                          : {},
                      order: [["user_name", orderDir]],
                    },
                    {
                      model: Attendance,
                      required: false,
                      attributes: ["id", "check_in", "check_out", "status"],
                      order: [
                        ["check_in", orderDir],
                        ["check_out", orderDir],
                        ["status", orderDir],
                      ],
                    },
                    {
                      model: School,
                      required: false,
                      attributes: ["id", "name", "school_type"],
                      order: [["name", orderDir]],
                    },
                  
                  ],
                  where:
                        req.body.from != null &&
                        req.body.to != null &&
                        req.body.date == 2
                      ? {
                          date: {
                            [Op.and]: {
                              [Op.between]: [req.body.from, req.body.to],
                              [Op.gt]: moment().format("YYYY-MM-DD"),
                            },
                          },grievance_id: {[Op.is]: null}, school_id: user.school_id
                        }
                      : req.body.from != null &&
                        req.body.to != null &&
                        req.body.date == 1
                      ? {
                          date: {
                            [Op.and]: {
                              [Op.between]: [req.body.from, req.body.to],
                              [Op.eq]: moment().format("YYYY-MM-DD"),
                            },
                          },grievance_id: {[Op.is]: null}, school_id: user.school_id
                        }
                      : req.body.from != null &&
                        req.body.to != null &&
                        req.body.date == 3
                      ? {
                          date: {
                            [Op.and]: {
                              [Op.between]: [req.body.from, req.body.to],
                              [Op.lt]: moment().format("YYYY-MM-DD"),
                            },
                          },
                          arrival: { [Op.is]: null },
                          departure: { [Op.is]: null },grievance_id: {[Op.is]: null}, school_id: user.school_id
                        }
                      : req.body.from != null &&
                        req.body.to != null &&
                        req.body.date == 4
                      ? {
                          date: {
                            [Op.and]: {
                              [Op.between]: [req.body.from, req.body.to],
                              [Op.lt]: moment().format("YYYY-MM-DD"),
                            },
                          },
                          arrival: { [Op.not]: null },
                          departure: { [Op.not]: null },grievance_id: {[Op.is]: null}, school_id: user.school_id
                        }
                      
                      : req.body.from != null &&
                        req.body.to != null &&
                        outerSearchCondition != null
                      ? {
                          date: { [Op.between]: [req.body.from, req.body.to] },
                          ...searchCondition,grievance_id: {[Op.is]: null}, school_id: user.school_id
                        }
                     
                      : req.body.from != null && req.body.to != null
                      ? { date: { [Op.between]: [req.body.from, req.body.to] },grievance_id: {[Op.is]: null}, school_id: user.school_id }
                      
                      
                      : outerSearchCondition != null
                      ? { ...searchCondition,grievance_id: {[Op.is]: null}, school_id: user.school_id }
                      
                      
                      
                      : outerSearchCondition != null && req.body.date == 2
                      ? {
                          date: { [Op.gt]: moment().format("YYYY-MM-DD") },
                          ...searchCondition,grievance_id: {[Op.is]: null}, school_id: user.school_id
                        }
                      : outerSearchCondition != null && req.body.date == 1
                      ? {
                          date: { [Op.eq]: moment().format("YYYY-MM-DD") },
                          ...searchCondition,grievance_id: {[Op.is]: null}, school_id: user.school_id
                        }
                      : outerSearchCondition != null && req.body.date == 3
                      ? {
                          date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                          arrival: { [Op.is]: null },
                          departure: { [Op.is]: null },
                          ...searchCondition,grievance_id: {[Op.is]: null}, school_id: user.school_id
                        }
                      : outerSearchCondition != null && req.body.date == 4
                      ? {
                          date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                          arrival: { [Op.not]: null },
                          departure: { [Op.not]: null },
                          ...searchCondition,grievance_id: {[Op.is]: null}, school_id: user.school_id
                        }
                      : req.body.date == 1
                      ? { date: { [Op.eq]: moment().format("YYYY-MM-DD") },grievance_id: {[Op.is]: null}, school_id: user.school_id }
                      : req.body.date == 2
                      ? { date: { [Op.gt]: moment().format("YYYY-MM-DD") },grievance_id: {[Op.is]: null}, school_id: user.school_id }
                      : req.body.date == 3
                      ? {
                          date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                          arrival: { [Op.is]: null },
                          departure: { [Op.is]: null },grievance_id: {[Op.is]: null}, school_id: user.school_id
                        }
                      : req.body.date == 4
                      ? {
                          date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                          arrival: { [Op.not]: null },
                          departure: { [Op.not]: null },grievance_id: {[Op.is]: null}, school_id: user.school_id
                        }
                      : {grievance_id: {[Op.is]: null}, school_id: user.school_id},
                  order: [[orderColumnName, orderDir]],
                  offset: start,
                  limit: length,
                });
      
                let data = {};
                if (rows.length > 0) {
                  data =
                    rows &&
                    rows.map((data: any) => ({
                      id: data.id,
                      date: data.date,
                      type: user.user_type,
                      name: data.dataValues.School
                        ? data.dataValues.School.dataValues.name
                        : "-- --",
                      school_type: data.dataValues.School
                        ? data.dataValues.School.dataValues.school_type
                        : "-- --",
                      service_engineer: data.dataValues.User
                        ? data.dataValues.User.dataValues.user_name
                        : "-- --",
                      phone: data.dataValues.User
                        ? data.dataValues.User.dataValues.phone
                        : "-- --",
                        arrival: data.dataValues.Attendances[0]
                        ? data.dataValues.Attendances[0] &&
                          data.dataValues.Attendances[0].dataValues.check_in
                        : "-- --",
                      departure: data.dataValues.Attendances[0]
                        ? data.dataValues.Attendances[0] &&
                          data.dataValues.Attendances[0].dataValues.check_out
                        : "-- --",
                      status: data.dataValues.Attendances[0]
                      ? data.dataValues.Attendances[0] &&
                        data.dataValues.Attendances[0].dataValues.status
                        : "-- --",
                      model: data.dataValues.Grievance
                        ? data.dataValues.Grievance.dataValues.Asset &&
                          data.dataValues.Grievance.dataValues.Asset.dataValues.model
                        : "",
                      asset: data.dataValues.Grievance
                        ? data.dataValues.Grievance.dataValues.Asset &&
                          data.dataValues.Grievance.dataValues.Asset.dataValues
                            .AssetType &&
                          data.dataValues.Grievance.dataValues.Asset.dataValues
                            .AssetType.dataValues.name
                        : "-- --",
                        visited_date: data.dataValues.visited_date != null ?  data.dataValues.visited_date : '',
                        // rows: rows
                    }));
                }

                const excelData = await SchoolVisit.findAll({
                  include: [
                    {
                      model: User,
                      required: true,
                      attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
                      where:
                        outerSearchCondition == null && innerSearchCondition != null
                          ? { user_name: { [Op.like]: `%${searchValue}%` } }
                          : {},
                      order: [["user_name", orderDir]],
                    },
                    {
                      model: Attendance,
                      required: false,
                      attributes: ["id", "check_in", "check_out", "status"],
                      order: [
                        ["check_in", orderDir],
                        ["check_out", orderDir],
                        ["status", orderDir],
                      ],
                    },
                    {
                      model: School,
                      required: false,
                      attributes: ["id", "name", "school_type"],
                      order: [["name", orderDir]],
                    },
                  
                  ],
                  where:{grievance_id: {[Op.is]: null}, school_id: user.school_id},
                  order: [[orderColumnName, orderDir]]
                });
                let dataForExcel:any;
                if(excelData.length > 0){
                  dataForExcel = excelData.map((data: any) => ({
                    // id: data.id,
                    date: data.date,
                    type: 
                    user.user_type == 1
                      ? "Admin"
                      : user.user_type == 2
                      ? "OEM"
                      : user.user_type == 3
                      ? "School View"
                      : user.user_type == 4
                      ? "Service Engineer"
                      : user.user_type == 5
                      ? "Help Desk"
                      : "Management",
                    name: data.dataValues.School
                      ? data.dataValues.School.dataValues.name
                      : "-- --",
                    school_type: data.dataValues.School?.dataValues.school_type == 1 ? "Elementary" : "Secondary",
                    service_engineer: data.dataValues.User
                      ? data.dataValues.User.dataValues.user_name
                      : "-- --",
                    phone: data.dataValues.User
                      ? data.dataValues.User.dataValues.phone
                      : "-- --",
                    arrival: data.dataValues.Attendances[0]
                      ? data.dataValues.Attendances[0] &&
                        data.dataValues.Attendances[0].dataValues.check_in
                      : "-- --",
                    departure: data.dataValues.Attendances[0]
                      ? data.dataValues.Attendances[0] &&
                        data.dataValues.Attendances[0].dataValues.check_out
                      : "-- --",
                    status: data.dataValues.Attendances[0]?.dataValues.status == 1 ? 'Working Fine' : data.dataValues.Attendances[0]?.dataValues.status == 2 ? 'Issue':data.dataValues.Attendances[0]?.dataValues.status == 3 ? 'Unresolved' : data.dataValues.Attendances[0]?.dataValues.status == 4 ? 'Resolved' : "-- --",
                    model: data.dataValues.Grievance
                      ? data.dataValues.Grievance.dataValues.Asset &&
                        data.dataValues.Grievance.dataValues.Asset.dataValues.model
                      : "",
                    asset: data.dataValues.Grievance
                      ? data.dataValues.Grievance.dataValues.Asset &&
                        data.dataValues.Grievance.dataValues.Asset.dataValues
                          .AssetType &&
                        data.dataValues.Grievance.dataValues.Asset.dataValues
                          .AssetType.dataValues.name
                      : "-- --",
                      visited_date: data.dataValues.visited_date != null ?  data.dataValues.visited_date : '',
                  }));
                }
                res.json({
                  draw: draw,
                  recordsTotal: count,
                  recordsFiltered: count,
                  data: data,
                  searchCondition: searchCondition,
                  searchValue: searchValue,
                  excel: dataForExcel
                });
              }else{
                const { count, rows } = await SchoolVisit.findAndCountAll({
                  include: [
                    {
                      model: User,
                      required: true,
                      attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
                      where:
                        outerSearchCondition == null && innerSearchCondition != null
                          ? { user_name: { [Op.like]: `%${searchValue}%` } }
                          : {},
                      order: [["user_name", orderDir]],
                    },
                    {
                      model: Attendance,
                      required: false,
                      attributes: ["id", "check_in", "check_out", "status"],
                      order: [
                        ["check_in", orderDir],
                        ["check_out", orderDir],
                        ["status", orderDir],
                      ],
                    },
                    {
                      model: School,
                      required: false,
                      attributes: ["id", "name", "school_type"],
                      order: [["name", orderDir]],
                    },
                    {
                      model: Grievance,
                      required: innerSearchCondition == null ? true : false,
                      attributes: ["id", "asset_id"],
                      include: [
                        {
                          model: Asset,
                          attributes: ["id", "model"],
                          required: innerSearchCondition == null ? true : false,
                          where:
                            innerSearchCondition == null &&
                            secondinnerSearchCondition != null
                              ? { model: { [Op.like]: `%${searchValue}%` } }
                              : {},
                          include: [
                            {
                              model: AssetType,
                              attributes: ["id", "name"],
                              required: innerSearchCondition == null ? true : false,
                              where:
                                secondinnerSearchCondition == null
                                  ? { name: { [Op.like]: `%${searchValue}%` } }
                                  : {},
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  where:
                        req.body.from != null &&
                        req.body.to != null &&
                        req.body.date == 2
                      ? {
                          date: {
                            [Op.and]: {
                              [Op.between]: [req.body.from, req.body.to],
                              [Op.gt]: moment().format("YYYY-MM-DD"),
                            },
                          },grievance_id: {[Op.not]: null}, school_id: user.school_id
                        }
                      : req.body.from != null &&
                        req.body.to != null &&
                        req.body.date == 1
                      ? {
                          date: {
                            [Op.and]: {
                              [Op.between]: [req.body.from, req.body.to],
                              [Op.eq]: moment().format("YYYY-MM-DD"),
                            },
                          },grievance_id: {[Op.not]: null}, school_id: user.school_id
                        }
                      : req.body.from != null &&
                        req.body.to != null &&
                        req.body.date == 3
                      ? {
                          date: {
                            [Op.and]: {
                              [Op.between]: [req.body.from, req.body.to],
                              [Op.lt]: moment().format("YYYY-MM-DD"),
                            },
                          },
                          arrival: { [Op.is]: null },
                          departure: { [Op.is]: null },grievance_id: {[Op.not]: null}, school_id: user.school_id
                        }
                      : req.body.from != null &&
                        req.body.to != null &&
                        req.body.date == 4
                      ? {
                          date: {
                            [Op.and]: {
                              [Op.between]: [req.body.from, req.body.to],
                              [Op.lt]: moment().format("YYYY-MM-DD"),
                            },
                          },
                          arrival: { [Op.not]: null },
                          departure: { [Op.not]: null },grievance_id: {[Op.not]: null}, school_id: user.school_id
                        }
                      
                      : req.body.from != null &&
                        req.body.to != null &&
                        outerSearchCondition != null
                      ? {
                          date: { [Op.between]: [req.body.from, req.body.to] },
                          ...searchCondition,grievance_id: {[Op.not]: null}, school_id: user.school_id
                        }
                     
                      : req.body.from != null && req.body.to != null
                      ? { date: { [Op.between]: [req.body.from, req.body.to] },grievance_id: {[Op.not]: null}, school_id: user.school_id }
                      
                      
                      : outerSearchCondition != null
                      ? { ...searchCondition,grievance_id: {[Op.not]: null}, school_id: user.school_id }
                      
                      
                      
                      : outerSearchCondition != null && req.body.date == 2
                      ? {
                          date: { [Op.gt]: moment().format("YYYY-MM-DD") },
                          ...searchCondition,grievance_id: {[Op.not]: null}, school_id: user.school_id
                        }
                      : outerSearchCondition != null && req.body.date == 1
                      ? {
                          date: { [Op.eq]: moment().format("YYYY-MM-DD") },
                          ...searchCondition,grievance_id: {[Op.not]: null}, school_id: user.school_id
                        }
                      : outerSearchCondition != null && req.body.date == 3
                      ? {
                          date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                          arrival: { [Op.is]: null },
                          departure: { [Op.is]: null },
                          ...searchCondition,grievance_id: {[Op.not]: null}, school_id: user.school_id
                        }
                      : outerSearchCondition != null && req.body.date == 4
                      ? {
                          date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                          arrival: { [Op.not]: null },
                          departure: { [Op.not]: null },
                          ...searchCondition,grievance_id: {[Op.not]: null}, school_id: user.school_id
                        }
                      : req.body.date == 1
                      ? { date: { [Op.eq]: moment().format("YYYY-MM-DD") },grievance_id: {[Op.not]: null}, school_id: user.school_id }
                      : req.body.date == 2
                      ? { date: { [Op.gt]: moment().format("YYYY-MM-DD") },grievance_id: {[Op.not]: null}, school_id: user.school_id }
                      : req.body.date == 3
                      ? {
                          date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                          arrival: { [Op.is]: null },
                          departure: { [Op.is]: null },grievance_id: {[Op.not]: null}, school_id: user.school_id
                        }
                      : req.body.date == 4
                      ? {
                          date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                          arrival: { [Op.not]: null },
                          departure: { [Op.not]: null },grievance_id: {[Op.not]: null}, school_id: user.school_id
                        }
                      : {grievance_id: {[Op.not]: null}, school_id: user.school_id},
                  order: [[orderColumnName, orderDir]],
                  offset: start,
                  limit: length,
                });
      
                let data = {};
                if (rows.length > 0) {
                  data =
                    rows &&
                    rows.map((data: any) => ({
                      id: data.id,
                      date: data.date,
                      type: user.user_type,
                      name: data.dataValues.School
                        ? data.dataValues.School.dataValues.name
                        : "-- --",
                      school_type: data.dataValues.School
                        ? data.dataValues.School.dataValues.school_type
                        : "-- --",
                      service_engineer: data.dataValues.User
                        ? data.dataValues.User.dataValues.user_name
                        : "-- --",
                      phone: data.dataValues.User
                        ? data.dataValues.User.dataValues.phone
                        : "-- --",
                        arrival: data.dataValues.Attendances[0]
                        ? data.dataValues.Attendances[0] &&
                          data.dataValues.Attendances[0].dataValues.check_in
                        : "-- --",
                      departure: data.dataValues.Attendances[0]
                        ? data.dataValues.Attendances[0] &&
                          data.dataValues.Attendances[0].dataValues.check_out
                        : "-- --",
                      status: data.dataValues.Attendances[0]
                      ? data.dataValues.Attendances[0] &&
                        data.dataValues.Attendances[0].dataValues.status
                        : "-- --",
                      model: data.dataValues.Grievance
                        ? data.dataValues.Grievance.dataValues.Asset &&
                          data.dataValues.Grievance.dataValues.Asset.dataValues.model
                        : "",
                      asset: data.dataValues.Grievance
                        ? data.dataValues.Grievance.dataValues.Asset &&
                          data.dataValues.Grievance.dataValues.Asset.dataValues
                            .AssetType &&
                          data.dataValues.Grievance.dataValues.Asset.dataValues
                            .AssetType.dataValues.name
                        : "-- --",
                        visited_date: data.dataValues.visited_date != null ?  data.dataValues.visited_date : '',
                    }));
                }

                const excelData = await SchoolVisit.findAll({
                  include: [
                    {
                      model: User,
                      required: true,
                      attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
                      where:
                        outerSearchCondition == null && innerSearchCondition != null
                          ? { user_name: { [Op.like]: `%${searchValue}%` } }
                          : {},
                      order: [["user_name", orderDir]],
                    },
                    {
                      model: Attendance,
                      required: false,
                      attributes: ["id", "check_in", "check_out", "status"],
                      order: [
                        ["check_in", orderDir],
                        ["check_out", orderDir],
                        ["status", orderDir],
                      ],
                    },
                    {
                      model: School,
                      required: false,
                      attributes: ["id", "name", "school_type"],
                      order: [["name", orderDir]],
                    },
                  
                  ],
                  where:{grievance_id: {[Op.not]: null}, school_id: user.school_id},
                  order: [[orderColumnName, orderDir]]
                });
                let dataForExcel:any;
                if(excelData.length > 0){
                  dataForExcel = excelData.map((data: any) => ({
                    // id: data.id,
                    date: data.date,
                    type: 
                    user.user_type == 1
                      ? "Admin"
                      : user.user_type == 2
                      ? "OEM"
                      : user.user_type == 3
                      ? "School View"
                      : user.user_type == 4
                      ? "Service Engineer"
                      : user.user_type == 5
                      ? "Help Desk"
                      : "Management",
                    name: data.dataValues.School
                      ? data.dataValues.School.dataValues.name
                      : "-- --",
                    school_type: data.dataValues.School?.dataValues.school_type == 1 ? "Elementary" : "Secondary",
                    service_engineer: data.dataValues.User
                      ? data.dataValues.User.dataValues.user_name
                      : "-- --",
                    phone: data.dataValues.User
                      ? data.dataValues.User.dataValues.phone
                      : "-- --",
                    arrival: data.dataValues.Attendances[0]
                      ? data.dataValues.Attendances[0] &&
                        data.dataValues.Attendances[0].dataValues.check_in
                      : "-- --",
                    departure: data.dataValues.Attendances[0]
                      ? data.dataValues.Attendances[0] &&
                        data.dataValues.Attendances[0].dataValues.check_out
                      : "-- --",
                    status: data.dataValues.Attendances[0]?.dataValues.status == 1 ? 'Working Fine' : data.dataValues.Attendances[0]?.dataValues.status == 2 ? 'Issue':data.dataValues.Attendances[0]?.dataValues.status == 3 ? 'Unresolved' : data.dataValues.Attendances[0]?.dataValues.status == 4 ? 'Resolved' : "-- --",
                    model: data.dataValues.Grievance
                      ? data.dataValues.Grievance.dataValues.Asset &&
                        data.dataValues.Grievance.dataValues.Asset.dataValues.model
                      : "",
                    asset: data.dataValues.Grievance
                      ? data.dataValues.Grievance.dataValues.Asset &&
                        data.dataValues.Grievance.dataValues.Asset.dataValues
                          .AssetType &&
                        data.dataValues.Grievance.dataValues.Asset.dataValues
                          .AssetType.dataValues.name
                      : "-- --",
                      visited_date: data.dataValues.visited_date != null ?  data.dataValues.visited_date : '',
                  }));
                }
                res.json({
                  draw: draw,
                  recordsTotal: count,
                  recordsFiltered: count,
                  data: data,
                  searchCondition: searchCondition,
                  searchValue: searchValue,
                  excel: dataForExcel
                });
              }
            }
           
        } else if (user.user_type == 4) {
          let searchCondition = {};
          if (searchValue) {
            searchCondition = {
              date: { [Op.like]: `%${searchValue}%` },
            };
          }
          let outerSearchResults = await SchoolVisit.findAll({
            attributes: ["id", "date"],
            where:
              searchValue !== null
                ? { date: { [Op.like]: `%${searchValue}%` } }
                : {},
          });
          let outerSearchCondition =
            outerSearchResults.length > 0 ? { [Op.not]: null } : null;

          let innerSearchResults = await SchoolVisit.findAll({
            include: [
              {
                model: User,
                required: true,
                attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
                where:
                  outerSearchCondition == null
                    ? { user_name: { [Op.like]: `%${searchValue}%` } }
                    : {},
                order: [["user_name", orderDir]],
              },
            ],
          });
          let innerSearchCondition =
            innerSearchResults.length > 0 ? { [Op.not]: null } : null;

          let secondinnerSearchResults = await SchoolVisit.findAll({
            include: [
              {
                model: Grievance,
                required: innerSearchCondition == null ? true : false,
                attributes: ["id", "asset_id"],
                include: [
                  {
                    model: Asset,
                    attributes: ["id", "model"],
                    required: innerSearchCondition == null ? true : false,
                    where:
                      innerSearchCondition == null
                        ? { model: { [Op.like]: `%${searchValue}%` } }
                        : {},
                  },
                ],
              },
            ],
          });
          let secondinnerSearchCondition =
            secondinnerSearchResults.length > 0 ? { [Op.not]: null } : null;
if(req.body.type == 1){
  if( req.body.tab == 1){
    const { count, rows }: any = await SchoolVisit.findAndCountAll({
      include: [
        {
          model: User,
          required: true,
          attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
          where:
            outerSearchCondition == null && innerSearchCondition != null
              ? { user_name: { [Op.like]: `%${searchValue}%` }, id: decodedToken.id }
              : {},
          order: [["user_name", orderDir]],
        },
        {
          model: Attendance,
          required: false,
          attributes: ["id", "check_in", "check_out", "status"],
          order: [
            ["check_in", orderDir],
            ["check_out", orderDir],
            ["status", orderDir],
          ],
        },
        {
          model: School,
          required: false,
          attributes: ["id", "name", "school_type"],
          order: [["name", orderDir]],
        },
        
      ],
      where:
        outerSearchCondition != null
          ? {
            [Op.and]: [
              literal(`DATE(SchoolVisit.date) = '${currentDate}'`), // Compare only the date part
              {grievance_id:{ [Op.is]: null}, ...searchCondition}
            ]}
          : {[Op.and]: [
            literal(`DATE(SchoolVisit.date) = '${currentDate}'`), // Compare only the date part
            {grievance_id:{ [Op.is]: null}}
          ]},
      order: [["date", orderDir]],
      offset: start,
      limit: length,
    });
    const excelData = await SchoolVisit.findAll({
      include: [
        {
          model: User,
          required: true,
          attributes: ["id", "user_name", "phone", "user_type"], 
          where:{id: decodedToken.id },           
          order: [["user_name", orderDir]],
        },
        {
          model: Attendance,
          required: false,
          attributes: ["id", "check_in", "check_out", "status"],
          order: [
            ["check_in", orderDir],
            ["check_out", orderDir],
            ["status", orderDir],
          ],
        },
        {
          model: School,
          required: false,
          attributes: ["id", "name", "school_type"],
          order: [["name", orderDir]],
        },
        
      ],
      where:{ grievance_id: { [Op.is]: null } },
      order: [[orderColumnName, orderDir]],
    });
    let dataForExcel:any;
    if(excelData.length > 0){
      dataForExcel = excelData.map((data: any) => ({
        // id: data.id,
        date: data.date,
        type: 
        user.user_type == 1
          ? "Admin"
          : user.user_type == 2
          ? "OEM"
          : user.user_type == 3
          ? "School View"
          : user.user_type == 4
          ? "Service Engineer"
          : user.user_type == 5
          ? "Help Desk"
          : "Management",
        name: data.dataValues.School
          ? data.dataValues.School.dataValues.name
          : "-- --",
        school_type: data.dataValues.School?.dataValues.school_type == 1 ? "Elementary" : "Secondary",
        service_engineer: data.dataValues.User
          ? data.dataValues.User.dataValues.user_name
          : "-- --",
        phone: data.dataValues.User
          ? data.dataValues.User.dataValues.phone
          : "-- --",
        arrival: data.dataValues.Attendances[0]
          ? data.dataValues.Attendances[0] &&
            data.dataValues.Attendances[0].dataValues.check_in
          : "-- --",
        departure: data.dataValues.Attendances[0]
          ? data.dataValues.Attendances[0] &&
            data.dataValues.Attendances[0].dataValues.check_out
          : "-- --",
        status: data.dataValues.Attendances[0]?.dataValues.status == 1 ? 'Working Fine' : data.dataValues.Attendances[0]?.dataValues.status == 2 ? 'Issue':data.dataValues.Attendances[0]?.dataValues.status == 3 ? 'Unresolved' : data.dataValues.Attendances[0]?.dataValues.status == 4 ? 'Resolved' : "-- --",
        model: data.dataValues.Grievance
          ? data.dataValues.Grievance.dataValues.Asset &&
            data.dataValues.Grievance.dataValues.Asset.dataValues.model
          : "",
        asset: data.dataValues.Grievance
          ? data.dataValues.Grievance.dataValues.Asset &&
            data.dataValues.Grievance.dataValues.Asset.dataValues
              .AssetType &&
            data.dataValues.Grievance.dataValues.Asset.dataValues
              .AssetType.dataValues.name
          : "-- --",
          visited_date: data.dataValues.visited_date != null ?  data.dataValues.visited_date : '',
      }));
    }
    let data: any;
    let obj: any = {};
    if (rows.length > 0) {
      data = rows.map((data: any) => {
        if (data.User != null) {
          // console.log(data.dataValues.Attendances[0] && data.dataValues.Attendances[0].check_in)
          obj = {
            id: data.id,
            date: data.date,
            type: user.user_type,
            name: data.dataValues.School
              ? data.dataValues.School.dataValues.name
              : "-- --",
            school_type: data.dataValues.School
              ? data.dataValues.School.dataValues.school_type
              : "-- --",
            service_engineer: data.dataValues.User
              ? data.dataValues.User.dataValues.user_name
              : "-- --",
            phone: data.dataValues.User
              ? data.dataValues.User.dataValues.phone
              : "-- --",
            arrival: data.dataValues.Attendances[0]
              ? data.dataValues.Attendances[0] &&
                data.dataValues.Attendances[0].check_in
              : "-- --",
            departure: data.dataValues.Attendances[0]
              ? data.dataValues.Attendances[0] &&
                data.dataValues.Attendances[0].check_out
              : "-- --",
            status: data.dataValues.Attendances[0]
              ? data.dataValues.Attendances[0] &&
                data.dataValues.Attendances[0].status
              : "-- --",
            model: data.dataValues.Grievance
              ? data.dataValues.Grievance.dataValues.Asset &&
                data.dataValues.Grievance.dataValues.Asset.dataValues
                  .model
              : "",
            asset: data.dataValues.Grievance
              ? data.dataValues.Grievance.dataValues.Asset &&
                data.dataValues.Grievance.dataValues.Asset.dataValues
                  .AssetType &&
                data.dataValues.Grievance.dataValues.Asset.dataValues
                  .AssetType.dataValues.name
              : "-- --",
              visited_date: data.dataValues.visited_date != null ?  data.dataValues.visited_date : '',
          };
        }
        return obj;
      });
    }

    res.json({
      draw: draw,
      recordsTotal: count,
      recordsFiltered: count,
      data: data,
      excel: dataForExcel
    });

  }else{
    const { count, rows }: any = await SchoolVisit.findAndCountAll({
      include: [
        {
          model: User,
          required: true,
          attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
          where:
            outerSearchCondition == null && innerSearchCondition != null
              ? { user_name: { [Op.like]: `%${searchValue}%` }, id: decodedToken.id }
              : {},
          order: [["user_name", orderDir]],
        },
        {
          model: Attendance,
          required: false,
          attributes: ["id", "check_in", "check_out", "status"],
          order: [
            ["check_in", orderDir],
            ["check_out", orderDir],
            ["status", orderDir],
          ],
        },
        {
          model: School,
          required: false,
          attributes: ["id", "name", "school_type"],
          order: [["name", orderDir]],
        },
        {
          model: Grievance,
          required: innerSearchCondition == null ? true : false,
          attributes: ["id", "asset_id"],
          include: [
            {
              model: Asset,
              attributes: ["id", "model"],
              required: innerSearchCondition == null ? true : false,
              where:
                innerSearchCondition == null &&
                secondinnerSearchCondition != null
                  ? { model: { [Op.like]: `%${searchValue}%` } }
                  : {},
              include: [
                {
                  model: AssetType,
                  attributes: ["id", "name"],
                  required: innerSearchCondition == null ? true : false,
                  where:
                    secondinnerSearchCondition == null
                      ? { name: { [Op.like]: `%${searchValue}%` } }
                      : {},
                },
              ],
            },
          ],
        },
      ],
      where:
        outerSearchCondition != null
          ? {
            [Op.and]: [
              literal(`DATE(SchoolVisit.date) = '${currentDate}'`), // Compare only the date part
              {grievance_id: {[Op.not]: null},...searchCondition}
            ],
            }
          : {[Op.and]: [
            literal(`DATE(SchoolVisit.date) = '${currentDate}'`), // Compare only the date part
            {grievance_id: {[Op.not]: null}}
          ]},
      order: [["date", orderDir]],
      offset: start,
      limit: length,
    });

    let data: any;
    let obj: any = {};
    if (rows.length > 0) {
      data = rows.map((data: any) => {
        if (data.User != null) {
          // console.log(data.dataValues.Attendances[0] && data.dataValues.Attendances[0].check_in)
          obj = {
            id: data.id,
            date: data.date,
            type: user.user_type,
            name: data.dataValues.School
              ? data.dataValues.School.dataValues.name
              : "-- --",
            school_type: data.dataValues.School
              ? data.dataValues.School.dataValues.school_type
              : "-- --",
            service_engineer: data.dataValues.User
              ? data.dataValues.User.dataValues.user_name
              : "-- --",
            phone: data.dataValues.User
              ? data.dataValues.User.dataValues.phone
              : "-- --",
            arrival: data.dataValues.Attendances[0]
              ? data.dataValues.Attendances[0] &&
                data.dataValues.Attendances[0].check_in
              : "-- --",
            departure: data.dataValues.Attendances[0]
              ? data.dataValues.Attendances[0] &&
                data.dataValues.Attendances[0].check_out
              : "-- --",
            status: data.dataValues.Attendances[0]
              ? data.dataValues.Attendances[0] &&
                data.dataValues.Attendances[0].status
              : "-- --",
            model: data.dataValues.Grievance
              ? data.dataValues.Grievance.dataValues.Asset &&
                data.dataValues.Grievance.dataValues.Asset.dataValues
                  .model
              : "",
            asset: data.dataValues.Grievance
              ? data.dataValues.Grievance.dataValues.Asset &&
                data.dataValues.Grievance.dataValues.Asset.dataValues
                  .AssetType &&
                data.dataValues.Grievance.dataValues.Asset.dataValues
                  .AssetType.dataValues.name
              : "-- --",
              visited_date: data.dataValues.visited_date != null ?  data.dataValues.visited_date : '',
          };
        }
        return obj;
      });
    }
    const excelData = await SchoolVisit.findAll({
      include: [
        {
          model: User,
          required: true,
          attributes: ["id", "user_name", "phone", "user_type"], 
          where:{id: decodedToken.id },           
          order: [["user_name", orderDir]],
        },
        {
          model: Attendance,
          required: false,
          attributes: ["id", "check_in", "check_out", "status"],
          order: [
            ["check_in", orderDir],
            ["check_out", orderDir],
            ["status", orderDir],
          ],
        },
        {
          model: School,
          required: false,
          attributes: ["id", "name", "school_type"],
          order: [["name", orderDir]],
        },
        
      ],
      where:{ grievance_id: { [Op.not]: null } },
      order: [[orderColumnName, orderDir]],
    });
    let dataForExcel:any;
    if(excelData.length > 0){
      dataForExcel = excelData.map((data: any) => ({
        // id: data.id,
        date: data.date,
        type: 
        user.user_type == 1
          ? "Admin"
          : user.user_type == 2
          ? "OEM"
          : user.user_type == 3
          ? "School View"
          : user.user_type == 4
          ? "Service Engineer"
          : user.user_type == 5
          ? "Help Desk"
          : "Management",
        name: data.dataValues.School
          ? data.dataValues.School.dataValues.name
          : "-- --",
        school_type: data.dataValues.School?.dataValues.school_type == 1 ? "Elementary" : "Secondary",
        service_engineer: data.dataValues.User
          ? data.dataValues.User.dataValues.user_name
          : "-- --",
        phone: data.dataValues.User
          ? data.dataValues.User.dataValues.phone
          : "-- --",
        arrival: data.dataValues.Attendances[0]
          ? data.dataValues.Attendances[0] &&
            data.dataValues.Attendances[0].dataValues.check_in
          : "-- --",
        departure: data.dataValues.Attendances[0]
          ? data.dataValues.Attendances[0] &&
            data.dataValues.Attendances[0].dataValues.check_out
          : "-- --",
        status: data.dataValues.Attendances[0]?.dataValues.status == 1 ? 'Working Fine' : data.dataValues.Attendances[0]?.dataValues.status == 2 ? 'Issue':data.dataValues.Attendances[0]?.dataValues.status == 3 ? 'Unresolved' : data.dataValues.Attendances[0]?.dataValues.status == 4 ? 'Resolved' : "-- --",
        model: data.dataValues.Grievance
          ? data.dataValues.Grievance.dataValues.Asset &&
            data.dataValues.Grievance.dataValues.Asset.dataValues.model
          : "",
        asset: data.dataValues.Grievance
          ? data.dataValues.Grievance.dataValues.Asset &&
            data.dataValues.Grievance.dataValues.Asset.dataValues
              .AssetType &&
            data.dataValues.Grievance.dataValues.Asset.dataValues
              .AssetType.dataValues.name
          : "-- --",
          visited_date: data.dataValues.visited_date != null ?  data.dataValues.visited_date : '',
      }));
    }
    res.json({
      draw: draw,
      recordsTotal: count,
      recordsFiltered: count,
      data: data,
      excel: dataForExcel
    });
  }
}else{
  if( req.body.tab == 1){
    const { count, rows }: any = await SchoolVisit.findAndCountAll({
      include: [
        {
          model: User,
          required: true,
          attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
          where:
            outerSearchCondition == null && innerSearchCondition != null
              ? { user_name: { [Op.like]: `%${searchValue}%` }, id: decodedToken.id }
              : {},
          order: [["user_name", orderDir]],
        },
        {
          model: Attendance,
          required: false,
          attributes: ["id", "check_in", "check_out", "status"],
          order: [
            ["check_in", orderDir],
            ["check_out", orderDir],
            ["status", orderDir],
          ],
        },
        {
          model: School,
          required: false,
          attributes: ["id", "name", "school_type"],
          order: [["name", orderDir]],
        },
        
      ],
      where:
        req.body.from != null &&
        req.body.to != null &&
        req.body.schoolId &&
        outerSearchCondition != null &&
        req.body.date == 2
          ? {
              date: {
                [Op.and]: {
                  [Op.between]: [req.body.from, req.body.to],
                  [Op.gt]: moment().format("YYYY-MM-DD"),
                },
              },
              school_id: req.body.schoolId,
              ...searchCondition,
              grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id
            }
          : req.body.from != null &&
            req.body.to != null &&
            req.body.schoolId &&
            outerSearchCondition != null &&
            req.body.date == 1
          ? {
              date: {
                [Op.and]: {
                  [Op.between]: [req.body.from, req.body.to],
                  [Op.eq]: moment().format("YYYY-MM-DD"),
                },
              },
              school_id: req.body.schoolId,
              ...searchCondition,
              grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id

            }
          : req.body.from != null &&
            req.body.to != null &&
            req.body.schoolId &&
            outerSearchCondition != null &&
            req.body.date == 3
          ? {
              date: {
                [Op.and]: {
                  [Op.between]: [req.body.from, req.body.to],
                  [Op.lt]: moment().format("YYYY-MM-DD"),
                },
              },
              arrival: { [Op.is]: null },
              departure: { [Op.is]: null },
              school_id: req.body.schoolId,
              ...searchCondition,
              grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id
            }
          : req.body.from != null &&
            req.body.to != null &&
            req.body.schoolId &&
            outerSearchCondition != null &&
            req.body.date == 4
          ? {
              date: {
                [Op.and]: {
                  [Op.between]: [req.body.from, req.body.to],
                  [Op.lt]: moment().format("YYYY-MM-DD"),
                },
              },
              arrival: { [Op.not]: null },
              departure: { [Op.not]: null },
              school_id: req.body.schoolId,
              ...searchCondition,
              grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id
            }
          : req.body.from != null &&
            req.body.to != null &&
            req.body.schoolId &&
            outerSearchCondition != null &&
            req.body.date == 2
          ? {
              date: {
                [Op.and]: {
                  [Op.between]: [req.body.from, req.body.to],
                  [Op.gt]: moment().format("YYYY-MM-DD"),
                },
              },
              school_id: req.body.schoolId,
              grievance_id:{ [Op.is]: null}, ...searchCondition,
              service_engineer: decodedToken.id
            }
          : req.body.from != null &&
            req.body.to != null &&
            req.body.schoolId &&
            req.body.date == 1
          ? {
              date: {
                [Op.and]: {
                  [Op.between]: [req.body.from, req.body.to],
                  [Op.eq]: moment().format("YYYY-MM-DD"),
                },
              },
              school_id: req.body.schoolId,
              grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id
            }
          : req.body.from != null &&
            req.body.to != null &&
            req.body.schoolId &&
            req.body.date == 3
          ? {
              date: {
                [Op.and]: {
                  [Op.between]: [req.body.from, req.body.to],
                  [Op.lt]: moment().format("YYYY-MM-DD"),
                },
              },
              arrival: { [Op.is]: null },
              departure: { [Op.is]: null },
              school_id: req.body.schoolId,
              grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id
            }
          : req.body.from != null &&
            req.body.to != null &&
            req.body.schoolId &&
            req.body.date == 4
          ? {
              date: {
                [Op.and]: {
                  [Op.between]: [req.body.from, req.body.to],
                  [Op.lt]: moment().format("YYYY-MM-DD"),
                },
              },
              arrival: { [Op.not]: null },
              departure: { [Op.not]: null },
              school_id: req.body.schoolId,
              grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id
            }
          : req.body.from != null &&
            req.body.to != null &&
            req.body.date == 2
          ? {
              date: {
                [Op.and]: {
                  [Op.between]: [req.body.from, req.body.to],
                  [Op.gt]: moment().format("YYYY-MM-DD"),
                },
              },
              grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id
            }
          : req.body.from != null &&
            req.body.to != null &&
            req.body.date == 1
          ? {
              date: {
                [Op.and]: {
                  [Op.between]: [req.body.from, req.body.to],
                  [Op.eq]: moment().format("YYYY-MM-DD"),
                },
              },
              grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id
            }
          : req.body.from != null &&
            req.body.to != null &&
            req.body.date == 3
          ? {
              date: {
                [Op.and]: {
                  [Op.between]: [req.body.from, req.body.to],
                  [Op.lt]: moment().format("YYYY-MM-DD"),
                },
              },
              arrival: { [Op.is]: null },
              departure: { [Op.is]: null },
              grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id
            }
          : req.body.from != null &&
            req.body.to != null &&
            req.body.date == 4
          ? {
              date: {
                [Op.and]: {
                  [Op.between]: [req.body.from, req.body.to],
                  [Op.lt]: moment().format("YYYY-MM-DD"),
                },
              },
              arrival: { [Op.not]: null },
              departure: { [Op.not]: null },
              grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id
            }
          : req.body.from != null &&
            req.body.to != null &&
            req.body.schoolId &&
            outerSearchCondition != null
          ? {
              date: { [Op.between]: [req.body.from, req.body.to] },
              school_id: req.body.schoolId,
              ...searchCondition,
              grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id
            }
          : req.body.from != null &&
            req.body.to != null &&
            outerSearchCondition != null
          ? {
              date: { [Op.between]: [req.body.from, req.body.to] },
              ...searchCondition,grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id
            }
          : req.body.from != null &&
            req.body.to != null &&
            req.body.schoolId
          ? {
              date: { [Op.between]: [req.body.from, req.body.to] },
              school_id: req.body.schoolId,grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id
            }
          : req.body.from != null && req.body.to != null
          ? { date: { [Op.between]: [req.body.from, req.body.to] } , grievance_id:{ [Op.is]: null},
          service_engineer: decodedToken.id}
          : req.body.type == 1 && req.body.schoolId
          ? {
              date: { [Op.eq]: moment().format("YYYY-MM-DD") },
              school_id: req.body.schoolId,grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id
            }
          : req.body.schoolId &&
            outerSearchCondition != null &&
            req.body.date == 2
          ? {
              date: { [Op.gt]: moment().format("YYYY-MM-DD") },
              school_id: req.body.schoolId,
              ...searchCondition,grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id
            }
          : req.body.schoolId &&
            outerSearchCondition != null &&
            req.body.date == 1
          ? {
              date: { [Op.eq]: moment().format("YYYY-MM-DD") },
              school_id: req.body.schoolId,
              ...searchCondition,grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id
            }
          : req.body.schoolId &&
            outerSearchCondition != null &&
            req.body.date == 3
          ? {
              date: { [Op.lt]: moment().format("YYYY-MM-DD") },
              arrival: { [Op.is]: null },
              departure: { [Op.is]: null },
              school_id: req.body.schoolId,
              ...searchCondition,grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id
            }
          : req.body.schoolId &&
            outerSearchCondition != null &&
            req.body.date == 4
          ? {
              date: { [Op.lt]: moment().format("YYYY-MM-DD") },
              arrival: { [Op.not]: null },
              departure: { [Op.not]: null },
              school_id: req.body.schoolId,
              ...searchCondition,grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id
            }
          : req.body.schoolId && outerSearchCondition != null
          ? { school_id: req.body.schoolId, ...searchCondition ,grievance_id:{ [Op.is]: null},
          service_engineer: decodedToken.id}
          : outerSearchCondition != null
          ? { ...searchCondition,grievance_id:{ [Op.is]: null},
          service_engineer: decodedToken.id }
          : req.body.schoolId
          ? { school_id: req.body.schoolId,grievance_id:{ [Op.is]: null},
          service_engineer: decodedToken.id }
          : req.body.schoolId && req.body.date == 2
          ? {
              date: { [Op.gt]: moment().format("YYYY-MM-DD") },
              school_id: req.body.schoolId, grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id
            }
          : req.body.schoolId && req.body.date == 1
          ? {
              date: { [Op.eq]: moment().format("YYYY-MM-DD") },
              school_id: req.body.schoolId,grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id
            }
          : req.body.schoolId && req.body.date == 3
          ? {
              date: { [Op.lt]: moment().format("YYYY-MM-DD") },
              arrival: { [Op.is]: null },
              departure: { [Op.is]: null },
              school_id: req.body.schoolId,grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id
            }
          : req.body.schoolId && req.body.date == 4
          ? {
              date: { [Op.lt]: moment().format("YYYY-MM-DD") },
              arrival: { [Op.not]: null },
              departure: { [Op.not]: null },
              school_id: req.body.schoolId,grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id
            }
          : outerSearchCondition != null && req.body.date == 2
          ? {
              date: { [Op.gt]: moment().format("YYYY-MM-DD") },
              ...searchCondition,grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id
            }
          : outerSearchCondition != null && req.body.date == 1
          ? {
              date: { [Op.eq]: moment().format("YYYY-MM-DD") },
              ...searchCondition,grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id
            }
          : outerSearchCondition != null && req.body.date == 3
          ? {
              date: { [Op.lt]: moment().format("YYYY-MM-DD") },
              arrival: { [Op.is]: null },
              departure: { [Op.is]: null },
              ...searchCondition,grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id
            }
          : outerSearchCondition != null && req.body.date == 4
          ? {
              date: { [Op.lt]: moment().format("YYYY-MM-DD") },
              arrival: { [Op.not]: null },
              departure: { [Op.not]: null },
              ...searchCondition,grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id
            }
          : req.body.date == 1
          ? { date: { [Op.eq]: moment().format("YYYY-MM-DD") }, grievance_id:{ [Op.is]: null},
          service_engineer: decodedToken.id}
          : req.body.date == 2
          ? { date: { [Op.gt]: moment().format("YYYY-MM-DD") },grievance_id:{ [Op.is]: null},
          service_engineer: decodedToken.id }
          : req.body.date == 3
          ? {
              date: { [Op.lt]: moment().format("YYYY-MM-DD") },
              arrival: { [Op.is]: null },
              departure: { [Op.is]: null },grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id
            }
          : req.body.date == 4
          ? {
              date: { [Op.lt]: moment().format("YYYY-MM-DD") },
              arrival: { [Op.not]: null },
              departure: { [Op.not]: null },grievance_id:{ [Op.is]: null},
              service_engineer: decodedToken.id
            }
          : {grievance_id:{ [Op.is]: null},service_engineer: decodedToken.id },
      order: [["date", orderDir]],
      offset: start,
      limit: length,
    });

    let data: any;
    let obj: any = {};
    if (rows.length > 0) {
      data = rows.map((data: any) => {
        if (data.User != null) {
          // console.log(data.dataValues.Attendances[0] && data.dataValues.Attendances[0].check_in)
          obj = {
            id: data.id,
            date: data.date,
            type: user.user_type,
            name: data.dataValues.School
              ? data.dataValues.School.dataValues.name
              : "-- --",
            school_type: data.dataValues.School
              ? data.dataValues.School.dataValues.school_type
              : "-- --",
            service_engineer: data.dataValues.User
              ? data.dataValues.User.dataValues.user_name
              : "-- --",
            phone: data.dataValues.User
              ? data.dataValues.User.dataValues.phone
              : "-- --",
            arrival: data.dataValues.Attendances[0]
              ? data.dataValues.Attendances[0] &&
                data.dataValues.Attendances[0].check_in
              : "-- --",
            departure: data.dataValues.Attendances[0]
              ? data.dataValues.Attendances[0] &&
                data.dataValues.Attendances[0].check_out
              : "-- --",
            status: data.dataValues.Attendances[0]
              ? data.dataValues.Attendances[0] &&
                data.dataValues.Attendances[0].status
              : "-- --",
            model: data.dataValues.Grievance
              ? data.dataValues.Grievance.dataValues.Asset &&
                data.dataValues.Grievance.dataValues.Asset.dataValues
                  .model
              : "",
            asset: data.dataValues.Grievance
              ? data.dataValues.Grievance.dataValues.Asset &&
                data.dataValues.Grievance.dataValues.Asset.dataValues
                  .AssetType &&
                data.dataValues.Grievance.dataValues.Asset.dataValues
                  .AssetType.dataValues.name
              : "-- --",
              visited_date: data.dataValues.visited_date != null ?  data.dataValues.visited_date : '',
          };
        }
        return obj;
      });
    }
    const excelData = await SchoolVisit.findAll({
      include: [
        {
          model: User,
          required: true,
          attributes: ["id", "user_name", "phone", "user_type"], 
          where:{id: decodedToken.id },           
          order: [["user_name", orderDir]],
        },
        {
          model: Attendance,
          required: false,
          attributes: ["id", "check_in", "check_out", "status"],
          order: [
            ["check_in", orderDir],
            ["check_out", orderDir],
            ["status", orderDir],
          ],
        },
        {
          model: School,
          required: false,
          attributes: ["id", "name", "school_type"],
          order: [["name", orderDir]],
        },
        
      ],
      where:{ grievance_id: { [Op.is]: null } },
      order: [[orderColumnName, orderDir]],
    });
    let dataForExcel:any;
    if(excelData.length > 0){
      dataForExcel = excelData.map((data: any) => ({
        // id: data.id,
        date: data.date,
        type: 
        user.user_type == 1
          ? "Admin"
          : user.user_type == 2
          ? "OEM"
          : user.user_type == 3
          ? "School View"
          : user.user_type == 4
          ? "Service Engineer"
          : user.user_type == 5
          ? "Help Desk"
          : "Management",
        name: data.dataValues.School
          ? data.dataValues.School.dataValues.name
          : "-- --",
        school_type: data.dataValues.School?.dataValues.school_type == 1 ? "Elementary" : "Secondary",
        service_engineer: data.dataValues.User
          ? data.dataValues.User.dataValues.user_name
          : "-- --",
        phone: data.dataValues.User
          ? data.dataValues.User.dataValues.phone
          : "-- --",
        arrival: data.dataValues.Attendances[0]
          ? data.dataValues.Attendances[0] &&
            data.dataValues.Attendances[0].dataValues.check_in
          : "-- --",
        departure: data.dataValues.Attendances[0]
          ? data.dataValues.Attendances[0] &&
            data.dataValues.Attendances[0].dataValues.check_out
          : "-- --",
        status: data.dataValues.Attendances[0]?.dataValues.status == 1 ? 'Working Fine' : data.dataValues.Attendances[0]?.dataValues.status == 2 ? 'Issue':data.dataValues.Attendances[0]?.dataValues.status == 3 ? 'Unresolved' : data.dataValues.Attendances[0]?.dataValues.status == 4 ? 'Resolved' : "-- --",
        model: data.dataValues.Grievance
          ? data.dataValues.Grievance.dataValues.Asset &&
            data.dataValues.Grievance.dataValues.Asset.dataValues.model
          : "",
        asset: data.dataValues.Grievance
          ? data.dataValues.Grievance.dataValues.Asset &&
            data.dataValues.Grievance.dataValues.Asset.dataValues
              .AssetType &&
            data.dataValues.Grievance.dataValues.Asset.dataValues
              .AssetType.dataValues.name
          : "-- --",
          visited_date: data.dataValues.visited_date != null ?  data.dataValues.visited_date : '',
      }));
    }
    res.json({
      draw: draw,
      recordsTotal: count,
      recordsFiltered: count,
      data: data,
      excel: dataForExcel
    });

  }else{
    const { count, rows }: any = await SchoolVisit.findAndCountAll({
      include: [
        {
          model: User,
          required: true,
          attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
          where:
            outerSearchCondition == null && innerSearchCondition != null
              ? { user_name: { [Op.like]: `%${searchValue}%` }, id: decodedToken.id }
              : {},
          order: [["user_name", orderDir]],
        },
        {
          model: Attendance,
          required: false,
          attributes: ["id", "check_in", "check_out", "status"],
          order: [
            ["check_in", orderDir],
            ["check_out", orderDir],
            ["status", orderDir],
          ],
        },
        {
          model: School,
          required: false,
          attributes: ["id", "name", "school_type"],
          order: [["name", orderDir]],
        },
        {
          model: Grievance,
          required: innerSearchCondition == null ? true : false,
          attributes: ["id", "asset_id"],
          include: [
            {
              model: Asset,
              attributes: ["id", "model"],
              required: innerSearchCondition == null ? true : false,
              where:
                innerSearchCondition == null &&
                secondinnerSearchCondition != null
                  ? { model: { [Op.like]: `%${searchValue}%` } }
                  : {},
              include: [
                {
                  model: AssetType,
                  attributes: ["id", "name"],
                  required: innerSearchCondition == null ? true : false,
                  where:
                    secondinnerSearchCondition == null
                      ? { name: { [Op.like]: `%${searchValue}%` } }
                      : {},
                },
              ],
            },
          ],
        },
      ],
      where:
        req.body.from != null &&
        req.body.to != null &&
        req.body.schoolId &&
        outerSearchCondition != null &&
        req.body.date == 2
          ? {
              date: {
                [Op.and]: {
                  [Op.between]: [req.body.from, req.body.to],
                  [Op.gt]: moment().format("YYYY-MM-DD"),
                },
              },
              school_id: req.body.schoolId,
              ...searchCondition,
              grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : req.body.from != null &&
            req.body.to != null &&
            req.body.schoolId &&
            outerSearchCondition != null &&
            req.body.date == 1
          ? {
              date: {
                [Op.and]: {
                  [Op.between]: [req.body.from, req.body.to],
                  [Op.eq]: moment().format("YYYY-MM-DD"),
                },
              },
              school_id: req.body.schoolId,
              ...searchCondition,
              grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : req.body.from != null &&
            req.body.to != null &&
            req.body.schoolId &&
            outerSearchCondition != null &&
            req.body.date == 3
          ? {
              date: {
                [Op.and]: {
                  [Op.between]: [req.body.from, req.body.to],
                  [Op.lt]: moment().format("YYYY-MM-DD"),
                },
              },
              arrival: { [Op.is]: null },
              departure: { [Op.is]: null },
              school_id: req.body.schoolId,
              ...searchCondition,
              grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : req.body.from != null &&
            req.body.to != null &&
            req.body.schoolId &&
            outerSearchCondition != null &&
            req.body.date == 4
          ? {
              date: {
                [Op.and]: {
                  [Op.between]: [req.body.from, req.body.to],
                  [Op.lt]: moment().format("YYYY-MM-DD"),
                },
              },
              arrival: { [Op.not]: null },
              departure: { [Op.not]: null },
              school_id: req.body.schoolId,
              ...searchCondition,
              grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : req.body.from != null &&
            req.body.to != null &&
            req.body.schoolId &&
            outerSearchCondition != null &&
            req.body.date == 2
          ? {
              date: {
                [Op.and]: {
                  [Op.between]: [req.body.from, req.body.to],
                  [Op.gt]: moment().format("YYYY-MM-DD"),
                },
              },
              school_id: req.body.schoolId,
              grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : req.body.from != null &&
            req.body.to != null &&
            req.body.schoolId &&
            req.body.date == 1
          ? {
              date: {
                [Op.and]: {
                  [Op.between]: [req.body.from, req.body.to],
                  [Op.eq]: moment().format("YYYY-MM-DD"),
                },
              },
              school_id: req.body.schoolId,
              grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : req.body.from != null &&
            req.body.to != null &&
            req.body.schoolId &&
            req.body.date == 3
          ? {
              date: {
                [Op.and]: {
                  [Op.between]: [req.body.from, req.body.to],
                  [Op.lt]: moment().format("YYYY-MM-DD"),
                },
              },
              arrival: { [Op.is]: null },
              departure: { [Op.is]: null },
              school_id: req.body.schoolId,
              grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : req.body.from != null &&
            req.body.to != null &&
            req.body.schoolId &&
            req.body.date == 4
          ? {
              date: {
                [Op.and]: {
                  [Op.between]: [req.body.from, req.body.to],
                  [Op.lt]: moment().format("YYYY-MM-DD"),
                },
              },
              arrival: { [Op.not]: null },
              departure: { [Op.not]: null },
              school_id: req.body.schoolId,
              grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : req.body.from != null &&
            req.body.to != null &&
            req.body.date == 2
          ? {
              date: {
                [Op.and]: {
                  [Op.between]: [req.body.from, req.body.to],
                  [Op.gt]: moment().format("YYYY-MM-DD"),
                },
              },
              grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : req.body.from != null &&
            req.body.to != null &&
            req.body.date == 1
          ? {
              date: {
                [Op.and]: {
                  [Op.between]: [req.body.from, req.body.to],
                  [Op.eq]: moment().format("YYYY-MM-DD"),
                },
              },
              grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : req.body.from != null &&
            req.body.to != null &&
            req.body.date == 3
          ? {
              date: {
                [Op.and]: {
                  [Op.between]: [req.body.from, req.body.to],
                  [Op.lt]: moment().format("YYYY-MM-DD"),
                },
              },
              arrival: { [Op.is]: null },
              departure: { [Op.is]: null },
              grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : req.body.from != null &&
            req.body.to != null &&
            req.body.date == 4
          ? {
              date: {
                [Op.and]: {
                  [Op.between]: [req.body.from, req.body.to],
                  [Op.lt]: moment().format("YYYY-MM-DD"),
                },
              },
              arrival: { [Op.not]: null },
              departure: { [Op.not]: null },
              grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : req.body.from != null &&
            req.body.to != null &&
            req.body.schoolId &&
            outerSearchCondition != null
          ? {
              date: { [Op.between]: [req.body.from, req.body.to] },
              school_id: req.body.schoolId,
              ...searchCondition,
              grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : req.body.from != null &&
            req.body.to != null &&
            outerSearchCondition != null
          ? {
              date: { [Op.between]: [req.body.from, req.body.to] },
              ...searchCondition,grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : req.body.from != null &&
            req.body.to != null &&
            req.body.schoolId
          ? {
              date: { [Op.between]: [req.body.from, req.body.to] },
              school_id: req.body.schoolId,grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : req.body.from != null && req.body.to != null
          ? { date: { [Op.between]: [req.body.from, req.body.to] } , grievance_id: {[Op.not]: null},
          service_engineer: decodedToken.id}
          : req.body.type == 1 && req.body.schoolId
          ? {
              date: { [Op.eq]: moment().format("YYYY-MM-DD") },
              school_id: req.body.schoolId,grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : req.body.schoolId &&
            outerSearchCondition != null &&
            req.body.date == 2
          ? {
              date: { [Op.gt]: moment().format("YYYY-MM-DD") },
              school_id: req.body.schoolId,
              ...searchCondition,grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : req.body.schoolId &&
            outerSearchCondition != null &&
            req.body.date == 1
          ? {
              date: { [Op.eq]: moment().format("YYYY-MM-DD") },
              school_id: req.body.schoolId,
              ...searchCondition,grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : req.body.schoolId &&
            outerSearchCondition != null &&
            req.body.date == 3
          ? {
              date: { [Op.lt]: moment().format("YYYY-MM-DD") },
              arrival: { [Op.is]: null },
              departure: { [Op.is]: null },
              school_id: req.body.schoolId,
              ...searchCondition,grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : req.body.schoolId &&
            outerSearchCondition != null &&
            req.body.date == 4
          ? {
              date: { [Op.lt]: moment().format("YYYY-MM-DD") },
              arrival: { [Op.not]: null },
              departure: { [Op.not]: null },
              school_id: req.body.schoolId,
              ...searchCondition,grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : req.body.schoolId && outerSearchCondition != null
          ? { school_id: req.body.schoolId, ...searchCondition ,grievance_id: {[Op.not]: null},
          service_engineer: decodedToken.id}
          : outerSearchCondition != null
          ? { ...searchCondition,grievance_id: {[Op.not]: null},
          service_engineer: decodedToken.id }
          : req.body.schoolId
          ? { school_id: req.body.schoolId,grievance_id: {[Op.not]: null},
          service_engineer: decodedToken.id }
          : req.body.schoolId && req.body.date == 2
          ? {
              date: { [Op.gt]: moment().format("YYYY-MM-DD") },
              school_id: req.body.schoolId, grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : req.body.schoolId && req.body.date == 1
          ? {
              date: { [Op.eq]: moment().format("YYYY-MM-DD") },
              school_id: req.body.schoolId,grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : req.body.schoolId && req.body.date == 3
          ? {
              date: { [Op.lt]: moment().format("YYYY-MM-DD") },
              arrival: { [Op.is]: null },
              departure: { [Op.is]: null },
              school_id: req.body.schoolId,grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : req.body.schoolId && req.body.date == 4
          ? {
              date: { [Op.lt]: moment().format("YYYY-MM-DD") },
              arrival: { [Op.not]: null },
              departure: { [Op.not]: null },
              school_id: req.body.schoolId,grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : outerSearchCondition != null && req.body.date == 2
          ? {
              date: { [Op.gt]: moment().format("YYYY-MM-DD") },
              ...searchCondition,grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : outerSearchCondition != null && req.body.date == 1
          ? {
              date: { [Op.eq]: moment().format("YYYY-MM-DD") },
              ...searchCondition,grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : outerSearchCondition != null && req.body.date == 3
          ? {
              date: { [Op.lt]: moment().format("YYYY-MM-DD") },
              arrival: { [Op.is]: null },
              departure: { [Op.is]: null },
              ...searchCondition,grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : outerSearchCondition != null && req.body.date == 4
          ? {
              date: { [Op.lt]: moment().format("YYYY-MM-DD") },
              arrival: { [Op.not]: null },
              departure: { [Op.not]: null },
              ...searchCondition,grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : req.body.date == 1
          ? { date: { [Op.eq]: moment().format("YYYY-MM-DD") }, grievance_id: {[Op.not]: null},
          service_engineer: decodedToken.id}
          : req.body.date == 2
          ? { date: { [Op.gt]: moment().format("YYYY-MM-DD") },grievance_id: {[Op.not]: null},
          service_engineer: decodedToken.id }
          : req.body.date == 3
          ? {
              date: { [Op.lt]: moment().format("YYYY-MM-DD") },
              arrival: { [Op.is]: null },
              departure: { [Op.is]: null },grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : req.body.date == 4
          ? {
              date: { [Op.lt]: moment().format("YYYY-MM-DD") },
              arrival: { [Op.not]: null },
              departure: { [Op.not]: null },grievance_id: {[Op.not]: null},
              service_engineer: decodedToken.id
            }
          : {grievance_id: {[Op.not]: null},service_engineer: decodedToken.id },
      order: [["date", orderDir]],
      offset: start,
      limit: length,
    });

    let data: any;
    let obj: any = {};
    if (rows.length > 0) {
      data = rows.map((data: any) => {
        if (data.User != null) {
          // console.log(data.dataValues.Attendances[0] && data.dataValues.Attendances[0].check_in)
          obj = {
            id: data.id,
            date: data.date,
            type: user.user_type,
            name: data.dataValues.School
              ? data.dataValues.School.dataValues.name
              : "-- --",
            school_type: data.dataValues.School
              ? data.dataValues.School.dataValues.school_type
              : "-- --",
            service_engineer: data.dataValues.User
              ? data.dataValues.User.dataValues.user_name
              : "-- --",
            phone: data.dataValues.User
              ? data.dataValues.User.dataValues.phone
              : "-- --",
            arrival: data.dataValues.Attendances[0]
              ? data.dataValues.Attendances[0] &&
                data.dataValues.Attendances[0].check_in
              : "-- --",
            departure: data.dataValues.Attendances[0]
              ? data.dataValues.Attendances[0] &&
                data.dataValues.Attendances[0].check_out
              : "-- --",
            status: data.dataValues.Attendances[0]
              ? data.dataValues.Attendances[0] &&
                data.dataValues.Attendances[0].status
              : "-- --",
            model: data.dataValues.Grievance
              ? data.dataValues.Grievance.dataValues.Asset &&
                data.dataValues.Grievance.dataValues.Asset.dataValues
                  .model
              : "",
            asset: data.dataValues.Grievance
              ? data.dataValues.Grievance.dataValues.Asset &&
                data.dataValues.Grievance.dataValues.Asset.dataValues
                  .AssetType &&
                data.dataValues.Grievance.dataValues.Asset.dataValues
                  .AssetType.dataValues.name
              : "-- --",
              visited_date: data.dataValues.visited_date != null ?  data.dataValues.visited_date : '',
          };
        }
        return obj;
      });
    }
    const excelData = await SchoolVisit.findAll({
      include: [
        {
          model: User,
          required: true,
          attributes: ["id", "user_name", "phone", "user_type"], 
          where:{id: decodedToken.id },           
          order: [["user_name", orderDir]],
        },
        {
          model: Attendance,
          required: false,
          attributes: ["id", "check_in", "check_out", "status"],
          order: [
            ["check_in", orderDir],
            ["check_out", orderDir],
            ["status", orderDir],
          ],
        },
        {
          model: School,
          required: false,
          attributes: ["id", "name", "school_type"],
          order: [["name", orderDir]],
        },
        
      ],
      where:{ grievance_id: { [Op.not]: null } },
      order: [[orderColumnName, orderDir]],
    });
    let dataForExcel:any;
    if(excelData.length > 0){
      dataForExcel = excelData.map((data: any) => ({
        // id: data.id,
        date: data.date,
        type: 
        user.user_type == 1
          ? "Admin"
          : user.user_type == 2
          ? "OEM"
          : user.user_type == 3
          ? "School View"
          : user.user_type == 4
          ? "Service Engineer"
          : user.user_type == 5
          ? "Help Desk"
          : "Management",
        name: data.dataValues.School
          ? data.dataValues.School.dataValues.name
          : "-- --",
        school_type: data.dataValues.School?.dataValues.school_type == 1 ? "Elementary" : "Secondary",
        service_engineer: data.dataValues.User
          ? data.dataValues.User.dataValues.user_name
          : "-- --",
        phone: data.dataValues.User
          ? data.dataValues.User.dataValues.phone
          : "-- --",
        arrival: data.dataValues.Attendances[0]
          ? data.dataValues.Attendances[0] &&
            data.dataValues.Attendances[0].dataValues.check_in
          : "-- --",
        departure: data.dataValues.Attendances[0]
          ? data.dataValues.Attendances[0] &&
            data.dataValues.Attendances[0].dataValues.check_out
          : "-- --",
        status: data.dataValues.Attendances[0]?.dataValues.status == 1 ? 'Working Fine' : data.dataValues.Attendances[0]?.dataValues.status == 2 ? 'Issue':data.dataValues.Attendances[0]?.dataValues.status == 3 ? 'Unresolved' : data.dataValues.Attendances[0]?.dataValues.status == 4 ? 'Resolved' : "-- --",
        model: data.dataValues.Grievance
          ? data.dataValues.Grievance.dataValues.Asset &&
            data.dataValues.Grievance.dataValues.Asset.dataValues.model
          : "",
        asset: data.dataValues.Grievance
          ? data.dataValues.Grievance.dataValues.Asset &&
            data.dataValues.Grievance.dataValues.Asset.dataValues
              .AssetType &&
            data.dataValues.Grievance.dataValues.Asset.dataValues
              .AssetType.dataValues.name
          : "-- --",
          visited_date: data.dataValues.visited_date != null ?  data.dataValues.visited_date : '',
      }));
    }
    res.json({
      draw: draw,
      recordsTotal: count,
      recordsFiltered: count,
      data: data,
      excel: dataForExcel
    });
  }
}
            
        } else if (user.user_type == 5) {
          let searchCondition = {};
          if (searchValue) {
            searchCondition = {
              date: { [Op.like]: `%${searchValue}%` },
            };
          }
          let outerSearchResults = await SchoolVisit.findAll({
            attributes: ["id", "date"],
            where:
              searchValue !== null
                ? { date: { [Op.like]: `%${searchValue}%` } }
                : {},
          });
          let outerSearchCondition =
            outerSearchResults.length > 0 ? { [Op.not]: null } : null;

          let innerSearchResults = await SchoolVisit.findAll({
            include: [
              {
                model: User,
                required: true,
                attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
                where:
                  outerSearchCondition == null
                    ? { user_name: { [Op.like]: `%${searchValue}%` } }
                    : {},
                order: [["user_name", orderDir]],
              },
            ],
          });
          let innerSearchCondition =
            innerSearchResults.length > 0 ? { [Op.not]: null } : null;

          let secondinnerSearchResults = await SchoolVisit.findAll({
            include: [
              {
                model: Grievance,
                required: innerSearchCondition == null ? true : false,
                attributes: ["id", "asset_id"],
                include: [
                  {
                    model: Asset,
                    attributes: ["id", "model"],
                    required: innerSearchCondition == null ? true : false,
                    where:
                      innerSearchCondition == null
                        ? { model: { [Op.like]: `%${searchValue}%` } }
                        : {},
                  },
                ],
              },
            ],
          });
          let secondinnerSearchCondition =
            secondinnerSearchResults.length > 0 ? { [Op.not]: null } : null;
          if (req.body.tab == 1) {
            const { count, rows }: any = await SchoolVisit.findAndCountAll({
              include: [
                {
                  model: User,
                  required: true,
                  attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
                  where:
                    outerSearchCondition == null && innerSearchCondition != null
                      ? { user_name: { [Op.like]: `%${searchValue}%` } }
                      : {},
                  order: [["user_name", orderDir]],
                },
                {
                  model: Attendance,
                  required: false,
                  attributes: ["id", "check_in", "check_out", "status"],
                  order: [
                    ["check_in", orderDir],
                    ["check_out", orderDir],
                    ["status", orderDir],
                  ],
                },
                {
                  model: School,
                  required: false,
                  attributes: ["id", "name", "school_type"],
                  order: [["name", orderDir]],
                },
              ],
              where:
                req.body.from != null &&
                req.body.to != null &&
                req.body.schoolId &&
                outerSearchCondition != null &&
                req.body.date == 2
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.gt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 1
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.eq]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 3
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.lt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      arrival: { [Op.is]: null },
                      departure: { [Op.is]: null },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 4
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.lt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      arrival: { [Op.not]: null },
                      departure: { [Op.not]: null },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 2
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.gt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    req.body.date == 1
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.eq]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    req.body.date == 3
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.lt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      arrival: { [Op.is]: null },
                      departure: { [Op.is]: null },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    req.body.date == 4
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.lt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      arrival: { [Op.not]: null },
                      departure: { [Op.not]: null },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.date == 2
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.gt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.date == 1
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.eq]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.date == 3
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.lt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      arrival: { [Op.is]: null },
                      departure: { [Op.is]: null },
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.date == 4
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.lt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      arrival: { [Op.not]: null },
                      departure: { [Op.not]: null },
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    outerSearchCondition != null
                  ? {
                      date: { [Op.between]: [req.body.from, req.body.to] },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    outerSearchCondition != null
                  ? {
                      date: { [Op.between]: [req.body.from, req.body.to] },
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId
                  ? {
                      date: { [Op.between]: [req.body.from, req.body.to] },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null && req.body.to != null
                  ? {
                      date: { [Op.between]: [req.body.from, req.body.to] },
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.type == 1 && req.body.schoolId
                  ? {
                      date: { [Op.eq]: moment().format("YYYY-MM-DD") },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 2
                  ? {
                      date: { [Op.gt]: moment().format("YYYY-MM-DD") },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 1
                  ? {
                      date: { [Op.eq]: moment().format("YYYY-MM-DD") },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 3
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.is]: null },
                      departure: { [Op.is]: null },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 4
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.not]: null },
                      departure: { [Op.not]: null },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.schoolId && outerSearchCondition != null
                  ? {
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : outerSearchCondition != null
                  ? { ...searchCondition, grievance_id: { [Op.is]: null } }
                  : req.body.schoolId
                  ? {
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.schoolId && req.body.date == 2
                  ? {
                      date: { [Op.gt]: moment().format("YYYY-MM-DD") },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.schoolId && req.body.date == 1
                  ? {
                      date: { [Op.eq]: moment().format("YYYY-MM-DD") },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.schoolId && req.body.date == 3
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.is]: null },
                      departure: { [Op.is]: null },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.schoolId && req.body.date == 4
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.not]: null },
                      departure: { [Op.not]: null },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.is]: null },
                    }
                  : outerSearchCondition != null && req.body.date == 2
                  ? {
                      date: { [Op.gt]: moment().format("YYYY-MM-DD") },
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : outerSearchCondition != null && req.body.date == 1
                  ? {
                      date: { [Op.eq]: moment().format("YYYY-MM-DD") },
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : outerSearchCondition != null && req.body.date == 3
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.is]: null },
                      departure: { [Op.is]: null },
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : outerSearchCondition != null && req.body.date == 4
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.not]: null },
                      departure: { [Op.not]: null },
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.date == 1
                  ? {
                      date: { [Op.eq]: moment().format("YYYY-MM-DD") },
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.date == 2
                  ? {
                      date: { [Op.gt]: moment().format("YYYY-MM-DD") },
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.date == 3
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.is]: null },
                      departure: { [Op.is]: null },
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.date == 4
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.not]: null },
                      departure: { [Op.not]: null },
                      grievance_id: { [Op.is]: null },
                    }
                  : { grievance_id: { [Op.is]: null } },
              order: [[orderColumnName, orderDir]],
              offset: start,
              limit: length,
            });
            let data = {};
            // console.log(rows)
            if (rows.length > 0) {
              data = rows.map((data: any) => ({
                id: data.id,
                date: data.date,
                type: user.user_type,
                name: data.dataValues.School
                  ? data.dataValues.School.dataValues.name
                  : "-- --",
                school_type: data.dataValues.School
                  ? data.dataValues.School.dataValues.school_type
                  : "-- --",
                service_engineer: data.dataValues.User
                  ? data.dataValues.User.dataValues.user_name
                  : "-- --",
                phone: data.dataValues.User
                  ? data.dataValues.User.dataValues.phone
                  : "-- --",
                arrival: data.dataValues.Attendances[0]
                  ? data.dataValues.Attendances[0] &&
                    data.dataValues.Attendances[0].dataValues.check_in
                  : "-- --",
                departure: data.dataValues.Attendances[0]
                  ? data.dataValues.Attendances[0] &&
                    data.dataValues.Attendances[0].dataValues.check_out
                  : "-- --",
                status: data.dataValues.Attendances[0]
                  ? data.dataValues.Attendances[0] &&
                    data.dataValues.Attendances[0].dataValues.status
                  : "-- --",
                model: data.dataValues.Grievance
                  ? data.dataValues.Grievance.dataValues.Asset &&
                    data.dataValues.Grievance.dataValues.Asset.dataValues.model
                  : "",
                asset: data.dataValues.Grievance
                  ? data.dataValues.Grievance.dataValues.Asset &&
                    data.dataValues.Grievance.dataValues.Asset.dataValues
                      .AssetType &&
                    data.dataValues.Grievance.dataValues.Asset.dataValues
                      .AssetType.dataValues.name
                  : "-- --",
                  visited_date: data.dataValues.visited_date != null ?  data.dataValues.visited_date : '',
              }));
            }
            res.json({
              draw: draw,
              recordsTotal: count,
              recordsFiltered: count,
              data: data,
              // more: rows,
              // searchCondition: searchCondition,
              // searchValue: searchValue,
            });
          } else {
            const { count, rows }: any = await SchoolVisit.findAndCountAll({
              include: [
                {
                  model: User,
                  required: true,
                  attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
                  where:
                    outerSearchCondition == null && innerSearchCondition != null
                      ? { user_name: { [Op.like]: `%${searchValue}%` } }
                      : {},
                  order: [["user_name", orderDir]],
                },
                {
                  model: Attendance,
                  required: false,
                  attributes: ["id", "check_in", "check_out", "status"],
                  order: [
                    ["check_in", orderDir],
                    ["check_out", orderDir],
                    ["status", orderDir],
                  ],
                },
                {
                  model: School,
                  required: false,
                  attributes: ["id", "name", "school_type"],
                  order: [["name", orderDir]],
                },
                {
                  model: Grievance,
                  required: innerSearchCondition == null ? true : false,
                  attributes: ["id", "asset_id"],
                  include: [
                    {
                      model: Asset,
                      attributes: ["id", "model"],
                      required: innerSearchCondition == null ? true : false,
                      where:
                        innerSearchCondition == null &&
                        secondinnerSearchCondition != null
                          ? { model: { [Op.like]: `%${searchValue}%` } }
                          : {},
                      include: [
                        {
                          model: AssetType,
                          attributes: ["id", "name"],
                          required: innerSearchCondition == null ? true : false,
                          where:
                            secondinnerSearchCondition == null
                              ? { name: { [Op.like]: `%${searchValue}%` } }
                              : {},
                        },
                      ],
                    },
                  ],
                },
              ],
              where:
                req.body.from != null &&
                req.body.to != null &&
                req.body.schoolId &&
                outerSearchCondition != null &&
                req.body.date == 2
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.gt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 1
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.eq]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 3
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.lt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      arrival: { [Op.is]: null },
                      departure: { [Op.is]: null },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 4
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.lt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      arrival: { [Op.not]: null },
                      departure: { [Op.not]: null },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 2
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.gt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    req.body.date == 1
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.eq]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    req.body.date == 3
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.lt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      arrival: { [Op.is]: null },
                      departure: { [Op.is]: null },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    req.body.date == 4
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.lt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      arrival: { [Op.not]: null },
                      departure: { [Op.not]: null },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.date == 2
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.gt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.date == 1
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.eq]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.date == 3
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.lt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      arrival: { [Op.is]: null },
                      departure: { [Op.is]: null },
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.date == 4
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.lt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      arrival: { [Op.not]: null },
                      departure: { [Op.not]: null },
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    outerSearchCondition != null
                  ? {
                      date: { [Op.between]: [req.body.from, req.body.to] },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    outerSearchCondition != null
                  ? {
                      date: { [Op.between]: [req.body.from, req.body.to] },
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId
                  ? {
                      date: { [Op.between]: [req.body.from, req.body.to] },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null && req.body.to != null
                  ? {
                      date: { [Op.between]: [req.body.from, req.body.to] },
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.type == 1 && req.body.schoolId
                  ? {
                      date: { [Op.eq]: moment().format("YYYY-MM-DD") },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 2
                  ? {
                      date: { [Op.gt]: moment().format("YYYY-MM-DD") },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 1
                  ? {
                      date: { [Op.eq]: moment().format("YYYY-MM-DD") },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 3
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.is]: null },
                      departure: { [Op.is]: null },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 4
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.not]: null },
                      departure: { [Op.not]: null },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.schoolId && outerSearchCondition != null
                  ? {
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : outerSearchCondition != null
                  ? { ...searchCondition, grievance_id: { [Op.not]: null } }
                  : req.body.schoolId
                  ? {
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.schoolId && req.body.date == 2
                  ? {
                      date: { [Op.gt]: moment().format("YYYY-MM-DD") },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.schoolId && req.body.date == 1
                  ? {
                      date: { [Op.eq]: moment().format("YYYY-MM-DD") },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.schoolId && req.body.date == 3
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.is]: null },
                      departure: { [Op.is]: null },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.schoolId && req.body.date == 4
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.not]: null },
                      departure: { [Op.not]: null },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.not]: null },
                    }
                  : outerSearchCondition != null && req.body.date == 2
                  ? {
                      date: { [Op.gt]: moment().format("YYYY-MM-DD") },
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : outerSearchCondition != null && req.body.date == 1
                  ? {
                      date: { [Op.eq]: moment().format("YYYY-MM-DD") },
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : outerSearchCondition != null && req.body.date == 3
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.is]: null },
                      departure: { [Op.is]: null },
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : outerSearchCondition != null && req.body.date == 4
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.not]: null },
                      departure: { [Op.not]: null },
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.date == 1
                  ? {
                      date: { [Op.eq]: moment().format("YYYY-MM-DD") },
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.date == 2
                  ? {
                      date: { [Op.gt]: moment().format("YYYY-MM-DD") },
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.date == 3
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.is]: null },
                      departure: { [Op.is]: null },
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.date == 4
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.not]: null },
                      departure: { [Op.not]: null },
                      grievance_id: { [Op.not]: null },
                    }
                  : { grievance_id: { [Op.not]: null } },
              order: [[orderColumnName, orderDir]],
              offset: start,
              limit: length,
            });
            let data = {};
            // console.log(rows)
            if (rows.length > 0) {
              data = rows.map((data: any) => ({
                id: data.id,
                date: data.date,
                type: user.user_type,
                name: data.dataValues.School
                  ? data.dataValues.School.dataValues.name
                  : "-- --",
                school_type: data.dataValues.School
                  ? data.dataValues.School.dataValues.school_type
                  : "-- --",
                service_engineer: data.dataValues.User
                  ? data.dataValues.User.dataValues.user_name
                  : "-- --",
                phone: data.dataValues.User
                  ? data.dataValues.User.dataValues.phone
                  : "-- --",
                arrival: data.dataValues.Attendances[0]
                  ? data.dataValues.Attendances[0] &&
                    data.dataValues.Attendances[0].dataValues.check_in
                  : "-- --",
                departure: data.dataValues.Attendances[0]
                  ? data.dataValues.Attendances[0] &&
                    data.dataValues.Attendances[0].dataValues.check_out
                  : "-- --",
                status: data.dataValues.Attendances[0]
                  ? data.dataValues.Attendances[0] &&
                    data.dataValues.Attendances[0].dataValues.status
                  : "-- --",
                model: data.dataValues.Grievance
                  ? data.dataValues.Grievance.dataValues.Asset &&
                    data.dataValues.Grievance.dataValues.Asset.dataValues.model
                  : "",
                asset: data.dataValues.Grievance
                  ? data.dataValues.Grievance.dataValues.Asset &&
                    data.dataValues.Grievance.dataValues.Asset.dataValues
                      .AssetType &&
                    data.dataValues.Grievance.dataValues.Asset.dataValues
                      .AssetType.dataValues.name
                  : "-- --",
                  visited_date: data.dataValues.visited_date != null ?  data.dataValues.visited_date : '',
              }));
            }
            res.json({
              draw: draw,
              recordsTotal: count,
              recordsFiltered: count,
              data: data,
              // more: rows,
              // searchCondition: searchCondition,
              // searchValue: searchValue,
            });
          }
        } else if (user.user_type == 1) {
          let searchCondition = {};
          if (searchValue) {
            searchCondition = {
              date: { [Op.like]: `%${searchValue}%` },
            };
          }
          let outerSearchResults = await SchoolVisit.findAll({
            attributes: ["id", "date"],
            where:
              searchValue !== null
                ? { date: { [Op.like]: `%${searchValue}%` } }
                : {},
          });
          let outerSearchCondition =
            outerSearchResults.length > 0 ? { [Op.not]: null } : null;

          let innerSearchResults = await SchoolVisit.findAll({
            include: [
              {
                model: User,
                required: true,
                attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
                where:
                  outerSearchCondition == null
                    ? { user_name: { [Op.like]: `%${searchValue}%` } }
                    : {},
                order: [["user_name", orderDir]],
              },
            ],
          });
          let innerSearchCondition =
            innerSearchResults.length > 0 ? { [Op.not]: null } : null;

          let secondinnerSearchResults = await SchoolVisit.findAll({
            include: [
              {
                model: Grievance,
                required: innerSearchCondition == null ? true : false,
                attributes: ["id", "asset_id"],
                include: [
                  {
                    model: Asset,
                    attributes: ["id", "model"],
                    required: innerSearchCondition == null ? true : false,
                    where:
                      innerSearchCondition == null
                        ? { model: { [Op.like]: `%${searchValue}%` } }
                        : {},
                  },
                ],
              },
            ],
          });
          let secondinnerSearchCondition =
            secondinnerSearchResults.length > 0 ? { [Op.not]: null } : null;
          if (req.body.tab == 1) {
            const { count, rows }: any = await SchoolVisit.findAndCountAll({
              include: [
                {
                  model: User,
                  required: true,
                  attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
                  where:
                    outerSearchCondition == null && innerSearchCondition != null
                      ? { user_name: { [Op.like]: `%${searchValue}%` } }
                      : {},
                  order: [["user_name", orderDir]],
                },
                {
                  model: Attendance,
                  required: false,
                  attributes: ["id", "check_in", "check_out", "status"],
                  order: [
                    ["check_in", orderDir],
                    ["check_out", orderDir],
                    ["status", orderDir],
                  ],
                },
                {
                  model: School,
                  required: false,
                  attributes: ["id", "name", "school_type"],
                  order: [["name", orderDir]],
                },
                
              ],
              where:
                req.body.from != null &&
                req.body.to != null &&
                req.body.schoolId &&
                outerSearchCondition != null &&
                req.body.date == 2
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.gt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 1
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.eq]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 3
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.lt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      arrival: { [Op.is]: null },
                      departure: { [Op.is]: null },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 4
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.lt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      arrival: { [Op.not]: null },
                      departure: { [Op.not]: null },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 2
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.gt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    req.body.date == 1
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.eq]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    req.body.date == 3
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.lt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      arrival: { [Op.is]: null },
                      departure: { [Op.is]: null },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    req.body.date == 4
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.lt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      arrival: { [Op.not]: null },
                      departure: { [Op.not]: null },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.date == 2
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.gt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.date == 1
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.eq]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.date == 3
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.lt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      arrival: { [Op.is]: null },
                      departure: { [Op.is]: null },
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.date == 4
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.lt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      arrival: { [Op.not]: null },
                      departure: { [Op.not]: null },
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    outerSearchCondition != null
                  ? {
                      date: { [Op.between]: [req.body.from, req.body.to] },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    outerSearchCondition != null
                  ? {
                      date: { [Op.between]: [req.body.from, req.body.to] },
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId
                  ? {
                      date: { [Op.between]: [req.body.from, req.body.to] },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.from != null && req.body.to != null
                  ? {
                      date: { [Op.between]: [req.body.from, req.body.to] },
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.type == 1 && req.body.schoolId
                  ? {
                      date: { [Op.eq]: moment().format("YYYY-MM-DD") },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 2
                  ? {
                      date: { [Op.gt]: moment().format("YYYY-MM-DD") },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 1
                  ? {
                      date: { [Op.eq]: moment().format("YYYY-MM-DD") },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 3
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.is]: null },
                      departure: { [Op.is]: null },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 4
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.not]: null },
                      departure: { [Op.not]: null },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.schoolId && outerSearchCondition != null
                  ? {
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : outerSearchCondition != null
                  ? { ...searchCondition, grievance_id: { [Op.is]: null } }
                  : req.body.schoolId
                  ? {
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.schoolId && req.body.date == 2
                  ? {
                      date: { [Op.gt]: moment().format("YYYY-MM-DD") },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.schoolId && req.body.date == 1
                  ? {
                      date: { [Op.eq]: moment().format("YYYY-MM-DD") },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.schoolId && req.body.date == 3
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.is]: null },
                      departure: { [Op.is]: null },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.schoolId && req.body.date == 4
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.not]: null },
                      departure: { [Op.not]: null },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.is]: null },
                    }
                  : outerSearchCondition != null && req.body.date == 2
                  ? {
                      date: { [Op.gt]: moment().format("YYYY-MM-DD") },
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : outerSearchCondition != null && req.body.date == 1
                  ? {
                      date: { [Op.eq]: moment().format("YYYY-MM-DD") },
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : outerSearchCondition != null && req.body.date == 3
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.is]: null },
                      departure: { [Op.is]: null },
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : outerSearchCondition != null && req.body.date == 4
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.not]: null },
                      departure: { [Op.not]: null },
                      ...searchCondition,
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.date == 1
                  ? {
                      date: { [Op.eq]: moment().format("YYYY-MM-DD") },
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.date == 2
                  ? {
                      date: { [Op.gt]: moment().format("YYYY-MM-DD") },
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.date == 3
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.is]: null },
                      departure: { [Op.is]: null },
                      grievance_id: { [Op.is]: null },
                    }
                  : req.body.date == 4
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.not]: null },
                      departure: { [Op.not]: null },
                      grievance_id: { [Op.is]: null },
                    }
                  : { grievance_id: { [Op.is]: null } },
              order: [[orderColumnName, orderDir]],
              offset: start,
              limit: length,
            });
            let data = {};
            if (rows.length > 0) {
              data = rows.map((data: any) => ({
                id: data.id,
                date: data.date,
                type: user.user_type,
                name: data.dataValues.School
                  ? data.dataValues.School.dataValues.name
                  : "-- --",
                school_type: data.dataValues.School
                  ? data.dataValues.School.dataValues.school_type
                  : "-- --",
                service_engineer: data.dataValues.User
                  ? data.dataValues.User.dataValues.user_name
                  : "-- --",
                phone: data.dataValues.User
                  ? data.dataValues.User.dataValues.phone
                  : "-- --",
                arrival: data.dataValues.Attendances[0]
                  ? data.dataValues.Attendances[0] &&
                    data.dataValues.Attendances[0].dataValues.check_in
                  : "-- --",
                departure: data.dataValues.Attendances[0]
                  ? data.dataValues.Attendances[0] &&
                    data.dataValues.Attendances[0].dataValues.check_out
                  : "-- --",
                status: data.dataValues.Attendances[0]
                  ? data.dataValues.Attendances[0] &&
                    data.dataValues.Attendances[0].dataValues.status
                  : "-- --",
                model: data.dataValues.Grievance
                  ? data.dataValues.Grievance.dataValues.Asset &&
                    data.dataValues.Grievance.dataValues.Asset.dataValues.model
                  : "",
                asset: data.dataValues.Grievance
                  ? data.dataValues.Grievance.dataValues.Asset &&
                    data.dataValues.Grievance.dataValues.Asset.dataValues
                      .AssetType &&
                    data.dataValues.Grievance.dataValues.Asset.dataValues
                      .AssetType.dataValues.name
                  : "-- --",
                  visited_date: data.dataValues.visited_date != null ?  data.dataValues.visited_date : ''
              }));
            }

            const excelData = await SchoolVisit.findAll({
              include: [
                {
                  model: User,
                  required: true,
                  attributes: ["id", "user_name", "phone", "user_type"],
                  order: [["user_name", orderDir]],
                },
                {
                  model: Attendance,
                  required: false,
                  attributes: ["id", "check_in", "check_out", "status"],
                  order: [
                    ["check_in", orderDir],
                    ["check_out", orderDir],
                    ["status", orderDir],
                  ],
                },
                {
                  model: School,
                  required: false,
                  attributes: ["id", "name", "school_type"],
                  order: [["name", orderDir]],
                },
                
              ],
              where:{ grievance_id: { [Op.is]: null } },
              order: [[orderColumnName, orderDir]],
            });
            let dataForExcel:any;
            if(excelData.length > 0){
              dataForExcel = excelData.map((data: any) => ({
                // id: data.id,
                date: data.date,
                type: 
                user.user_type == 1
                  ? "Admin"
                  : user.user_type == 2
                  ? "OEM"
                  : user.user_type == 3
                  ? "School View"
                  : user.user_type == 4
                  ? "Service Engineer"
                  : user.user_type == 5
                  ? "Help Desk"
                  : "Management",
                name: data.dataValues.School
                  ? data.dataValues.School.dataValues.name
                  : "-- --",
                school_type: data.dataValues.School?.dataValues.school_type == 1 ? "Elementary" : "Secondary",
                service_engineer: data.dataValues.User
                  ? data.dataValues.User.dataValues.user_name
                  : "-- --",
                phone: data.dataValues.User
                  ? data.dataValues.User.dataValues.phone
                  : "-- --",
                arrival: data.dataValues.Attendances[0]
                  ? data.dataValues.Attendances[0] &&
                    data.dataValues.Attendances[0].dataValues.check_in
                  : "-- --",
                departure: data.dataValues.Attendances[0]
                  ? data.dataValues.Attendances[0] &&
                    data.dataValues.Attendances[0].dataValues.check_out
                  : "-- --",
                status: data.dataValues.Attendances[0]?.dataValues.status == 1 ? 'Working Fine' : data.dataValues.Attendances[0]?.dataValues.status == 2 ? 'Issue':data.dataValues.Attendances[0]?.dataValues.status == 3 ? 'Unresolved' : data.dataValues.Attendances[0]?.dataValues.status == 4 ? 'Resolved' : "-- --",
                model: data.dataValues.Grievance
                  ? data.dataValues.Grievance.dataValues.Asset &&
                    data.dataValues.Grievance.dataValues.Asset.dataValues.model
                  : "",
                asset: data.dataValues.Grievance
                  ? data.dataValues.Grievance.dataValues.Asset &&
                    data.dataValues.Grievance.dataValues.Asset.dataValues
                      .AssetType &&
                    data.dataValues.Grievance.dataValues.Asset.dataValues
                      .AssetType.dataValues.name
                  : "-- --",
                  visited_date: data.dataValues.visited_date != null ?  data.dataValues.visited_date : ''
              }));
            }
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
            const { count, rows }: any = await SchoolVisit.findAndCountAll({
              include: [
                {
                  model: User,
                  required: true,
                  attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
                  where:
                    outerSearchCondition == null && innerSearchCondition != null
                      ? { user_name: { [Op.like]: `%${searchValue}%` } }
                      : {},
                  order: [["user_name", orderDir]],
                },
                {
                  model: Attendance,
                  required: false,
                  attributes: ["id", "check_in", "check_out", "status"],
                  order: [
                    ["check_in", orderDir],
                    ["check_out", orderDir],
                    ["status", orderDir],
                  ],
                },
                {
                  model: School,
                  required: false,
                  attributes: ["id", "name", "school_type"],
                  order: [["name", orderDir]],
                },
                {
                  model: Grievance,
                  required: innerSearchCondition == null ? true : false,
                  attributes: ["id", "asset_id"],
                  include: [
                    {
                      model: Asset,
                      attributes: ["id", "model"],
                      required: innerSearchCondition == null ? true : false,
                      where:
                        innerSearchCondition == null &&
                        secondinnerSearchCondition != null
                          ? { model: { [Op.like]: `%${searchValue}%` } }
                          : {},
                      include: [
                        {
                          model: AssetType,
                          attributes: ["id", "name"],
                          required: innerSearchCondition == null ? true : false,
                          where:
                            secondinnerSearchCondition == null
                              ? { name: { [Op.like]: `%${searchValue}%` } }
                              : {},
                        },
                      ],
                    },
                  ],
                },
              ],
              where:
                req.body.from != null &&
                req.body.to != null &&
                req.body.schoolId &&
                outerSearchCondition != null &&
                req.body.date == 2
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.gt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 1
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.eq]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 3
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.lt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      arrival: { [Op.is]: null },
                      departure: { [Op.is]: null },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 4
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.lt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      arrival: { [Op.not]: null },
                      departure: { [Op.not]: null },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 2
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.gt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    req.body.date == 1
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.eq]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    req.body.date == 3
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.lt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      arrival: { [Op.is]: null },
                      departure: { [Op.is]: null },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    req.body.date == 4
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.lt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      arrival: { [Op.not]: null },
                      departure: { [Op.not]: null },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.date == 2
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.gt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.date == 1
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.eq]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.date == 3
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.lt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      arrival: { [Op.is]: null },
                      departure: { [Op.is]: null },
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.date == 4
                  ? {
                      date: {
                        [Op.and]: {
                          [Op.between]: [req.body.from, req.body.to],
                          [Op.lt]: moment().format("YYYY-MM-DD"),
                        },
                      },
                      arrival: { [Op.not]: null },
                      departure: { [Op.not]: null },
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId &&
                    outerSearchCondition != null
                  ? {
                      date: { [Op.between]: [req.body.from, req.body.to] },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    outerSearchCondition != null
                  ? {
                      date: { [Op.between]: [req.body.from, req.body.to] },
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.schoolId
                  ? {
                      date: { [Op.between]: [req.body.from, req.body.to] },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.from != null && req.body.to != null
                  ? {
                      date: { [Op.between]: [req.body.from, req.body.to] },
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.type == 1 && req.body.schoolId
                  ? {
                      date: { [Op.eq]: moment().format("YYYY-MM-DD") },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 2
                  ? {
                      date: { [Op.gt]: moment().format("YYYY-MM-DD") },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 1
                  ? {
                      date: { [Op.eq]: moment().format("YYYY-MM-DD") },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 3
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.is]: null },
                      departure: { [Op.is]: null },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.schoolId &&
                    outerSearchCondition != null &&
                    req.body.date == 4
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.not]: null },
                      departure: { [Op.not]: null },
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.schoolId && outerSearchCondition != null
                  ? {
                      school_id: req.body.schoolId,
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : outerSearchCondition != null
                  ? { ...searchCondition, grievance_id: { [Op.not]: null } }
                  : req.body.schoolId
                  ? {
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.schoolId && req.body.date == 2
                  ? {
                      date: { [Op.gt]: moment().format("YYYY-MM-DD") },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.schoolId && req.body.date == 1
                  ? {
                      date: { [Op.eq]: moment().format("YYYY-MM-DD") },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.schoolId && req.body.date == 3
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.is]: null },
                      departure: { [Op.is]: null },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.schoolId && req.body.date == 4
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.not]: null },
                      departure: { [Op.not]: null },
                      school_id: req.body.schoolId,
                      grievance_id: { [Op.not]: null },
                    }
                  : outerSearchCondition != null && req.body.date == 2
                  ? {
                      date: { [Op.gt]: moment().format("YYYY-MM-DD") },
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : outerSearchCondition != null && req.body.date == 1
                  ? {
                      date: { [Op.eq]: moment().format("YYYY-MM-DD") },
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : outerSearchCondition != null && req.body.date == 3
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.is]: null },
                      departure: { [Op.is]: null },
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : outerSearchCondition != null && req.body.date == 4
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.not]: null },
                      departure: { [Op.not]: null },
                      ...searchCondition,
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.date == 1
                  ? {
                      date: { [Op.eq]: moment().format("YYYY-MM-DD") },
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.date == 2
                  ? {
                      date: { [Op.gt]: moment().format("YYYY-MM-DD") },
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.date == 3
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.is]: null },
                      departure: { [Op.is]: null },
                      grievance_id: { [Op.not]: null },
                    }
                  : req.body.date == 4
                  ? {
                      date: { [Op.lt]: moment().format("YYYY-MM-DD") },
                      arrival: { [Op.not]: null },
                      departure: { [Op.not]: null },
                      grievance_id: { [Op.not]: null },
                    }
                  : { grievance_id: { [Op.not]: null } },
              order: [[orderColumnName, orderDir]],
              offset: start,
              limit: length,
            });
            let data = {};
            // console.log(rows)
            if (rows.length > 0) {
              data = rows.map((data: any) => ({
                id: data.id,
                date: data.date,
                type: user.user_type,
                name: data.dataValues.School
                  ? data.dataValues.School.dataValues.name
                  : "-- --",
                school_type: data.dataValues.School
                  ? data.dataValues.School.dataValues.school_type
                  : "-- --",
                service_engineer: data.dataValues.User
                  ? data.dataValues.User.dataValues.user_name
                  : "-- --",
                phone: data.dataValues.User
                  ? data.dataValues.User.dataValues.phone
                  : "-- --",
                arrival: data.dataValues.Attendances[0]
                  ? data.dataValues.Attendances[0] &&
                    data.dataValues.Attendances[0].dataValues.check_in
                  : "-- --",
                departure: data.dataValues.Attendances[0]
                  ? data.dataValues.Attendances[0] &&
                    data.dataValues.Attendances[0].dataValues.check_out
                  : "-- --",
                status: data.dataValues.Attendances[0]
                  ? data.dataValues.Attendances[0] &&
                    data.dataValues.Attendances[0].dataValues.status
                  : "-- --",
                model: data.dataValues.Grievance
                  ? data.dataValues.Grievance.dataValues.Asset &&
                    data.dataValues.Grievance.dataValues.Asset.dataValues.model
                  : "",
                asset: data.dataValues.Grievance
                  ? data.dataValues.Grievance.dataValues.Asset &&
                    data.dataValues.Grievance.dataValues.Asset.dataValues
                      .AssetType &&
                    data.dataValues.Grievance.dataValues.Asset.dataValues
                      .AssetType.dataValues.name
                  : "-- --",
                  visited_date: data.dataValues.visited_date != null ?  data.dataValues.visited_date : ''
              }));
            }
            const excelData = await SchoolVisit.findAll({
              include: [
                {
                  model: User,
                  required: true,
                  attributes: ["id", "user_name", "phone", "user_type"],
                  order: [["user_name", orderDir]],
                },
                {
                  model: Attendance,
                  required: false,
                  attributes: ["id", "check_in", "check_out", "status"],
                  order: [
                    ["check_in", orderDir],
                    ["check_out", orderDir],
                    ["status", orderDir],
                  ],
                },
                {
                  model: School,
                  required: false,
                  attributes: ["id", "name", "school_type"],
                  order: [["name", orderDir]],
                },
                
              ],
              where: { grievance_id: { [Op.not]: null } },
              order: [[orderColumnName, orderDir]],
            });
            let dataForExcel:any;
            if(excelData.length > 0){
              dataForExcel = excelData.map((data: any) => ({
                // id: data.id,
                date: data.date,
                type: 
                user.user_type == 1
                  ? "Admin"
                  : user.user_type == 2
                  ? "OEM"
                  : user.user_type == 3
                  ? "School View"
                  : user.user_type == 4
                  ? "Service Engineer"
                  : user.user_type == 5
                  ? "Help Desk"
                  : "Management",
                name: data.dataValues.School
                  ? data.dataValues.School.dataValues.name
                  : "-- --",
                school_type: data.dataValues.School?.dataValues.school_type == 1 ? "Elementary" : "Secondary",
                service_engineer: data.dataValues.User
                  ? data.dataValues.User.dataValues.user_name
                  : "-- --",
                phone: data.dataValues.User
                  ? data.dataValues.User.dataValues.phone
                  : "-- --",
                arrival: data.dataValues.Attendances[0]
                  ? data.dataValues.Attendances[0] &&
                    data.dataValues.Attendances[0].dataValues.check_in
                  : "-- --",
                departure: data.dataValues.Attendances[0]
                  ? data.dataValues.Attendances[0] &&
                    data.dataValues.Attendances[0].dataValues.check_out
                  : "-- --",
                status: data.dataValues.Attendances[0]?.dataValues.status == 1 ? 'Working Fine' : data.dataValues.Attendances[0]?.dataValues.status == 2 ? 'Issue':data.dataValues.Attendances[0]?.dataValues.status == 3 ? 'Unresolved' : data.dataValues.Attendances[0]?.dataValues.status == 4 ? 'Resolved' : "-- --",
                model: data.dataValues.Grievance
                  ? data.dataValues.Grievance.dataValues.Asset &&
                    data.dataValues.Grievance.dataValues.Asset.dataValues.model
                  : "",
                asset: data.dataValues.Grievance
                  ? data.dataValues.Grievance.dataValues.Asset &&
                    data.dataValues.Grievance.dataValues.Asset.dataValues
                      .AssetType &&
                    data.dataValues.Grievance.dataValues.Asset.dataValues
                      .AssetType.dataValues.name
                  : "-- --",
                  visited_date: data.dataValues.visited_date != null ?  data.dataValues.visited_date : ''
              }));
            }
            res.json({
              draw: draw,
              recordsTotal: count,
              recordsFiltered: count,
              data: data,
              searchCondition: searchCondition,
              searchValue: searchValue,
              excel: dataForExcel
            });
          }
        }
      } else {
        if (req.query.upcoming == "true") {
          if (user.user_type == 3 && user.school_id != null) {
            const { count, rows } = await SchoolVisit.findAndCountAll({
              include: [
                {
                  model: User,
                  required: false,
                  attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
                  order: [["user_name", orderDir]],
                },
                {
                  model: Attendance,
                  required: false,
                  attributes: ["id", "check_in", "check_out", "status"],
                  order: [
                    ["check_in", orderDir],
                    ["check_out", orderDir],
                    ["status", orderDir],
                  ],
                },
                {
                  model: School,
                  required: false,
                  attributes: ["id", "name", "school_type"],
                  order: [["name", orderDir]],
                },
                {
                  model: Grievance,
                  required: false,
                  attributes: ["id", "asset_id"],
                  include: [
                    {
                      model: Asset,
                      attributes: ["id", "model"],
                      include: [
                        {
                          model: AssetType,
                          attributes: ["id", "name"],
                        },
                      ],
                    },
                  ],
                },
              ],
              where:
                req.body.from != null && req.body.to != null
                  ? {
                      date: { [Op.between]: [req.body.from, req.body.to] },
                      school_id: user.school_id,
                    }
                  : req.body.type == 1
                  ? {
                      date: { [Op.eq]: moment().format("YYYY-MM-DD") },
                      school_id: user.school_id,
                    }
                  : { school_id: user.school_id },
              order: [[orderColumnName, orderDir]],
              offset: start,
              limit: length,
            });

            let data: any = [];
            let obj = {};
            if (rows.length > 0) {
              data =
                rows &&
                rows.map((data: any) => {
                  if (
                    moment(
                      moment().format("YYYY-MM-DD"),
                      "YYYY-MM-DD"
                    ).isBefore(moment(data.date, "YYYY-MM-DD"))
                  ) {
                    obj = {
                      id: data.id,
                      date: data.date,
                      type: user.user_type,
                      name: data.dataValues.School
                        ? data.dataValues.School.dataValues.name
                        : "-- --",
                      school_type: data.dataValues.School
                        ? data.dataValues.School.dataValues.school_type
                        : "-- --",
                      service_engineer: data.dataValues.User
                        ? data.dataValues.User.dataValues.user_name
                        : "-- --",
                      phone: data.dataValues.User
                        ? data.dataValues.User.dataValues.phone
                        : "-- --",
                      arrival: data.dataValues.Attendance
                        ? data.dataValues.Attendance.dataValues.check_in
                        : "-- --",
                      departure: data.dataValues.Attendance
                        ? data.dataValues.Attendance.dataValues.check_out
                        : "-- --",
                      status: data.dataValues.Attendance
                        ? data.dataValues.Attendance.dataValues.status
                        : "-- --",
                      model: data.dataValues.Grievance
                        ? data.dataValues.Grievance.dataValues.Asset &&
                          data.dataValues.Grievance.dataValues.Asset.dataValues
                            .model
                        : "",
                      asset: data.dataValues.Grievance
                        ? data.dataValues.Grievance.dataValues.Asset &&
                          data.dataValues.Grievance.dataValues.AssetType &&
                          data.dataValues.Grievance.dataValues.AssetType
                            .dataValues.name
                        : "-- --",
                    };
                    return obj;
                  }
                });
              res.json({
                draw: draw,
                recordsTotal: count,
                recordsFiltered: count,
                data: data,
              });
            }
          } else if (user.user_type == 4) {
            const { count, rows }: any = await SchoolVisit.findAndCountAll({
              include: [
                {
                  model: User,
                  required: true,
                  attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
                  order: [["user_name", orderDir]],
                  where: { id: user.id },
                },
                {
                  model: Attendance,
                  required: false,
                  attributes: ["id", "check_in", "check_out", "status"],
                  order: [
                    ["check_in", orderDir],
                    ["check_out", orderDir],
                    ["status", orderDir],
                  ],
                },
                {
                  model: School,
                  required: false,
                  attributes: ["id", "name", "school_type"],
                  order: [["name", orderDir]],
                },
                {
                  model: Grievance,
                  required: false,
                  attributes: ["id", "asset_id"],
                  include: [
                    {
                      model: Asset,
                      attributes: ["id", "model"],
                      include: [
                        {
                          model: AssetType,
                          attributes: ["id", "name"],
                        },
                      ],
                    },
                  ],
                },
              ],
              where:
                req.body.from != null && req.body.to != null
                  ? { date: { [Op.between]: [req.body.from, req.body.to] } }
                  : req.body.type == 1
                  ? { date: { [Op.eq]: moment().format("YYYY-MM-DD") } }
                  : {},
              order: [["date", orderDir]],
              offset: start,
              limit: length,
            });

            let data: [];
            let obj: any = {};
            if (rows.length > 0) {
              data = rows.map((data: any) => {
                if (data.User != null) {
                  // console.log(data.dataValues.Attendances[0] && data.dataValues.Attendances[0].check_in)
                  if (
                    moment(
                      moment().format("YYYY-MM-DD"),
                      "YYYY-MM-DD"
                    ).isBefore(moment(data.date, "YYYY-MM-DD"))
                  ) {
                    obj = {
                      id: data.id,
                      date: data.date,
                      type: user.user_type,
                      name: data.dataValues.School
                        ? data.dataValues.School.dataValues.name
                        : "-- --",
                      school_type: data.dataValues.School
                        ? data.dataValues.School.dataValues.school_type
                        : "-- --",
                      service_engineer: data.dataValues.User
                        ? data.dataValues.User.dataValues.user_name
                        : "-- --",
                      phone: data.dataValues.User
                        ? data.dataValues.User.dataValues.phone
                        : "-- --",
                      arrival: data.dataValues.Attendances[0]
                        ? data.dataValues.Attendances[0] &&
                          data.dataValues.Attendances[0].check_in
                        : "-- --",
                      departure: data.dataValues.Attendances[0]
                        ? data.dataValues.Attendances[0] &&
                          data.dataValues.Attendances[0].check_out
                        : "-- --",
                      status: data.dataValues.Attendances[0]
                        ? data.dataValues.Attendances[0] &&
                          data.dataValues.Attendances[0].status
                        : "-- --",
                      model: data.dataValues.Grievance
                        ? data.dataValues.Grievance.dataValues.Asset &&
                          data.dataValues.Grievance.dataValues.Asset.dataValues
                            .model
                        : "",
                      asset: data.dataValues.Grievance
                        ? data.dataValues.Grievance.dataValues.Asset &&
                          data.dataValues.Grievance.dataValues.AssetType &&
                          data.dataValues.Grievance.dataValues.AssetType
                            .dataValues.name
                        : "-- --",
                    };
                    return obj;
                  }
                }
              });
              res.json({
                draw: draw,
                recordsTotal: count,
                recordsFiltered: count,
                data: data,
              });
            }
          } else if (user.user_type == 5) {
            const { count, rows } = await SchoolVisit.findAndCountAll({
              include: [
                {
                  model: User,
                  required: false,
                  attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
                  order: [["user_name", orderDir]],
                },
                {
                  model: Attendance,
                  required: false,
                  attributes: ["id", "check_in", "check_out", "status"],
                  order: [
                    ["check_in", orderDir],
                    ["check_out", orderDir],
                    ["status", orderDir],
                  ],
                },
                {
                  model: School,
                  required: false,
                  attributes: ["id", "name", "school_type"],
                  order: [["name", orderDir]],
                  // where: { project: user.project },
                },
                {
                  model: Grievance,
                  required: false,
                  attributes: ["id", "asset_id"],
                  include: [
                    {
                      model: Asset,
                      attributes: ["id", "model"],
                      include: [
                        {
                          model: AssetType,
                          attributes: ["id", "name"],
                        },
                      ],
                    },
                  ],
                },
              ],
              where:
                req.body.from != null && req.body.to != null
                  ? { date: { [Op.between]: [req.body.from, req.body.to] } }
                  : req.body.type == 1
                  ? { date: { [Op.eq]: moment().format("YYYY-MM-DD") } }
                  : {},
              order: [[orderColumnName, orderDir]],
              offset: start,
              limit: length,
            });
            let data: any = [];
            let obj = {};
            if (rows.length > 0) {
              data = rows.map((data: any) => {
                if (data.dataValues.School) {
                  if (
                    moment(
                      moment().format("YYYY-MM-DD"),
                      "YYYY-MM-DD"
                    ).isBefore(moment(data.date, "YYYY-MM-DD"))
                  ) {
                    obj = {
                      id: data.id,
                      date: data.date,
                      type: user.user_type,
                      name: data.dataValues.School
                        ? data.dataValues.School.dataValues.name
                        : "-- --",
                      school_type: data.dataValues.School
                        ? data.dataValues.School.dataValues.school_type
                        : "-- --",
                      service_engineer: data.dataValues.User
                        ? data.dataValues.User.dataValues.user_name
                        : "-- --",
                      phone: data.dataValues.User
                        ? data.dataValues.User.dataValues.phone
                        : "-- --",
                      arrival: data.dataValues.Attendances
                        ? data.dataValues.Attendances.dataValues.check_in
                        : "-- --",
                      departure: data.dataValues.Attendances
                        ? data.dataValues.Attendances.dataValues.check_out
                        : "-- --",
                      status: data.dataValues.Attendances
                        ? data.dataValues.Attendances.dataValues.status
                        : "-- --",
                      model: data.dataValues.Grievance
                        ? data.dataValues.Grievance.dataValues.Asset &&
                          data.dataValues.Grievance.dataValues.Asset.dataValues
                            .model
                        : "",
                      asset: data.dataValues.Grievance
                        ? data.dataValues.Grievance.dataValues.Asset &&
                          data.dataValues.Grievance.dataValues.AssetType &&
                          data.dataValues.Grievance.dataValues.AssetType
                            .dataValues.name
                        : "-- --",
                    };
                    return obj;
                  }
                }
              });
              res.json({
                draw: draw,
                recordsTotal: count,
                recordsFiltered: count,
                data: data,
              });
            }
          } else if (user.user_type == 1) {
            const { count, rows }: any = await SchoolVisit.findAndCountAll({
              include: [
                {
                  model: User,
                  required: false,
                  attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
                  order: [["user_name", orderDir]],
                },
                {
                  model: Attendance,
                  required: false,
                  attributes: ["id", "check_in", "check_out", "status"],
                  order: [
                    ["check_in", orderDir],
                    ["check_out", orderDir],
                    ["status", orderDir],
                  ],
                },
                {
                  model: School,
                  required: false,
                  attributes: ["id", "name", "school_type"],
                  order: [["name", orderDir]],
                },
                {
                  model: Grievance,
                  required: false,
                  attributes: ["id", "asset_id"],
                  include: [
                    {
                      model: Asset,
                      attributes: ["id", "model"],
                      include: [
                        {
                          model: AssetType,
                          attributes: ["id", "name"],
                        },
                      ],
                    },
                  ],
                },
              ],
              where:
                req.body.from != null && req.body.to != null
                  ? { date: { [Op.between]: [req.body.from, req.body.to] } }
                  : req.body.type == 1
                  ? { date: { [Op.eq]: moment().format("YYYY-MM-DD") } }
                  : {},
              order: [[orderColumnName, orderDir]],
              // offset: start,
              // limit: length,
            });
            let data = [];
            let obj = {};
            if (rows.length > 0) {
              data = rows.map((data: any) => {
                if (
                  moment(moment().format("YYYY-MM-DD"), "YYYY-MM-DD").isBefore(
                    moment(data.date, "YYYY-MM-DD")
                  )
                ) {
                  obj = {
                    id: data.id,
                    date: data.date,
                    type: user.user_type,
                    name: data.dataValues.School
                      ? data.dataValues.School.dataValues.name
                      : "-- --",
                    school_type: data.dataValues.School
                      ? data.dataValues.School.dataValues.school_type
                      : "-- --",
                    service_engineer: data.dataValues.User
                      ? data.dataValues.User.dataValues.user_name
                      : "-- --",
                    phone: data.dataValues.User
                      ? data.dataValues.User.dataValues.phone
                      : "-- --",
                    arrival: data.dataValues.Attendances[0]
                      ? data.dataValues.Attendances[0] &&
                        data.dataValues.Attendances[0].dataValues.check_in
                      : "-- --",
                    departure: data.dataValues.Attendances[0]
                      ? data.dataValues.Attendances[0] &&
                        data.dataValues.Attendances[0].dataValues.check_out
                      : "-- --",
                    status: data.dataValues.Attendances[0]
                      ? data.dataValues.Attendances[0] &&
                        data.dataValues.Attendances[0].dataValues.status
                      : "-- --",
                    model: data.dataValues.Grievance
                      ? data.dataValues.Grievance.dataValues.Asset &&
                        data.dataValues.Grievance.dataValues.Asset.dataValues
                          .model
                      : "",
                    asset: data.dataValues.Grievance
                      ? data.dataValues.Grievance.dataValues.Asset &&
                        data.dataValues.Grievance.dataValues.AssetType &&
                        data.dataValues.Grievance.dataValues.AssetType
                          .dataValues.name
                      : "-- --",
                  };
                  return obj;
                }
              });
              res.json({
                draw: draw,
                recordsTotal: count,
                recordsFiltered: count,
                data: data,
                searchCondition: searchCondition,
                searchValue: searchValue,
              });
            }
          }
        }
        if (req.query.upcoming == "false") {
          if (user.user_type == 3 && user.school_id != null) {
            const { count, rows } = await SchoolVisit.findAndCountAll({
              include: [
                {
                  model: User,
                  required: false,
                  attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
                  order: [["user_name", orderDir]],
                },
                {
                  model: Attendance,
                  required: false,
                  attributes: ["id", "check_in", "check_out", "status"],
                  order: [
                    ["check_in", orderDir],
                    ["check_out", orderDir],
                    ["status", orderDir],
                  ],
                },
                {
                  model: School,
                  required: false,
                  attributes: ["id", "name", "school_type"],
                  order: [["name", orderDir]],
                },
                {
                  model: Grievance,
                  required: false,
                  attributes: ["id", "asset_id"],
                  include: [
                    {
                      model: Asset,
                      attributes: ["id", "model"],
                      include: [
                        {
                          model: AssetType,
                          attributes: ["id", "name"],
                        },
                      ],
                    },
                  ],
                },
              ],
              where:
                req.body.from != null && req.body.to != null
                  ? {
                      date: { [Op.between]: [req.body.from, req.body.to] },
                      school_id: user.school_id,
                    }
                  : req.body.type == 1
                  ? {
                      date: { [Op.eq]: moment().format("YYYY-MM-DD") },
                      school_id: user.school_id,
                    }
                  : { school_id: user.school_id },
              order: [[orderColumnName, orderDir]],
              offset: start,
              limit: length,
            });

            let data: any = [];
            let obj = {};
            if (rows.length > 0) {
              data =
                rows &&
                rows.map((data: any) => {
                  if (
                    moment(moment().format("YYYY-MM-DD"), "YYYY-MM-DD").isAfter(
                      moment(data.date, "YYYY-MM-DD")
                    )
                  ) {
                    obj = {
                      id: data.id,
                      date: data.date,
                      type: user.user_type,
                      name: data.dataValues.School
                        ? data.dataValues.School.dataValues.name
                        : "-- --",
                      school_type: data.dataValues.School
                        ? data.dataValues.School.dataValues.school_type
                        : "-- --",
                      service_engineer: data.dataValues.User
                        ? data.dataValues.User.dataValues.user_name
                        : "-- --",
                      phone: data.dataValues.User
                        ? data.dataValues.User.dataValues.phone
                        : "-- --",
                      arrival: data.dataValues.Attendance
                        ? data.dataValues.Attendance.dataValues.check_in
                        : "-- --",
                      departure: data.dataValues.Attendance
                        ? data.dataValues.Attendance.dataValues.check_out
                        : "-- --",
                      status: data.dataValues.Attendance
                        ? data.dataValues.Attendance.dataValues.status
                        : "-- --",
                      model: data.dataValues.Grievance
                        ? data.dataValues.Grievance.dataValues.Asset &&
                          data.dataValues.Grievance.dataValues.Asset.dataValues
                            .model
                        : "",
                      asset: data.dataValues.Grievance
                        ? data.dataValues.Grievance.dataValues.Asset &&
                          data.dataValues.Grievance.dataValues.AssetType &&
                          data.dataValues.Grievance.dataValues.AssetType
                            .dataValues.name
                        : "-- --",
                    };

                    return obj;
                  }
                });
              res.json({
                draw: draw,
                recordsTotal: count,
                recordsFiltered: count,
                data: data,
              });
            }
          } else if (user.user_type == 4) {
            const { count, rows }: any = await SchoolVisit.findAndCountAll({
              include: [
                {
                  model: User,
                  required: true,
                  attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
                  order: [["user_name", orderDir]],
                  where: { id: user.id },
                },
                {
                  model: Attendance,
                  required: false,
                  attributes: ["id", "check_in", "check_out", "status"],
                  order: [
                    ["check_in", orderDir],
                    ["check_out", orderDir],
                    ["status", orderDir],
                  ],
                },
                {
                  model: School,
                  required: false,
                  attributes: ["id", "name", "school_type"],
                  order: [["name", orderDir]],
                },
                {
                  model: Grievance,
                  required: false,
                  attributes: ["id", "asset_id"],
                  include: [
                    {
                      model: Asset,
                      attributes: ["id", "model"],
                      include: [
                        {
                          model: AssetType,
                          attributes: ["id", "name"],
                        },
                      ],
                    },
                  ],
                },
              ],
              where:
                req.body.from != null && req.body.to != null
                  ? { date: { [Op.between]: [req.body.from, req.body.to] } }
                  : req.body.type == 1
                  ? { date: { [Op.eq]: moment().format("YYYY-MM-DD") } }
                  : {},
              order: [["date", orderDir]],
              offset: start,
              limit: length,
            });

            let data: any;
            let obj: any = {};
            if (rows.length > 0) {
              data = rows.map((data: any) => {
                if (data.User != null) {
                  // console.log(data.dataValues.Attendances[0] && data.dataValues.Attendances[0].check_in)
                  if (
                    moment(moment().format("YYYY-MM-DD"), "YYYY-MM-DD").isAfter(
                      moment(data.date, "YYYY-MM-DD")
                    )
                  ) {
                    obj = {
                      id: data.id,
                      date: data.date,
                      type: user.user_type,
                      name: data.dataValues.School
                        ? data.dataValues.School.dataValues.name
                        : "-- --",
                      school_type: data.dataValues.School
                        ? data.dataValues.School.dataValues.school_type
                        : "-- --",
                      service_engineer: data.dataValues.User
                        ? data.dataValues.User.dataValues.user_name
                        : "-- --",
                      phone: data.dataValues.User
                        ? data.dataValues.User.dataValues.phone
                        : "-- --",
                      arrival: data.dataValues.Attendances[0]
                        ? data.dataValues.Attendances[0] &&
                          data.dataValues.Attendances[0].check_in
                        : "-- --",
                      departure: data.dataValues.Attendances[0]
                        ? data.dataValues.Attendances[0] &&
                          data.dataValues.Attendances[0].check_out
                        : "-- --",
                      status: data.dataValues.Attendances[0]
                        ? data.dataValues.Attendances[0] &&
                          data.dataValues.Attendances[0].status
                        : "-- --",
                      model: data.dataValues.Grievance
                        ? data.dataValues.Grievance.dataValues.Asset &&
                          data.dataValues.Grievance.dataValues.Asset.dataValues
                            .model
                        : "",
                      asset: data.dataValues.Grievance
                        ? data.dataValues.Grievance.dataValues.Asset &&
                          data.dataValues.Grievance.dataValues.AssetType &&
                          data.dataValues.Grievance.dataValues.AssetType
                            .dataValues.name
                        : "-- --",
                    };
                    return obj;
                  }
                }
              });
              res.json({
                draw: draw,
                recordsTotal: count,
                recordsFiltered: count,
                data: data,
              });
            }
          } else if (user.user_type == 5) {
            const { count, rows } = await SchoolVisit.findAndCountAll({
              include: [
                {
                  model: User,
                  required: false,
                  attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
                  order: [["user_name", orderDir]],
                },
                {
                  model: Attendance,
                  required: false,
                  attributes: ["id", "check_in", "check_out", "status"],
                  order: [
                    ["check_in", orderDir],
                    ["check_out", orderDir],
                    ["status", orderDir],
                  ],
                },
                {
                  model: School,
                  required: false,
                  attributes: ["id", "name", "school_type"],
                  order: [["name", orderDir]],
                  // where: { project: user.project },
                },
                {
                  model: Grievance,
                  required: false,
                  attributes: ["id", "asset_id"],
                  include: [
                    {
                      model: Asset,
                      attributes: ["id", "model"],
                      include: [
                        {
                          model: AssetType,
                          attributes: ["id", "name"],
                        },
                      ],
                    },
                  ],
                },
              ],
              where:
                req.body.from != null && req.body.to != null
                  ? { date: { [Op.between]: [req.body.from, req.body.to] } }
                  : req.body.type == 1
                  ? { date: { [Op.eq]: moment().format("YYYY-MM-DD") } }
                  : {},
              order: [[orderColumnName, orderDir]],
              offset: start,
              limit: length,
            });
            let data: any = [];
            let obj = {};
            if (rows.length > 0) {
              data = rows.map((data: any) => {
                if (data.dataValues.School) {
                  if (
                    moment(moment().format("YYYY-MM-DD"), "YYYY-MM-DD").isAfter(
                      moment(data.date, "YYYY-MM-DD")
                    )
                  ) {
                    obj = {
                      id: data.id,
                      date: data.date,
                      type: user.user_type,
                      name: data.dataValues.School
                        ? data.dataValues.School.dataValues.name
                        : "-- --",
                      school_type: data.dataValues.School
                        ? data.dataValues.School.dataValues.school_type
                        : "-- --",
                      service_engineer: data.dataValues.User
                        ? data.dataValues.User.dataValues.user_name
                        : "-- --",
                      phone: data.dataValues.User
                        ? data.dataValues.User.dataValues.phone
                        : "-- --",
                      arrival: data.dataValues.Attendances
                        ? data.dataValues.Attendances.dataValues.check_in
                        : "-- --",
                      departure: data.dataValues.Attendances
                        ? data.dataValues.Attendances.dataValues.check_out
                        : "-- --",
                      status: data.dataValues.Attendances
                        ? data.dataValues.Attendances.dataValues.status
                        : "-- --",
                      model: data.dataValues.Grievance
                        ? data.dataValues.Grievance.dataValues.Asset &&
                          data.dataValues.Grievance.dataValues.Asset.dataValues
                            .model
                        : "",
                      asset: data.dataValues.Grievance
                        ? data.dataValues.Grievance.dataValues.Asset &&
                          data.dataValues.Grievance.dataValues.AssetType &&
                          data.dataValues.Grievance.dataValues.AssetType
                            .dataValues.name
                        : "-- --",
                    };
                    return obj;
                  }
                }
              });
              res.json({
                draw: draw,
                recordsTotal: count,
                recordsFiltered: count,
                data: data,
              });
            }
          } else if (user.user_type == 1) {
            const { count, rows }: any = await SchoolVisit.findAndCountAll({
              include: [
                {
                  model: User,
                  required: false,
                  attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
                  order: [["user_name", orderDir]],
                },
                {
                  model: Attendance,
                  required: false,
                  attributes: ["id", "check_in", "check_out", "status"],
                  order: [
                    ["check_in", orderDir],
                    ["check_out", orderDir],
                    ["status", orderDir],
                  ],
                },
                {
                  model: School,
                  required: false,
                  attributes: ["id", "name", "school_type"],
                  order: [["name", orderDir]],
                },
                {
                  model: Grievance,
                  required: false,
                  attributes: ["id", "asset_id"],
                  include: [
                    {
                      model: Asset,
                      attributes: ["id", "model"],
                      include: [
                        {
                          model: AssetType,
                          attributes: ["id", "name"],
                        },
                      ],
                    },
                  ],
                },
              ],
              where:
                req.body.from != null && req.body.to != null
                  ? { date: { [Op.between]: [req.body.from, req.body.to] } }
                  : req.body.type == 1
                  ? { date: { [Op.eq]: moment().format("YYYY-MM-DD") } }
                  : {},
              order: [[orderColumnName, orderDir]],
              // offset: start,
              // limit: length,
            });
            let data = [];
            let obj = {};
            // console.log(rows)
            if (rows.length > 0) {
              data = rows.map((data: any) => {
                if (
                  moment(moment().format("YYYY-MM-DD"), "YYYY-MM-DD").isAfter(
                    moment(data.date, "YYYY-MM-DD")
                  ) == true
                ) {
                  obj = {
                    id: data.id,
                    date: data.date,
                    type: user.user_type,
                    name: data.dataValues.School
                      ? data.dataValues.School.dataValues.name
                      : "-- --",
                    school_type: data.dataValues.School
                      ? data.dataValues.School.dataValues.school_type
                      : "-- --",
                    service_engineer: data.dataValues.User
                      ? data.dataValues.User.dataValues.user_name
                      : "-- --",
                    phone: data.dataValues.User
                      ? data.dataValues.User.dataValues.phone
                      : "-- --",
                    arrival: data.dataValues.Attendances[0]
                      ? data.dataValues.Attendances[0] &&
                        data.dataValues.Attendances[0].dataValues.check_in
                      : "-- --",
                    departure: data.dataValues.Attendances[0]
                      ? data.dataValues.Attendances[0] &&
                        data.dataValues.Attendances[0].dataValues.check_out
                      : "-- --",
                    status: data.dataValues.Attendances[0]
                      ? data.dataValues.Attendances[0] &&
                        data.dataValues.Attendances[0].dataValues.status
                      : "-- --",
                    model: data.dataValues.Grievance
                      ? data.dataValues.Grievance.dataValues.Asset &&
                        data.dataValues.Grievance.dataValues.Asset.dataValues
                          .model
                      : "",
                    asset: data.dataValues.Grievance
                      ? data.dataValues.Grievance.dataValues.Asset &&
                        data.dataValues.Grievance.dataValues.AssetType &&
                        data.dataValues.Grievance.dataValues.AssetType
                          .dataValues.name
                      : "-- --",
                  };
                  return obj;
                }
              });
              res.json({
                draw: draw,
                recordsTotal: count,
                recordsFiltered: count,
                data: data,
                searchCondition: searchCondition,
                searchValue: searchValue,
              });
            }
          }
        } else {
          res.status(404).send("Schools -- --!");
        }
      }
    }
  } catch (error) {
    console.error("Error while fetching schools:", error);
    if (error) {
      // Log Sequelize validation errors, if any
      console.error("Validation Errors:", error);
    }
    res.status(500).send("Error while fetching schools");
  }
};
export const exportBlukVisitFileToDB: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const filePath = "req.files";
    fs.createReadStream(filePath)
      .pipe(
        parse({
          delimiter: ",",
          headers: ["school_id", "service_engineer", "to", "from"],
        })
      )
      .on("data", async (row: SchoolVisitMembers) => {
        console.log(row);
        // Extract relevant columns from CSV row
        const { school_id, service_engineer, date }: SchoolVisitMembers =
          row;

        const deletedAt: Date | undefined = undefined;
        const startDate = moment(req.body.from, "YYYY-MM-DD");
        const endDate = moment(req.body.to, "YYYY-MM-DD");
        const numberOfDays = endDate.diff(startDate, "days") + 1;

        // function getDates(startDate: any, endDate: any) {
        //   const dates: any = [];
        //   let currentDate = moment(startDate);

        //   while (currentDate.isSameOrBefore(endDate, "day")) {
        //     dates.push(currentDate.format("YYYY-MM-DD"));
        //     currentDate.add(1, "day");
        //   }
        //   return dates;
        // }

        // const allDates = getDates(startDate, endDate);
        // console.log(allDates, numberOfDays)
        // let data;
        // allDates.map(async (val: any) => {
          const obj: any = {
            school_id: school_id,
            service_engineer: service_engineer,
            date: moment(req.body.date, "YYYY-MM-DD")
          };

          await SchoolVisit.create(obj);
        // }
      // );
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
export const bulkUploadSchoolVisit = async (req: Request, res: Response) => {
 
  try {
    const created = await repo.storeDoc(req.files)
    return res.json({success: true,data: 'created'})
} catch (e: any) {
    res.status(400).json({error: e.message})
} 
};