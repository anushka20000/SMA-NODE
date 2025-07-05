import { RequestHandler } from "express";
import { User } from "../models/User";
import { GrievanceRepository } from "../repositories/GrievanceRepository";
import { Grievance } from "../models/Grievance";
const { Op } = require("sequelize");
import jwt from "jsonwebtoken";
import { School } from "../models/School";
import { Asset } from "../models/Asset";
import { AssetType } from "../models/AssetType";
import moment from "moment";
import { GrievanceTimeline } from "../models/GrievanceTimeline";
import { NUMBER, literal } from "sequelize";

const repo = new GrievanceRepository();
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
 *         email:
 *           type: string
 *         password:
 *           type: string
 */
/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard Api
 */
/**
 * @swagger
 * tags:
 *   name: Grievance
 *   description: Grievance Api
 */
/**
 * @swagger
 * tags:
 *   name: School Visit
 *   description: School Visit Api
 */
export const getGrievanceById: RequestHandler = async (req, res, next) => {
  try {
    const data = await repo.getById(req);
    return res.json({ success: true, data: data });
  } catch (e: any) {
    res
      .status(404)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};
export const getGrievanceSchoolList: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const data = await repo.grievanceAssetList(req);
    return res.json({ success: true, data: data });
  } catch (e: any) {
    res
      .status(404)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};

export const saveGrievance: RequestHandler = async (req, res, next) => {
  try {
    const data = await repo.store(req);
    return res.json({ success: true, data: data });
  } catch (e: any) {
    res
      .status(400)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};
export const updateGrievance: RequestHandler = async (req, res, next) => {
  try {
    const data = await repo.update(req);
    return res.json({ success: true, data: data });
  } catch (e: any) {
    res
      .status(400)
      .json({ success: false, error: ["could not update data", e.message] });
  }
};
export const updateGrievanceApp: RequestHandler = async (req, res, next) => {
  try {
    const data = await repo.updateGrievance(req);
    return res.json({ success: true, data: data });
  } catch (e: any) {
    res
      .status(400)
      .json({ success: false, error: ["could not update data", e.message] });
  }
};
export const destroyGrievance: RequestHandler = async (req, res, next) => {
  try {
    await repo.delete(req);
    return res.json({ success: true });
  } catch (e: any) {
    res
      .status(400)
      .json({ success: false, error: ["could not update data", e.message] });
  }
};
export const getGrievancesList: RequestHandler = async (req, res, next) => {
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
      const orderDir = (req.body.order as any)?.[0]?.dir || "DESC";
      const orderColumnName =
        (req.body.columns as any)?.[orderColumnIndex]?.data || "name";

      // Search logic
      let searchCondition = {};
      if (searchValue) {
        searchCondition = {
          [Op.or]: [
            { id: { [Op.eq]: `${searchValue}` } },
            { code: { [Op.like]: `%${searchValue}%` } },
            { raised_by: { [Op.like]: `%${searchValue}%` } },

            // Add other fields if necessary
          ],
        };
      }

      // Fetching the assets with pagination, search, and sort
      if (!req.query.upcoming) {
        if (user.user_type == 4) {
          let outerSearchResults = await Grievance.findAll({
            where:
              searchValue !== null
                ? {
                    [Op.or]: {
                      code: { [Op.like]: `%${searchValue}%` },
                      raised_by: { [Op.like]: `%${searchValue}%` },
                    },
                  }
                : {},
          });
          let outerSearchCondition =
            outerSearchResults.length > 0 ? { [Op.not]: null } : null;

          let innerSearchResults = await Grievance.findAll({
            include: [
              {
                model: School,
                attributes: ["id", "name", "school_type"],
                where:
                  outerSearchCondition == null
                    ? { name: { [Op.like]: `%${searchValue}%` } }
                    : {},
                order: [["name", orderDir]],
              },
            ],
          });
          let innerSearchCondition =
            innerSearchResults.length > 0 ? { [Op.not]: null } : null;

          let innerSearchResultstwo = await Grievance.findAll({
            include: [
              {
                model: Asset,
                attributes: ["id", "model"],
                where:
                  innerSearchCondition == null
                    ? { model: { [Op.like]: `%${searchValue}%` } }
                    : {},
              },
            ],
          });
          let innerSearchConditiontwo =
            innerSearchResultstwo.length > 0 ? { [Op.not]: null } : null;

          let innerSearchResultsthree = await Grievance.findAll({
            include: [
              {
                model: Asset,
                attributes: ["id", "model"],
                where:
                  innerSearchCondition == null &&
                  innerSearchConditiontwo != null
                    ? { model: { [Op.like]: `%${searchValue}%` } }
                    : {},
                include: [
                  {
                    model: AssetType,
                    attributes: ["id", "name"],
                    where:
                      innerSearchConditiontwo == null
                        ? { name: { [Op.like]: `%${searchValue}%` } }
                        : {},
                    order: [["name", orderDir]],
                  },
                ],
              },
            ],
          });
          let innerSearchConditionthree =
            innerSearchResultsthree.length > 0 ? { [Op.not]: null } : null;

          const currentDate: any = moment().format("YYYY-MM-DD");
          const someDate: any = moment(currentDate).add(1, "days");
          const to: any = moment(req.body.to).add(1, "days");
          if (req.body.type == 1) {
            const { count, rows } = await Grievance.findAndCountAll({
              include: [
                {
                  model: School,
                  attributes: [
                    "id",
                    "name",
                    "school_type",
                    "UDISE_code",
                    "district",
                  ],
                  where:
                    outerSearchCondition == null && innerSearchCondition != null
                      ? { name: { [Op.like]: `%${searchValue}%` } }
                      : {},
                  order: [["name", orderDir]],
                },
                {
                  model: Asset,
                  attributes: ["id", "model"],
                  where:
                    innerSearchCondition == null &&
                    innerSearchConditiontwo != null
                      ? { model: { [Op.like]: `%${searchValue}%` } }
                      : {},
                  include: [
                    {
                      model: AssetType,
                      attributes: ["id", "name"],
                      where:
                        innerSearchConditiontwo == null &&
                        innerSearchConditionthree != null
                          ? { name: { [Op.like]: `%${searchValue}%` } }
                          : {},
                      order: [["name", orderDir]],
                    },
                  ],
                },
              ],
              where:
                outerSearchCondition != null
                  ? {
                      [Op.and]: [
                        literal(`DATE(Grievance.createdAt) = '${currentDate}'`), // Compare only the date part
                        {
                          deletedAt: { [Op.is]: null },
                          ...searchCondition,
                          service_engineer: decodedToken.id,
                        },
                      ],
                    }
                  : {
                      [Op.and]: [
                        literal(`DATE(Grievance.createdAt) = '${currentDate}'`), // Compare only the date part
                        {
                          deletedAt: { [Op.is]: null },
                          service_engineer: decodedToken.id,
                        },
                      ],
                    },
              order: [["id", "DESC"]],
              // offset: start,
              limit: length,
            });

            // Formatting the response for datatables.net
            const data = rows.map((grievance: any) => ({
              id: grievance.id,
              code: grievance.code,
              type: user.user_type,
              school_name:
                grievance.dataValues.School &&
                grievance.dataValues.School.dataValues.name,
              school_type:
                grievance.dataValues.School &&
                grievance.dataValues.School.dataValues.school_type,
              support_type:
                grievance.dataValues.support_type == 1
                  ? "Technical"
                  : "Non-Technical",
              asset_name:
                grievance.dataValues.Asset &&
                grievance.dataValues.Asset.dataValues.AssetType.dataValues.name,
              asset_model:
                grievance.dataValues.Asset &&
                grievance.dataValues.Asset.dataValues.model,
              status:
                grievance.status == 0
                  ? "Unassigned"
                  : grievance.status == 1
                  ? "Assigned"
                  : grievance.status == 2
                  ? "Assigned OEM"
                  : grievance.status == 3
                  ? "Completed OEM"
                  : grievance.status == 4
                  ? "Unresolved"
                  : grievance.status == 6
                  ? "Resolved SE"
                  : grievance.status == 7
                  ? "Stolen"
                  : "Completed",
              raised_by: grievance.dataValues.raised_by,
              school_code: grievance.dataValues.School?.dataValues.UDISE_code,
              district: grievance.dataValues.School?.dataValues.district,
            }));

            res.json({
              draw: draw,
              recordsTotal: count,
              recordsFiltered: count,
              data: data,
              searchCondition: searchCondition,
              searchValue: searchValue,
            });
          } else {
            const { count, rows } = await Grievance.findAndCountAll({
              include: [
                {
                  model: School,
                  attributes: [
                    "id",
                    "name",
                    "school_type",
                    "UDISE_code",
                    "district",
                  ],
                  where:
                    outerSearchCondition == null && innerSearchCondition != null
                      ? { name: { [Op.like]: `%${searchValue}%` } }
                      : {},
                  order: [["name", orderDir]],
                },
                {
                  model: Asset,
                  attributes: ["id", "model"],
                  where:
                    innerSearchCondition == null &&
                    innerSearchConditiontwo != null &&
                    req.body.project &&
                    req.body.project != ""
                      ? {
                          model: { [Op.like]: `%${searchValue}%` },
                          project: req.body.project,
                        }
                      : innerSearchCondition == null &&
                        innerSearchConditiontwo != null
                      ? { model: { [Op.like]: `%${searchValue}%` } }
                      : req.body.project && req.body.project != ""
                      ? { project: req.body.project }
                      : {},
                  include: [
                    {
                      model: AssetType,
                      attributes: ["id", "name"],
                      where:
                        innerSearchConditiontwo == null &&
                        innerSearchConditionthree != null
                          ? { name: { [Op.like]: `%${searchValue}%` } }
                          : {},
                      order: [["name", orderDir]],
                    },
                  ],
                },
              ],
              where:
                req.body.from != null &&
                req.body.to != null &&
                req.body.ticketType &&
                req.body.status &&
                outerSearchCondition != null
                  ? {
                      createdAt: {
                        [Op.between]: [req.body.from, req.body.to],
                      },
                      ...searchCondition,
                      service_engineer: decodedToken.id,
                      support_type: req.body.ticketType,
                      status: req.body.status,
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    outerSearchCondition != null
                  ? {
                      createdAt: {
                        [Op.between]: [req.body.from, req.body.to],
                      },
                      ...searchCondition,
                      service_engineer: decodedToken.id,
                    }
                  : req.body.from != null && req.body.to != null
                  ? {
                      createdAt: {
                        [Op.between]: [req.body.from, req.body.to],
                      },
                      service_engineer: decodedToken.id,
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.ticketType &&
                    outerSearchCondition != null
                  ? {
                      createdAt: {
                        [Op.between]: [req.body.from, req.body.to],
                      },
                      ...searchCondition,
                      service_engineer: decodedToken.id,
                      support_type: req.body.ticketType,
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.status &&
                    outerSearchCondition != null
                  ? {
                      createdAt: {
                        [Op.between]: [req.body.from, req.body.to],
                      },
                      ...searchCondition,
                      service_engineer: decodedToken.id,
                      status: req.body.status,
                    }
                  : req.body.ticketType &&
                    req.body.status &&
                    outerSearchCondition != null
                  ? {
                      ...searchCondition,
                      service_engineer: decodedToken.id,
                      support_type: req.body.ticketType,
                      status: req.body.status,
                    }
                  : req.body.ticketType && outerSearchCondition != null
                  ? {
                      ...searchCondition,
                      service_engineer: decodedToken.id,
                      support_type: req.body.ticketType,
                    }
                  : req.body.status && outerSearchCondition != null
                  ? {
                      ...searchCondition,
                      service_engineer: decodedToken.id,
                      status: req.body.status,
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.ticketType &&
                    req.body.status
                  ? {
                      createdAt: {
                        [Op.between]: [req.body.from, req.body.to],
                      },
                      service_engineer: decodedToken.id,
                      support_type: req.body.ticketType,
                      status: req.body.status,
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.ticketType
                  ? {
                      createdAt: {
                        [Op.between]: [req.body.from, req.body.to],
                      },
                      service_engineer: decodedToken.id,
                      support_type: req.body.ticketType,
                      // status: req.body.status,
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.status
                  ? {
                      createdAt: {
                        [Op.between]: [req.body.from, req.body.to],
                      },

                      service_engineer: decodedToken.id,

                      status: req.body.status,
                    }
                  : req.body.ticketType && req.body.status
                  ? {
                      service_engineer: decodedToken.id,
                      support_type: req.body.ticketType,
                      status: req.body.status,
                    }
                  : req.body.ticketType
                  ? {
                      service_engineer: decodedToken.id,
                      support_type: req.body.ticketType,
                    }
                  : req.body.status
                  ? {
                      service_engineer: decodedToken.id,
                      status: req.body.status,
                    }
                  : outerSearchCondition != null
                  ? { ...searchCondition, service_engineer: decodedToken.id }
                  : { service_engineer: decodedToken.id },
              order: [["id", "DESC"]],
              offset: start,
              limit: length,
            });

            // Formatting the response for datatables.net
            const data = rows.map((grievance: any) => ({
              id: grievance.id,
              code: grievance.code,
              type: user.user_type,
              school_name:
                grievance.dataValues.School &&
                grievance.dataValues.School.dataValues.name,
              school_type:
                grievance.dataValues.School &&
                grievance.dataValues.School.dataValues.school_type,
              support_type:
                grievance.dataValues.support_type == 1
                  ? "Technical"
                  : "Non-Technical",
              asset_name:
                grievance.dataValues.Asset &&
                grievance.dataValues.Asset.dataValues.AssetType.dataValues.name,
              asset_model:
                grievance.dataValues.Asset &&
                grievance.dataValues.Asset.dataValues.model,
              status:
                grievance.status == 0
                  ? "Unassigned"
                  : grievance.status == 1
                  ? "Assigned"
                  : grievance.status == 2
                  ? "Assigned OEM"
                  : grievance.status == 3
                  ? "Completed OEM"
                  : grievance.status == 4
                  ? "Unresolved"
                  : grievance.status == 6
                  ? "Resolved SE"
                  : grievance.status == 7
                  ? "Stolen"
                  : "Completed",
              raised_by: grievance.dataValues.raised_by,
              school_code: grievance.dataValues.School?.dataValues.UDISE_code,
              district: grievance.dataValues.School?.dataValues.district,
            }));
            const excelData = await Grievance.findAll({
              include: [
                {
                  model: School,
                  attributes: [
                    "id",
                    "name",
                    "school_type",
                    "UDISE_code",
                    "district",
                  ],
                  order: [["name", orderDir]],
                },
                {
                  model: Asset,
                  attributes: ["id", "model", "project"],
                  include: [
                    {
                      model: AssetType,
                      attributes: ["id", "name"],
                      order: [["name", orderDir]],
                    },
                  ],
                },
              ],
              where: { service_engineer: decodedToken.id },
              order: [["id", "DESC"]],
            });
            const dataForExcel = excelData.map((grievance: any) => ({
              // id: grievance.id,
              project_type: grievance.dataValues.Asset?.dataValues.project,
              code: grievance.code,
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
              school_name: grievance.dataValues.School?.dataValues.name,
              school_type:
                grievance.dataValues.School?.dataValues.school_type == 1
                  ? "Elementary"
                  : "Secondary",
              support_type:
                grievance.dataValues.support_type == 1
                  ? "Technical"
                  : "Non-Technical",
              asset_name:
                grievance.dataValues.Asset?.dataValues.AssetType?.dataValues
                  .name,
              asset_model: grievance.dataValues.Asset?.dataValues.model,
              status:
                grievance.status == 0
                  ? "Unassigned"
                  : grievance.status == 1
                  ? "Assigned"
                  : grievance.status == 2
                  ? "Assigned OEM"
                  : grievance.status == 3
                  ? "Completed OEM"
                  : grievance.status == 4
                  ? "Unresolved"
                  : "Completed",
              raised_by: grievance.dataValues.raised_by,
              school_code: grievance.dataValues.School?.dataValues.UDISE_code,
              district: grievance.dataValues.School?.dataValues.district,
            }));

            res.json({
              draw: draw,
              recordsTotal: count,
              recordsFiltered: count,
              data: data,
              searchCondition: searchCondition,
              searchValue: searchValue,
              excel: dataForExcel,
            });
          }
        } else if (user.user_type == 2) {
          const { count, rows } = await Grievance.findAndCountAll({
            include: [
              { model: School, attributes: ["id", "name", "school_type"] },
              {
                model: Asset,
                attributes: ["id", "model"],
                include: [{ model: AssetType, attributes: ["id", "name"] }],
              },
            ],
            where:
              req.body.from != null &&
              req.body.to != null &&
              req.body.ticketType &&
              req.body.status
                ? {
                    createdAt: { [Op.between]: [req.body.from, req.body.to] },
                    ...searchCondition,
                    oem_id: decodedToken.id,
                    support_type: req.body.ticketType,
                    status: req.body.status,
                  }
                : req.body.from != null &&
                  req.body.to != null &&
                  req.body.ticketType
                ? {
                    createdAt: { [Op.between]: [req.body.from, req.body.to] },
                    ...searchCondition,
                    oem_id: decodedToken.id,
                    support_type: req.body.ticketType,
                  }
                : req.body.from != null &&
                  req.body.to != null &&
                  req.body.status
                ? {
                    createdAt: { [Op.between]: [req.body.from, req.body.to] },
                    ...searchCondition,
                    oem_id: decodedToken.id,

                    status: req.body.status,
                  }
                : req.body.ticketType && req.body.status
                ? {
                    ...searchCondition,
                    oem_id: decodedToken.id,
                    support_type: req.body.ticketType,
                    status: req.body.status,
                  }
                : req.body.ticketType
                ? {
                    ...searchCondition,
                    oem_id: decodedToken.id,
                    support_type: req.body.ticketType,
                  }
                : req.body.status
                ? {
                    ...searchCondition,
                    oem_id: decodedToken.id,
                    status: req.body.status,
                  }
                : { ...searchCondition, oem_id: decodedToken.id },
            order: [["id", "DESC"]],
            offset: start,
            limit: length,
          });

          // Formatting the response for datatables.net
          const data = rows.map((grievance: any) => ({
            id: grievance.id,
            code: grievance.code,
            type: user.user_type,
            school_name:
              grievance.dataValues.School &&
              grievance.dataValues.School.dataValues.name,
            school_type:
              grievance.dataValues.School &&
              grievance.dataValues.School.dataValues.school_type,
            support_type:
              grievance.dataValues.support_type == 1
                ? "Technical"
                : "Non-Technical",
            asset_name:
              grievance.dataValues.Asset &&
              grievance.dataValues.Asset.dataValues.AssetType.dataValues.name,
            asset_model:
              grievance.dataValues.Asset &&
              grievance.dataValues.Asset.dataValues.model,
            status:
              grievance.status == 0
                ? "Unassigned"
                : grievance.status == 1
                ? "Assigned"
                : grievance.status == 2
                ? "Assigned OEM"
                : grievance.status == 3
                ? "Completed OEM"
                : grievance.status == 4
                ? "Unresolved"
                : "Completed",
            raised_by: grievance.dataValues.raised_by,
            school_code: grievance.dataValues.School?.dataValues.UDISE_code,
            district: grievance.dataValues.School?.dataValues.district,
          }));

          res.json({
            draw: draw,
            recordsTotal: count,
            recordsFiltered: count,
            data: data,
            searchCondition: searchCondition,
            searchValue: searchValue,
          });
        } else if (user.user_type == 3) {
          let outerSearchResults = await Grievance.findAll({
            where:
              searchValue !== null
                ? {
                    [Op.or]: {
                      code: { [Op.like]: `%${searchValue}%` },
                      raised_by: { [Op.like]: `%${searchValue}%` },
                    },
                  }
                : {},
          });
          let outerSearchCondition =
            outerSearchResults.length > 0 ? { [Op.not]: null } : null;

          let innerSearchResults = await Grievance.findAll({
            include: [
              {
                model: School,
                attributes: ["id", "name", "school_type"],
                where:
                  outerSearchCondition == null
                    ? { name: { [Op.like]: `%${searchValue}%` } }
                    : {},
                order: [["name", orderDir]],
              },
            ],
          });
          let innerSearchCondition =
            innerSearchResults.length > 0 ? { [Op.not]: null } : null;

          let innerSearchResultstwo = await Grievance.findAll({
            include: [
              {
                model: Asset,
                attributes: ["id", "model"],
                where:
                  innerSearchCondition == null
                    ? { model: { [Op.like]: `%${searchValue}%` } }
                    : {},
              },
            ],
          });
          let innerSearchConditiontwo =
            innerSearchResultstwo.length > 0 ? { [Op.not]: null } : null;

          let innerSearchResultsthree = await Grievance.findAll({
            include: [
              {
                model: Asset,
                attributes: ["id", "model"],
                where:
                  innerSearchCondition == null &&
                  innerSearchConditiontwo != null
                    ? { model: { [Op.like]: `%${searchValue}%` } }
                    : {},
                include: [
                  {
                    model: AssetType,
                    attributes: ["id", "name"],
                    where:
                      innerSearchConditiontwo == null
                        ? { name: { [Op.like]: `%${searchValue}%` } }
                        : {},
                    order: [["name", orderDir]],
                  },
                ],
              },
            ],
          });
          let innerSearchConditionthree =
            innerSearchResultsthree.length > 0 ? { [Op.not]: null } : null;

          const currentDate: any = moment().format("YYYY-MM-DD");
          const someDate: any = moment(currentDate).add(1, "days");
          const to: any = moment(req.body.to).add(1, "days");
          const { count, rows } = await Grievance.findAndCountAll({
            include: [
              {
                model: School,
                attributes: [
                  "id",
                  "name",
                  "school_type",
                  "UDISE_code",
                  "district",
                ],
                where:
                  outerSearchCondition == null && innerSearchCondition != null
                    ? { name: { [Op.like]: `%${searchValue}%` } }
                    : {},
                order: [["name", orderDir]],
              },
              {
                model: Asset,
                attributes: ["id", "model"],
                where:
                  innerSearchCondition == null &&
                  innerSearchConditiontwo != null &&
                  req.body.project &&
                  req.body.project != ""
                    ? {
                        model: { [Op.like]: `%${searchValue}%` },
                        project: req.body.project,
                      }
                    : innerSearchCondition == null &&
                      innerSearchConditiontwo != null
                    ? { model: { [Op.like]: `%${searchValue}%` } }
                    : req.body.project && req.body.project != ""
                    ? { project: req.body.project }
                    : {},
                include: [
                  {
                    model: AssetType,
                    attributes: ["id", "name"],
                    where:
                      innerSearchConditiontwo == null &&
                      innerSearchConditionthree != null
                        ? { name: { [Op.like]: `%${searchValue}%` } }
                        : {},
                    order: [["name", orderDir]],
                  },
                ],
              },
            ],
            where:
              req.body.from != null &&
              req.body.to != null &&
              req.body.ticketType &&
              req.body.status
                ? {
                    createdAt: { [Op.between]: [req.body.from, req.body.to] },
                    ...searchCondition,
                    school_id: user.school_id,
                    support_type: req.body.ticketType,
                    status: req.body.status,
                  }
                : req.body.from != null &&
                  req.body.to != null &&
                  req.body.ticketType
                ? {
                    createdAt: { [Op.between]: [req.body.from, req.body.to] },
                    ...searchCondition,
                    school_id: user.school_id,
                    support_type: req.body.ticketType,
                  }
                : req.body.from != null &&
                  req.body.to != null &&
                  req.body.status
                ? {
                    createdAt: { [Op.between]: [req.body.from, req.body.to] },
                    ...searchCondition,
                    school_id: user.school_id,
                    status: req.body.status,
                  }
                : req.body.ticketType && req.body.status
                ? {
                    ...searchCondition,
                    school_id: user.school_id,
                    support_type: req.body.ticketType,
                    status: req.body.status,
                  }
                : req.body.ticketType
                ? {
                    ...searchCondition,
                    school_id: user.school_id,
                    support_type: req.body.ticketType,
                  }
                : req.body.status
                ? {
                    ...searchCondition,
                    school_id: user.school_id,
                    status: req.body.status,
                  }
                : outerSearchCondition != null
                ? { ...searchCondition, school_id: user.school_id }
                : { school_id: user.school_id },
            order: [["id", "DESC"]],
            offset: start,
            limit: length,
          });

          // Formatting the response for datatables.net
          const data = rows.map((grievance: any) => ({
            id: grievance.id,
            code: grievance.code,
            type: user.user_type,
            school_name:
              grievance.dataValues.School &&
              grievance.dataValues.School.dataValues.name,
            school_type:
              grievance.dataValues.School &&
              grievance.dataValues.School.dataValues.school_type,
            support_type:
              grievance.dataValues.support_type == 1
                ? "Technical"
                : "Non-Technical",
            asset_name:
              grievance.dataValues.Asset &&
              grievance.dataValues.Asset.dataValues.AssetType.dataValues.name,
            asset_model:
              grievance.dataValues.Asset &&
              grievance.dataValues.Asset.dataValues.model,
            status:
              grievance.status == 0
                ? "Unassigned"
                : grievance.status == 1
                ? "Assigned"
                : grievance.status == 2
                ? "Assigned OEM"
                : grievance.status == 3
                ? "Completed OEM"
                : grievance.status == 4
                ? "Unresolved"
                : grievance.status == 6
              ?
              "Resolved SE"
              : grievance.status == 7
              ?
              "Stolen"
                : "Completed",
            raised_by: grievance.dataValues.raised_by,
            school_code: grievance.dataValues.School?.dataValues.UDISE_code,
            district: grievance.dataValues.School?.dataValues.district,
          }));
          const excelData = await Grievance.findAll({
            include: [
              {
                model: School,
                attributes: [
                  "id",
                  "name",
                  "school_type",
                  "UDISE_code",
                  "district",
                ],
                order: [["name", orderDir]],
              },
              {
                model: Asset,
                attributes: ["id", "model", "project"],
                include: [
                  {
                    model: AssetType,
                    attributes: ["id", "name"],
                    order: [["name", orderDir]],
                  },
                ],
              },
            ],
            where: { school_id: user.school_id },
            order: [["id", "DESC"]],
          });
          const dataForExcel = excelData.map((grievance: any) => ({
            // id: grievance.id,
            project_type: grievance.dataValues.Asset?.dataValues.project,
            code: grievance.code,
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
            school_name: grievance.dataValues.School?.dataValues.name,
            school_type:
              grievance.dataValues.School?.dataValues.school_type == 1
                ? "Elementary"
                : "Secondary",
            support_type:
              grievance.dataValues.support_type == 1
                ? "Technical"
                : "Non-Technical",
            asset_name:
              grievance.dataValues.Asset?.dataValues.AssetType?.dataValues.name,
            asset_model: grievance.dataValues.Asset?.dataValues.model,
            status:
              grievance.status == 0
                ? "Unassigned"
                : grievance.status == 1
                ? "Assigned"
                : grievance.status == 2
                ? "Assigned OEM"
                : grievance.status == 3
                ? "Completed OEM"
                : grievance.status == 4
                ? "Unresolved"
                : grievance.status == 6
              ?
              "Resolved SE"
              : grievance.status == 7
              ?
              "Stolen"
                : "Completed",
            raised_by: grievance.dataValues.raised_by,
            school_code: grievance.dataValues.School?.dataValues.UDISE_code,
            district: grievance.dataValues.School?.dataValues.district,
          }));
          res.json({
            draw: draw,
            recordsTotal: count,
            recordsFiltered: count,
            data: data,
            searchCondition: searchCondition,
            searchValue: searchValue,
            excel: dataForExcel,
          });
        }
        // else if (user.user_type == 5) {
        //   const currentDate: any = moment().format("YYYY-MM-DD");
        //   const someDate: any = moment(currentDate).add(1, "days");
        //   const to: any = moment(req.body.to).add(1, "days");
        //   const { count, rows } = await Grievance.findAndCountAll({
        //     include: [
        //       {
        //         model: School,
        //         attributes: ["id", "name", "school_type"],
        //         where:
        //           outerSearchCondition == null && innerSearchCondition != null
        //             ? { name: { [Op.like]: `%${searchValue}%` } }
        //             : {},
        //         order: [["name", orderDir]],
        //       },
        //       {
        //         model: Asset,
        //         attributes: ["id", "model"],
        //         where:
        //           innerSearchCondition == null &&
        //           innerSearchConditiontwo != null
        //             ? { model: { [Op.like]: `%${searchValue}%` } }
        //             : {},
        //         include: [
        //           {
        //             model: AssetType,
        //             attributes: ["id", "name"],
        //             where:
        //               innerSearchConditiontwo == null &&
        //               innerSearchConditionthree != null
        //                 ? { name: { [Op.like]: `%${searchValue}%` } }
        //                 : {},
        //             order: [["name", orderDir]],
        //           },
        //         ],
        //       },
        //     ],
        //     where:
        //       outerSearchCondition != null
        //         ? {
        //             [Op.and]: [
        //               literal(`DATE(Grievance.createdAt) = '${currentDate}'`), // Compare only the date part
        //               { ...searchCondition, deletedAt: { [Op.is]: null } },
        //             ],
        //           }
        //         : {
        //             [Op.and]: [
        //               literal(`DATE(Grievance.createdAt) = '${currentDate}'`), // Compare only the date part
        //               { deletedAt: { [Op.is]: null } },
        //             ],
        //           },
        //     order: [["id", "DESC"]],
        //     offset: start,
        //     limit: length,
        //   });
        //   // console.log(rows)
        //   // const result = rows.map((val: any) => {
        //   //   if (val.dataValues.School.length > 0) {
        //   //     // Your logic when School length is greater than 0
        //   //   }
        //   // })
        //   const data = rows.map((grievance: any) => ({
        //     id: grievance.id,
        //     code: grievance.code,
        //     type: user.user_type,
        //     school_name:
        //       grievance.dataValues.School &&
        //       grievance.dataValues.School.dataValues.name,
        //     school_type:
        //       grievance.dataValues.School &&
        //       grievance.dataValues.School.dataValues.school_type,
        //     support_type:
        //       grievance.dataValues.support_type == 1
        //         ? "Technical"
        //         : "Non-Technical",
        //     asset_name:
        //       grievance.dataValues.Asset &&
        //       grievance.dataValues.Asset.dataValues.AssetType.dataValues.name,
        //     asset_model:
        //       grievance.dataValues.Asset &&
        //       grievance.dataValues.Asset.dataValues.model,
        //     status:
        //       grievance.status == 0
        //         ? "Unassigned"
        //         : grievance.status == 1
        //         ? "Assigned"
        //         : grievance.status == 2
        //         ? "Assigned OEM"
        //         : grievance.status == 3
        //         ? "Completed OEM"
        //         : grievance.status == 4
        //         ? "Unresolved"
        //         : "Completed",
        //     raised_by: grievance.dataValues.raised_by,
        //   }));

        //   res.json({
        //     draw: draw,
        //     recordsTotal: count,
        //     recordsFiltered: count,
        //     data: data,
        //     searchCondition: searchCondition,
        //     searchValue: searchValue,
        //   });
        // }
        else if (user.user_type == 1 || user.user_type == 5) {
          let outerSearchResults = await Grievance.findAll({
            where:
              searchValue !== null
                ? {
                    [Op.or]: {
                      code: { [Op.like]: `%${searchValue}%` },
                      raised_by: { [Op.like]: `%${searchValue}%` },
                    },
                  }
                : {},
          });
          let outerSearchCondition =
            outerSearchResults.length > 0 ? { [Op.not]: null } : null;

          let innerSearchResults = await Grievance.findAll({
            include: [
              {
                model: School,
                attributes: ["id", "name", "school_type"],
                where:
                  outerSearchCondition == null
                    ? { name: { [Op.like]: `%${searchValue}%` } }
                    : {},
                order: [["name", orderDir]],
              },
            ],
          });
          let innerSearchCondition =
            innerSearchResults.length > 0 ? { [Op.not]: null } : null;

          let innerSearchResultstwo = await Grievance.findAll({
            include: [
              {
                model: Asset,
                attributes: ["id", "model"],
                where:
                  innerSearchCondition == null
                    ? { model: { [Op.like]: `%${searchValue}%` } }
                    : {},
              },
            ],
          });
          let innerSearchConditiontwo =
            innerSearchResultstwo.length > 0 ? { [Op.not]: null } : null;

          let innerSearchResultsthree = await Grievance.findAll({
            include: [
              {
                model: Asset,
                attributes: ["id", "model"],
                where:
                  innerSearchCondition == null &&
                  innerSearchConditiontwo != null
                    ? { model: { [Op.like]: `%${searchValue}%` } }
                    : {},
                include: [
                  {
                    model: AssetType,
                    attributes: ["id", "name"],
                    where:
                      innerSearchConditiontwo == null
                        ? { name: { [Op.like]: `%${searchValue}%` } }
                        : {},
                    order: [["name", orderDir]],
                  },
                ],
              },
            ],
          });
          let innerSearchConditionthree =
            innerSearchResultsthree.length > 0 ? { [Op.not]: null } : null;

          const currentDate: any = moment().format("YYYY-MM-DD");
          const someDate: any = moment(currentDate).add(1, "days");
          const to: any = moment(req.body.to).add(1, "days");
          if (req.body.type == 1) {
            const { count, rows } = await Grievance.findAndCountAll({
              include: [
                {
                  model: School,
                  attributes: [
                    "id",
                    "name",
                    "school_type",
                    "UDISE_code",
                    "district",
                  ],
                  where:
                    outerSearchCondition == null && innerSearchCondition != null
                      ? { name: { [Op.like]: `%${searchValue}%` } }
                      : {},
                  order: [["name", orderDir]],
                },
                {
                  model: Asset,
                  attributes: ["id", "model"],
                  where:
                    innerSearchCondition == null &&
                    innerSearchConditiontwo != null
                      ? { model: { [Op.like]: `%${searchValue}%` } }
                      : {},
                  include: [
                    {
                      model: AssetType,
                      attributes: ["id", "name"],
                      where:
                        innerSearchConditiontwo == null &&
                        innerSearchConditionthree != null
                          ? { name: { [Op.like]: `%${searchValue}%` } }
                          : {},
                      order: [["name", orderDir]],
                    },
                  ],
                },
              ],
              where:
                outerSearchCondition != null
                  ? {
                      [Op.and]: [
                        literal(`DATE(Grievance.createdAt) = '${currentDate}'`), // Compare only the date part
                        { ...searchCondition, deletedAt: { [Op.is]: null } },
                      ],
                    }
                  : {
                      [Op.and]: [
                        literal(`DATE(Grievance.createdAt) = '${currentDate}'`), // Compare only the date part
                        { deletedAt: { [Op.is]: null } },
                      ],
                    },
              order: [["id", "DESC"]],
              offset: start,
              limit: length,
            });

            const data = rows.map((grievance: any) => ({
              id: grievance.id,
              code: grievance.code,
              type: user.user_type,
              school_name:
                grievance.dataValues.School &&
                grievance.dataValues.School.dataValues.name,
              school_type:
                grievance.dataValues.School &&
                grievance.dataValues.School.dataValues.school_type,
              support_type:
                grievance.dataValues.support_type == 1
                  ? "Technical"
                  : "Non-Technical",
              asset_name:
                grievance.dataValues.Asset &&
                grievance.dataValues.Asset.dataValues.AssetType.dataValues.name,
              asset_model:
                grievance.dataValues.Asset &&
                grievance.dataValues.Asset.dataValues.model,
              status:
                grievance.status == 0
                  ? "Unassigned"
                  : grievance.status == 1
                  ? "Assigned"
                  : grievance.status == 2
                  ? "Assigned OEM"
                  : grievance.status == 3
                  ? "Completed OEM"
                  : grievance.status == 4
                  ? "Unresolved"
                  : grievance.status == 6
                  ? "Resolved SE"
                  : grievance.status == 7
                  ? "Stolen"
                  : "Completed",
              raised_by: grievance.dataValues.raised_by,
              school_code: grievance.dataValues.School?.dataValues.UDISE_code,
              district: grievance.dataValues.School?.dataValues.district,
            }));

            const excelData = await Grievance.findAll({
              include: [
                {
                  model: School,
                  attributes: [
                    "id",
                    "name",
                    "school_type",
                    "UDISE_code",
                    "district",
                  ],
                  order: [["name", orderDir]],
                },
                {
                  model: Asset,
                  attributes: ["id", "model","project"],
                  include: [
                    {
                      model: AssetType,
                      attributes: ["id", "name"],
                      order: [["name", orderDir]],
                    },
                  ],
                },
              ],
              where: {
                deletedAt: { [Op.is]: null },
              },
              order: [["id", "DESC"]],
            });
            const dataForExcel = excelData.map((grievance: any) => ({
              // id: grievance.id,
              project_type: grievance.dataValues.Asset?.dataValues.project,
              code: grievance.code,
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
              school_name: grievance.dataValues.School?.dataValues.name,
              school_code: grievance.dataValues.School?.dataValues.UDISE_code,
              district: grievance.dataValues.School?.dataValues.district,
              school_type:
                grievance.dataValues.School?.dataValues.school_type == 1
                  ? "Elementary"
                  : "Secondary",
              support_type:
                grievance.dataValues.support_type == 1
                  ? "Technical"
                  : "Non-Technical",
              asset_name:
                grievance.dataValues.Asset?.dataValues.AssetType?.dataValues
                  .name,
              asset_model: grievance.dataValues.Asset?.dataValues.model,
              status:
                grievance.status == 0
                  ? "Unassigned"
                  : grievance.status == 1
                  ? "Assigned"
                  : grievance.status == 2
                  ? "Assigned OEM"
                  : grievance.status == 3
                  ? "Completed OEM"
                  : grievance.status == 4
                  ? "Unresolved"
                  : grievance.status == 6
                  ? "Resolved SE"
                  : grievance.status == 7
                  ? "Stolen"
                  : "Completed",
              raised_by: grievance.dataValues.raised_by,
            }));
            res.json({
              draw: draw,
              recordsTotal: count,
              recordsFiltered: count,
              data: data,
              searchCondition: searchCondition,
              searchValue: searchValue,
              excel: dataForExcel,
            });
          } else {
            console.log(req.body.type);

            const { count, rows } = await Grievance.findAndCountAll({
              include: [
                {
                  model: School,
                  attributes: [
                    "id",
                    "name",
                    "school_type",
                    "UDISE_code",
                    "district",
                  ],
                  where:
                    outerSearchCondition == null && innerSearchCondition != null
                      ? { name: { [Op.like]: `%${searchValue}%` } }
                      : {},
                  order: [["name", orderDir]],
                },
                {
                  model: Asset,
                  attributes: ["id", "model"],
                  where:
                    innerSearchCondition == null &&
                    innerSearchConditiontwo != null &&
                    req.body.project &&
                    req.body.project != ""
                      ? {
                          model: { [Op.like]: `%${searchValue}%` },
                          project: req.body.project,
                        }
                      : innerSearchCondition == null &&
                        innerSearchConditiontwo != null
                      ? { model: { [Op.like]: `%${searchValue}%` } }
                      : req.body.project && req.body.project != ""
                      ? { project: req.body.project }
                      : {},
                  include: [
                    {
                      model: AssetType,
                      attributes: ["id", "name"],
                      where:
                        innerSearchConditiontwo == null &&
                        innerSearchConditionthree != null
                          ? { name: { [Op.like]: `%${searchValue}%` } }
                          : {},
                      order: [["name", orderDir]],
                    },
                  ],
                },
              ],
              where:
                req.body.from != null &&
                req.body.to != null &&
                req.body.ticketType &&
                req.body.status &&
                outerSearchCondition != null
                  ? {
                      createdAt: {
                        [Op.gte]: new Date(req.body.from),
                        [Op.lt]: new Date(to),
                      },
                      ...searchCondition,
                      support_type: req.body.ticketType,
                      status: req.body.status,
                      deletedAt: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.ticketType &&
                    outerSearchCondition != null
                  ? {
                      createdAt: {
                        [Op.gte]: new Date(req.body.from),
                        [Op.lt]: new Date(to),
                      },
                      ...searchCondition,
                      support_type: req.body.ticketType,
                      deletedAt: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.status &&
                    outerSearchCondition != null
                  ? {
                      createdAt: {
                        [Op.gte]: new Date(req.body.from),
                        [Op.lt]: new Date(to),
                      },
                      ...searchCondition,
                      status: req.body.status,
                      deletedAt: { [Op.is]: null },
                    }
                  : req.body.from != null && req.body.to != null
                  ? {
                      createdAt: {
                        [Op.gte]: new Date(req.body.from),
                        [Op.lt]: new Date(to),
                      },
                      deletedAt: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    outerSearchCondition != null
                  ? {
                      createdAt: {
                        [Op.gte]: new Date(req.body.from),
                        [Op.lt]: new Date(to),
                      },
                      ...searchCondition,
                      deletedAt: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.status
                  ? {
                      createdAt: {
                        [Op.gte]: new Date(req.body.from),
                        [Op.lt]: new Date(to),
                      },

                      status: req.body.status,
                      deletedAt: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.status &&
                    outerSearchCondition != null &&
                    req.body.ticketType
                  ? {
                      createdAt: {
                        [Op.gte]: new Date(req.body.from),
                        [Op.lt]: new Date(to),
                      },
                      ...searchCondition,
                      status: req.body.status,
                      support_type: req.body.ticketType,
                      deletedAt: { [Op.is]: null },
                    }
                  : req.body.from != null &&
                    req.body.to != null &&
                    req.body.ticketType
                  ? {
                      createdAt: {
                        [Op.gte]: new Date(req.body.from),
                        [Op.lt]: new Date(to),
                      },

                      support_type: req.body.ticketType,
                      deletedAt: { [Op.is]: null },
                    }
                  : req.body.type == 1 &&
                    req.body.ticketType &&
                    req.body.status &&
                    outerSearchCondition != null
                  ? {
                      createdAt: {
                        [Op.gte]: new Date(currentDate),
                        [Op.lt]: new Date(someDate),
                      },
                      support_type: req.body.ticketType,
                      status: req.body.status,
                      ...searchCondition,
                      deletedAt: { [Op.is]: null },
                    }
                  : req.body.type == 1 &&
                    req.body.ticketType &&
                    outerSearchCondition != null
                  ? {
                      createdAt: {
                        [Op.gte]: new Date(currentDate),
                        [Op.lt]: new Date(someDate),
                      },
                      support_type: req.body.ticketType,
                      ...searchCondition,
                      deletedAt: { [Op.is]: null },
                    }
                  : req.body.type == 1 &&
                    req.body.status &&
                    outerSearchCondition != null
                  ? {
                      createdAt: {
                        [Op.gte]: new Date(currentDate),
                        [Op.lt]: new Date(someDate),
                      },
                      status: req.body.status,
                      ...searchCondition,
                      deletedAt: { [Op.is]: null },
                    }
                  : req.body.ticketType &&
                    req.body.status &&
                    outerSearchCondition != null
                  ? {
                      ...searchCondition,
                      support_type: req.body.ticketType,
                      status: req.body.status,
                      deletedAt: { [Op.is]: null },
                    }
                  : req.body.ticketType && outerSearchCondition != null
                  ? {
                      ...searchCondition,
                      support_type: req.body.ticketType,
                      deletedAt: { [Op.is]: null },
                    }
                  : req.body.status && outerSearchCondition != null
                  ? {
                      ...searchCondition,
                      status: req.body.status,
                      deletedAt: { [Op.is]: null },
                    }
                  : outerSearchCondition != null
                  ? { ...searchCondition, deletedAt: { [Op.is]: null } }
                  : {
                      deletedAt: { [Op.is]: null },
                    },
              order: [["id", "DESC"]],
              offset: start,
              limit: length,
            });
            const excelData = await Grievance.findAll({
              include: [
                {
                  model: School,
                  attributes: [
                    "id",
                    "name",
                    "school_type",
                    "UDISE_code",
                    "district",
                  ],
                  order: [["name", orderDir]],
                },
                {
                  model: Asset,
                  attributes: ["id", "model","project"],
                  include: [
                    {
                      model: AssetType,
                      attributes: ["id", "name"],
                      order: [["name", orderDir]],
                    },
                  ],
                },
              ],
              where: {
                deletedAt: { [Op.is]: null },
              },
              order: [["id", "DESC"]],
            });
            const dataForExcel = excelData.map((grievance: any) => ({
              // id: grievance.id,
              project_type: grievance.dataValues.Asset?.dataValues.project,
              code: grievance.code,
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
              school_name: grievance.dataValues.School?.dataValues.name,
              school_type:
                grievance.dataValues.School?.dataValues.school_type == 1
                  ? "Elementary"
                  : "Secondary",
              support_type:
                grievance.dataValues.support_type == 1
                  ? "Technical"
                  : "Non-Technical",
              asset_name:
                grievance.dataValues.Asset?.dataValues.AssetType?.dataValues
                  .name,
              asset_model: grievance.dataValues.Asset?.dataValues.model,
              status:
                grievance.status == 0
                  ? "Unassigned"
                  : grievance.status == 1
                  ? "Assigned"
                  : grievance.status == 2
                  ? "Assigned OEM"
                  : grievance.status == 3
                  ? "Completed OEM"
                  : grievance.status == 4
                  ? "Unresolved"
                  : grievance.status == 6
              ?
              "Resolved SE"
              : grievance.status == 7
              ?
              "Stolen"
                  : "Completed",
              raised_by: grievance.dataValues.raised_by,
              school_code: grievance.dataValues.School?.dataValues.UDISE_code,
              district: grievance.dataValues.School?.dataValues.district,
            }));
            const data = rows.map((grievance: any) => ({
              id: grievance.id,
              code: grievance.code,
              type: user.user_type,
              school_name:
                grievance.dataValues.School &&
                grievance.dataValues.School.dataValues.name,
              school_type:
                grievance.dataValues.School &&
                grievance.dataValues.School.dataValues.school_type,
              support_type:
                grievance.dataValues.support_type == 1
                  ? "Technical"
                  : "Non-Technical",
              asset_name:
                grievance.dataValues.Asset &&
                grievance.dataValues.Asset.dataValues.AssetType.dataValues.name,
              asset_model:
                grievance.dataValues.Asset &&
                grievance.dataValues.Asset.dataValues.model,
              status:
                grievance.status == 0
                  ? "Unassigned"
                  : grievance.status == 1
                  ? "Assigned"
                  : grievance.status == 2
                  ? "Assigned OEM"
                  : grievance.status == 3
                  ? "Completed OEM"
                  : grievance.status == 4
                  ? "Unresolved"
                  : grievance.status == 6
                  ? "Resolved SE"
                  : grievance.status == 7
                  ? "Stolen"
                  : "Completed",
              raised_by: grievance.dataValues.raised_by,
              school_code: grievance.dataValues.School?.dataValues.UDISE_code,
              district: grievance.dataValues.School?.dataValues.district,
            }));

            res.json({
              draw: draw,
              recordsTotal: count,
              recordsFiltered: count,
              data: data,
              searchCondition: searchCondition,
              searchValue: searchValue,
              excel: dataForExcel,
            });
          }
        }
      }
      if (req.query.upcoming == "true") {
        if (user.user_type == 4) {
          const { count, rows } = await Grievance.findAndCountAll({
            include: [
              { model: School, attributes: ["id", "name", "school_type"] },
              {
                model: Asset,
                attributes: ["model"],
                include: [{ model: AssetType, attributes: ["id", "name"] }],
              },
            ],
            where:
              req.body.from != null && req.body.to != null
                ? {
                    createdAt: {
                      [Op.between]: [req.body.from, req.body.to],
                      searchCondition,
                      service_engineer: decodedToken.id,
                    },
                  }
                : { ...searchCondition, service_engineer: decodedToken.id },
            order: [["id", "DESC"]],
            // offset: start,
            limit: length,
          });

          // Formatting the response for datatables.net
          let obj = {};
          const data = rows.map((grievance: any) => {
            if (
              moment(moment().format("YYYY-MM-DD"), "YYYY-MM-DD").isBefore(
                moment(grievance.createdAt, "YYYY-MM-DD")
              )
            ) {
              obj = {
                id: grievance.id,
                code: grievance.code,
                type: user.user_type,
                school_name:
                  grievance.dataValues.School &&
                  grievance.dataValues.School.dataValues.name,
                school_type:
                  grievance.dataValues.School &&
                  grievance.dataValues.School.dataValues.school_type,
                support_type:
                  grievance.dataValues.support_type == 1
                    ? "Technical"
                    : "Non-Technical",
                asset_name:
                  grievance.dataValues.Asset &&
                  grievance.dataValues.Asset.dataValues.AssetType.dataValues
                    .name,
                asset_model:
                  grievance.dataValues.Asset &&
                  grievance.dataValues.Asset.dataValues.model,
                status:
                  grievance.status == 0
                    ? "Unassigned"
                    : grievance.status == 1
                    ? "Assigned"
                    : grievance.status == 2
                    ? "Assigned OEM"
                    : grievance.status == 3
                    ? "Completed OEM"
                    : grievance.status == 4
                    ? "Unresolved"
                    : "Completed",
                raised_by: grievance.dataValues.raised_by,
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
        } else if (user.user_type == 2) {
          const { count, rows } = await Grievance.findAndCountAll({
            include: [
              { model: School, attributes: ["id", "name", "school_type"] },
              {
                model: Asset,
                attributes: ["model"],
                include: [{ model: AssetType, attributes: ["id", "name"] }],
              },
            ],
            where:
              req.body.from != null && req.body.to != null
                ? {
                    createdAt: { [Op.between]: [req.body.from, req.body.to] },
                    ...searchCondition,
                    oem_id: decodedToken.id,
                  }
                : { ...searchCondition, oem_id: decodedToken.id },
            order: [["id", "DESC"]],
            offset: start,
            limit: length,
          });

          // Formatting the response for datatables.net
          let obj = {};
          const data = rows.map((grievance: any) => {
            if (
              moment(moment().format("YYYY-MM-DD"), "YYYY-MM-DD").isBefore(
                moment(grievance.createdAt, "YYYY-MM-DD")
              )
            ) {
              obj = {
                id: grievance.id,
                code: grievance.code,
                type: user.user_type,
                school_name:
                  grievance.dataValues.School &&
                  grievance.dataValues.School.dataValues.name,
                school_type:
                  grievance.dataValues.School &&
                  grievance.dataValues.School.dataValues.school_type,
                support_type:
                  grievance.dataValues.support_type == 1
                    ? "Technical"
                    : "Non-Technical",
                asset_name:
                  grievance.dataValues.Asset &&
                  grievance.dataValues.Asset.dataValues.AssetType.dataValues
                    .name,
                asset_model:
                  grievance.dataValues.Asset &&
                  grievance.dataValues.Asset.dataValues.model,
                status:
                  grievance.status == 0
                    ? "Unassigned"
                    : grievance.status == 1
                    ? "Assigned"
                    : grievance.status == 2
                    ? "Assigned OEM"
                    : grievance.status == 3
                    ? "Completed OEM"
                    : grievance.status == 4
                    ? "Unresolved"
                    : "Completed",
                raised_by: grievance.dataValues.raised_by,
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
        } else if (user.user_type == 3) {
          const { count, rows } = await Grievance.findAndCountAll({
            include: [
              { model: School, attributes: ["id", "name", "school_type"] },
              {
                model: Asset,
                where: { school_id: user.school_id },
                attributes: ["model"],
                include: [{ model: AssetType, attributes: ["id", "name"] }],
              },
            ],
            where:
              req.body.from != null && req.body.to != null
                ? {
                    createdAt: { [Op.between]: [req.body.from, req.body.to] },
                    ...searchCondition,
                    school_id: user.school_id,
                  }
                : { ...searchCondition, school_id: user.school_id },
            order: [["id", "DESC"]],
            offset: start,
            limit: length,
          });

          // Formatting the response for datatables.net
          let obj = {};
          const data = rows.map((grievance: any) => {
            if (
              moment(moment().format("YYYY-MM-DD"), "YYYY-MM-DD").isBefore(
                moment(grievance.createdAt, "YYYY-MM-DD")
              )
            ) {
              obj = {
                id: grievance.id,
                code: grievance.code,
                type: user.user_type,
                school_name:
                  grievance.dataValues.School &&
                  grievance.dataValues.School.dataValues.name,
                school_type:
                  grievance.dataValues.School &&
                  grievance.dataValues.School.dataValues.school_type,
                support_type:
                  grievance.dataValues.support_type == 1
                    ? "Technical"
                    : "Non-Technical",
                asset_name:
                  grievance.dataValues.Asset &&
                  grievance.dataValues.Asset.dataValues.AssetType.dataValues
                    .name,
                asset_model:
                  grievance.dataValues.Asset &&
                  grievance.dataValues.Asset.dataValues.model,
                status:
                  grievance.status == 0
                    ? "Unassigned"
                    : grievance.status == 1
                    ? "Assigned"
                    : grievance.status == 2
                    ? "Assigned OEM"
                    : grievance.status == 3
                    ? "Completed OEM"
                    : grievance.status == 4
                    ? "Unresolved"
                    : "Completed",
                raised_by: grievance.dataValues.raised_by,
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
        } else if (user.user_type == 5) {
          const currentDate: any = moment().format("YYYY-MM-DD");
          const someDate: any = moment(currentDate).add(1, "days");
          const to: any = moment(req.body.to).add(1, "days");
          const { count, rows } = await Grievance.findAndCountAll({
            include: [
              { model: School, attributes: ["id", "name", "school_type"] },
              {
                model: Asset,
                attributes: ["model"],
                where: { project: user.project },
                include: [{ model: AssetType, attributes: ["id", "name"] }],
              },
            ],
            where:
              req.body.from != null && req.body.to != null
                ? {
                    createdAt: {
                      [Op.gte]: new Date(req.body.from),
                      [Op.lt]: new Date(to),
                    },
                    ...searchCondition,
                  }
                : req.body.type == 1
                ? {
                    createdAt: {
                      [Op.gte]: new Date(currentDate),
                      [Op.lt]: new Date(someDate),
                    },
                    ...searchCondition,
                  }
                : { ...searchCondition },
            order: [["id", "DESC"]],
            offset: start,
            limit: length,
          });
          // console.log(rows)
          // const result = rows.map((val: any) => {
          //   if (val.dataValues.School.length > 0) {
          //     // Your logic when School length is greater than 0
          //   }
          // })
          let obj = {};
          const data = rows.map((grievance: any) => {
            if (
              moment(moment().format("YYYY-MM-DD"), "YYYY-MM-DD").isBefore(
                moment(grievance.createdAt, "YYYY-MM-DD")
              )
            ) {
              obj = {
                id: grievance.id,
                code: grievance.code,
                type: user.user_type,
                school_name:
                  grievance.dataValues.School &&
                  grievance.dataValues.School.dataValues.name,
                school_type:
                  grievance.dataValues.School &&
                  grievance.dataValues.School.dataValues.school_type,
                support_type:
                  grievance.dataValues.support_type == 1
                    ? "Technical"
                    : "Non-Technical",
                asset_name:
                  grievance.dataValues.Asset &&
                  grievance.dataValues.Asset.dataValues.AssetType.dataValues
                    .name,
                asset_model:
                  grievance.dataValues.Asset &&
                  grievance.dataValues.Asset.dataValues.model,
                status:
                  grievance.status == 0
                    ? "Unassigned"
                    : grievance.status == 1
                    ? "Assigned"
                    : grievance.status == 2
                    ? "Assigned OEM"
                    : grievance.status == 3
                    ? "Completed OEM"
                    : grievance.status == 4
                    ? "Unresolved"
                    : "Completed",
                raised_by: grievance.dataValues.raised_by,
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
        } else {
          const currentDate: any = moment().format("YYYY-MM-DD");
          const someDate: any = moment(currentDate).add(1, "days");
          const to: any = moment(req.body.to).add(1, "days");
          const { count, rows } = await Grievance.findAndCountAll({
            include: [
              {
                model: School,
                attributes: ["id", "name", "school_type"],
                order: [["name", orderDir]],
              },
              {
                model: Asset,
                attributes: ["model"],
                include: [
                  {
                    model: AssetType,
                    attributes: ["id", "name"],
                    order: [["name", orderDir]],
                  },
                ],
              },
            ],
            where:
              req.body.from != null && req.body.to != null
                ? {
                    createdAt: {
                      [Op.gte]: new Date(req.body.from),
                      [Op.lt]: new Date(to),
                    },
                    ...searchCondition,
                  }
                : req.body.type == 1
                ? {
                    createdAt: {
                      [Op.gte]: new Date(currentDate),
                      [Op.lt]: new Date(someDate),
                    },
                    ...searchCondition,
                  }
                : { ...searchCondition },
            order: [["id", "DESC"]],
            offset: start,
            limit: length,
          });
          // console.log(rows)
          // const result = rows.map((val: any) => {
          //   if (val.dataValues.School.length > 0) {
          //     // Your logic when School length is greater than 0
          //   }
          // })
          let obj = {};
          const data = rows.map((grievance: any) => {
            if (
              moment(moment().format("YYYY-MM-DD"), "YYYY-MM-DD").isBefore(
                moment(grievance.createdAt, "YYYY-MM-DD")
              )
            ) {
              obj = {
                id: grievance.id,
                code: grievance.code,
                type: user.user_type,
                school_name:
                  grievance.dataValues.School &&
                  grievance.dataValues.School.dataValues.name,
                school_type:
                  grievance.dataValues.School &&
                  grievance.dataValues.School.dataValues.school_type,
                support_type:
                  grievance.dataValues.support_type == 1
                    ? "Technical"
                    : "Non-Technical",
                asset_name:
                  grievance.dataValues.Asset &&
                  grievance.dataValues.Asset.dataValues.AssetType.dataValues
                    .name,
                asset_model:
                  grievance.dataValues.Asset &&
                  grievance.dataValues.Asset.dataValues.model,
                status:
                  grievance.status == 0
                    ? "Unassigned"
                    : grievance.status == 1
                    ? "Assigned"
                    : grievance.status == 2
                    ? "Assigned OEM"
                    : grievance.status == 3
                    ? "Completed OEM"
                    : grievance.status == 4
                    ? "Unresolved"
                    : "Completed",
                raised_by: grievance.dataValues.raised_by,
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
      if (req.query.upcoming == "false") {
        if (user.user_type == 4) {
          const { count, rows } = await Grievance.findAndCountAll({
            include: [
              { model: School, attributes: ["id", "name", "school_type"] },
              {
                model: Asset,
                attributes: ["model"],
                include: [{ model: AssetType, attributes: ["id", "name"] }],
              },
            ],
            where:
              req.body.from != null && req.body.to != null
                ? {
                    createdAt: {
                      [Op.between]: [req.body.from, req.body.to],
                      searchCondition,
                      service_engineer: decodedToken.id,
                    },
                  }
                : { ...searchCondition, service_engineer: decodedToken.id },
            order: [["id", "DESC"]],
            // offset: start,
            limit: length,
          });

          // Formatting the response for datatables.net
          let obj = {};
          const data = rows.map((grievance: any) => {
            if (
              moment(moment().format("YYYY-MM-DD"), "YYYY-MM-DD").isAfter(
                moment(grievance.createdAt, "YYYY-MM-DD")
              )
            ) {
              obj = {
                id: grievance.id,
                code: grievance.code,
                type: user.user_type,
                school_name:
                  grievance.dataValues.School &&
                  grievance.dataValues.School.dataValues.name,
                school_type:
                  grievance.dataValues.School &&
                  grievance.dataValues.School.dataValues.school_type,
                support_type:
                  grievance.dataValues.support_type == 1
                    ? "Technical"
                    : "Non-Technical",
                asset_name:
                  grievance.dataValues.Asset &&
                  grievance.dataValues.Asset.dataValues.AssetType.dataValues
                    .name,
                asset_model:
                  grievance.dataValues.Asset &&
                  grievance.dataValues.Asset.dataValues.model,
                status:
                  grievance.status == 0
                    ? "Unassigned"
                    : grievance.status == 1
                    ? "Assigned"
                    : grievance.status == 2
                    ? "Assigned OEM"
                    : grievance.status == 3
                    ? "Completed OEM"
                    : grievance.status == 4
                    ? "Unresolved"
                    : "Completed",
                raised_by: grievance.dataValues.raised_by,
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
        } else if (user.user_type == 2) {
          const { count, rows } = await Grievance.findAndCountAll({
            include: [
              { model: School, attributes: ["id", "name", "school_type"] },
              {
                model: Asset,
                attributes: ["model"],
                include: [{ model: AssetType, attributes: ["id", "name"] }],
              },
            ],
            where:
              req.body.from != null && req.body.to != null
                ? {
                    createdAt: { [Op.between]: [req.body.from, req.body.to] },
                    ...searchCondition,
                    oem_id: decodedToken.id,
                  }
                : { ...searchCondition, oem_id: decodedToken.id },
            order: [["id", "DESC"]],
            offset: start,
            limit: length,
          });

          // Formatting the response for datatables.net
          let obj = {};
          const data = rows.map((grievance: any) => {
            if (
              moment(moment().format("YYYY-MM-DD"), "YYYY-MM-DD").isAfter(
                moment(grievance.createdAt, "YYYY-MM-DD")
              )
            ) {
              obj = {
                id: grievance.id,
                code: grievance.code,
                type: user.user_type,
                school_name:
                  grievance.dataValues.School &&
                  grievance.dataValues.School.dataValues.name,
                school_type:
                  grievance.dataValues.School &&
                  grievance.dataValues.School.dataValues.school_type,
                support_type:
                  grievance.dataValues.support_type == 1
                    ? "Technical"
                    : "Non-Technical",
                asset_name:
                  grievance.dataValues.Asset &&
                  grievance.dataValues.Asset.dataValues.AssetType.dataValues
                    .name,
                asset_model:
                  grievance.dataValues.Asset &&
                  grievance.dataValues.Asset.dataValues.model,
                status:
                  grievance.status == 0
                    ? "Unassigned"
                    : grievance.status == 1
                    ? "Assigned"
                    : grievance.status == 2
                    ? "Assigned OEM"
                    : grievance.status == 3
                    ? "Completed OEM"
                    : grievance.status == 4
                    ? "Unresolved"
                    : "Completed",
                raised_by: grievance.dataValues.raised_by,
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
        } else if (user.user_type == 3) {
          const { count, rows } = await Grievance.findAndCountAll({
            include: [
              { model: School, attributes: ["id", "name", "school_type"] },
              {
                model: Asset,
                where: { school_id: user.school_id },
                attributes: ["model"],
                include: [{ model: AssetType, attributes: ["id", "name"] }],
              },
            ],
            where:
              req.body.from != null && req.body.to != null
                ? {
                    createdAt: { [Op.between]: [req.body.from, req.body.to] },
                    ...searchCondition,
                    school_id: user.school_id,
                  }
                : { ...searchCondition, school_id: user.school_id },
            order: [["id", "DESC"]],
            offset: start,
            limit: length,
          });

          // Formatting the response for datatables.net
          let obj = {};
          const data = rows.map((grievance: any) => {
            if (
              moment(moment().format("YYYY-MM-DD"), "YYYY-MM-DD").isAfter(
                moment(grievance.createdAt, "YYYY-MM-DD")
              )
            ) {
              obj = {
                id: grievance.id,
                code: grievance.code,
                type: user.user_type,
                school_name:
                  grievance.dataValues.School &&
                  grievance.dataValues.School.dataValues.name,
                school_type:
                  grievance.dataValues.School &&
                  grievance.dataValues.School.dataValues.school_type,
                support_type:
                  grievance.dataValues.support_type == 1
                    ? "Technical"
                    : "Non-Technical",
                asset_name:
                  grievance.dataValues.Asset &&
                  grievance.dataValues.Asset.dataValues.AssetType.dataValues
                    .name,
                asset_model:
                  grievance.dataValues.Asset &&
                  grievance.dataValues.Asset.dataValues.model,
                status:
                  grievance.status == 0
                    ? "Unassigned"
                    : grievance.status == 1
                    ? "Assigned"
                    : grievance.status == 2
                    ? "Assigned OEM"
                    : grievance.status == 3
                    ? "Completed OEM"
                    : grievance.status == 4
                    ? "Unresolved"
                    : "Completed",
                raised_by: grievance.dataValues.raised_by,
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
        } else if (user.user_type == 5) {
          const currentDate: any = moment().format("YYYY-MM-DD");
          const someDate: any = moment(currentDate).add(1, "days");
          const to: any = moment(req.body.to).add(1, "days");
          const { count, rows } = await Grievance.findAndCountAll({
            include: [
              { model: School, attributes: ["id", "name", "school_type"] },
              {
                model: Asset,
                attributes: ["model"],
                where: { project: user.project },
                include: [{ model: AssetType, attributes: ["id", "name"] }],
              },
            ],
            where:
              req.body.from != null && req.body.to != null
                ? {
                    createdAt: {
                      [Op.gte]: new Date(req.body.from),
                      [Op.lt]: new Date(to),
                    },
                    ...searchCondition,
                  }
                : req.body.type == 1
                ? {
                    createdAt: {
                      [Op.gte]: new Date(currentDate),
                      [Op.lt]: new Date(someDate),
                    },
                    ...searchCondition,
                  }
                : { ...searchCondition },
            order: [["id", "DESC"]],
            offset: start,
            limit: length,
          });
          // console.log(rows)
          // const result = rows.map((val: any) => {
          //   if (val.dataValues.School.length > 0) {
          //     // Your logic when School length is greater than 0
          //   }
          // })
          let obj = {};
          const data = rows.map((grievance: any) => {
            if (
              moment(moment().format("YYYY-MM-DD"), "YYYY-MM-DD").isAfter(
                moment(grievance.createdAt, "YYYY-MM-DD")
              )
            ) {
              obj = {
                id: grievance.id,
                code: grievance.code,
                type: user.user_type,
                school_name:
                  grievance.dataValues.School &&
                  grievance.dataValues.School.dataValues.name,
                school_type:
                  grievance.dataValues.School &&
                  grievance.dataValues.School.dataValues.school_type,
                support_type:
                  grievance.dataValues.support_type == 1
                    ? "Technical"
                    : "Non-Technical",
                asset_name:
                  grievance.dataValues.Asset &&
                  grievance.dataValues.Asset.dataValues.AssetType.dataValues
                    .name,
                asset_model:
                  grievance.dataValues.Asset &&
                  grievance.dataValues.Asset.dataValues.model,
                status:
                  grievance.status == 0
                    ? "Unassigned"
                    : grievance.status == 1
                    ? "Assigned"
                    : grievance.status == 2
                    ? "Assigned OEM"
                    : grievance.status == 3
                    ? "Completed OEM"
                    : grievance.status == 4
                    ? "Unresolved"
                    : "Completed",
                raised_by: grievance.dataValues.raised_by,
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
        } else {
          const currentDate: any = moment().format("YYYY-MM-DD");
          const someDate: any = moment(currentDate).add(1, "days");
          const to: any = moment(req.body.to).add(1, "days");
          const { count, rows } = await Grievance.findAndCountAll({
            include: [
              {
                model: School,
                attributes: ["id", "name", "school_type"],
                order: [["name", orderDir]],
              },
              {
                model: Asset,
                attributes: ["model"],
                include: [
                  {
                    model: AssetType,
                    attributes: ["id", "name"],
                    order: [["name", orderDir]],
                  },
                ],
              },
            ],
            where:
              req.body.from != null && req.body.to != null
                ? {
                    createdAt: {
                      [Op.gte]: new Date(req.body.from),
                      [Op.lt]: new Date(to),
                    },
                    ...searchCondition,
                  }
                : req.body.type == 1
                ? {
                    createdAt: {
                      [Op.gte]: new Date(currentDate),
                      [Op.lt]: new Date(someDate),
                    },
                    ...searchCondition,
                  }
                : { ...searchCondition },
            order: [["id", "DESC"]],
            offset: start,
            limit: length,
          });
          // console.log(rows)
          // const result = rows.map((val: any) => {
          //   if (val.dataValues.School.length > 0) {
          //     // Your logic when School length is greater than 0
          //   }
          // })
          let obj = {};
          const data = rows.map((grievance: any) => {
            if (
              moment(moment().format("YYYY-MM-DD"), "YYYY-MM-DD").isAfter(
                moment(grievance.createdAt, "YYYY-MM-DD")
              )
            ) {
              obj = {
                id: grievance.id,
                code: grievance.code,
                type: user.user_type,
                school_name:
                  grievance.dataValues.School &&
                  grievance.dataValues.School.dataValues.name,
                school_type:
                  grievance.dataValues.School &&
                  grievance.dataValues.School.dataValues.school_type,
                support_type:
                  grievance.dataValues.support_type == 1
                    ? "Technical"
                    : "Non-Technical",
                asset_name:
                  grievance.dataValues.Asset &&
                  grievance.dataValues.Asset.dataValues.AssetType.dataValues
                    .name,
                asset_model:
                  grievance.dataValues.Asset &&
                  grievance.dataValues.Asset.dataValues.model,
                status:
                  grievance.status == 0
                    ? "Unassigned"
                    : grievance.status == 1
                    ? "Assigned"
                    : grievance.status == 2
                    ? "Assigned OEM"
                    : grievance.status == 3
                    ? "Completed OEM"
                    : grievance.status == 4
                    ? "Unresolved"
                    : "Completed",
                raised_by: grievance.dataValues.raised_by,
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
      res.status(404).send("Grievance not found!");
    }
  } catch (error) {
    res
      .status(500)
      .send("Error while fetching grievances" + "  " + JSON.stringify(error));
  }
};

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     security:
 *       - bearerAuth: []
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

/**
 * @swagger
 * /api/grievance:
 *   post:
 *     summary: Grievance list
 *     tags: [Grievance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: upcoming
 *     responses:
 *       200:
 *         description: All grievances
 *         content:
 *           application/json:
 *             example:
 *               success : true
 *               recordsTotal: 0
 *               recordsFiltered: 0
 *               data: [{
 *                "id": 6,
 *                "code": "GR20240222106",
 *                "type": 1,
 *                "school_name": "BAPUJI ME SCHOOL",
 *                "school_type": 0,
 *                "support_type": "Technical",
 *                "asset_name": "External Speaker Set",
 *                "asset_model": "Zebronics",
 *                "status": "Completed"
 *                },]
 *               searchCondition: {}
 *               searchValue: ""
 *               error:
 *       500:
 *         description: Some server error
 */

/**
 * @swagger
 * /api/school-visit:
 *   post:
 *     summary: School Visit list
 *     tags: [School Visit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: upcoming
 *     responses:
 *       200:
 *         description: All school visit
 *         content:
 *           application/json:
 *             example:
 *               success : true
 *               recordsTotal: 0
 *               recordsFiltered: 0
 *               data: [{
 *                "id": 4,
 *                "date": "2024-02-21",
 *                "type": 4,
 *                "name": "1 NO. JIAKUR ANCHALIK MES",
 *                "school_type": 0,
 *                "service_engineer": "Rohit Chetri ",
 *                "phone": "6901077505",
 *                "arrival": "16:53:00",
 *                "departure": "17:55:00",
 *                "status": 0,
 *                "model": "",
 *                "asset": "-- --"
 *                }]
 *               error:
 *       500:
 *         description: Some server error
 */
export const getDashboardList: RequestHandler = async (req, res, next) => {
  try {
    const data = await repo.dashboard(req);
    return res.json({ success: true, data: data });
  } catch (e: any) {
    res
      .status(404)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};

export const getDashboardListForManagement: RequestHandler = async (req, res, next) => {
  try {
    const data = await repo.districtSegregatedDashboardInfo(req);
    return res.json({ success: true, data: data });
  } catch (e: any) {
    res
      .status(404)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};
