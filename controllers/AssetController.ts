import { RequestHandler } from "express";
import { User } from "../models/User";
import { AssetRepository } from "../repositories/AssetRepository";
import { Asset } from "../models/Asset";
const { Op } = require("sequelize");
import jwt from "jsonwebtoken";
import { AssetType } from "../models/AssetType";
import { AssetCategory } from "../models/AssetCategory";
import { Sequelize } from "sequelize";
import { Grievance } from "../models/Grievance";

const repo = new AssetRepository();
//GET
export const getAssetById: RequestHandler = async (req, res, next) => {
  try {
    const data = await repo.getById(req);
    return res.json({ success: true, data: data });
  } catch (e: any) {
    res
      .status(404)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};
export const getAssets: RequestHandler = async (req, res, next) => {
  try {
    const data = await repo.list(req);
    return res.json({ success: true, data: data });
  } catch (e: any) {
    res
      .status(404)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};
export const saveAsset: RequestHandler = async (req, res, next) => {
  try {
    const data = await repo.store(req);
    return res.json({ success: true, data: data });
  } catch (e: any) {
    res
      .status(400)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};
export const updateAsset: RequestHandler = async (req, res, next) => {
  try {
    await repo.update(req);
    return res.json({ success: true });
  } catch (e: any) {
    res
      .status(400)
      .json({ success: false, error: ["could not update data", e.message] });
  }
};
export const destroyAsset: RequestHandler = async (req, res, next) => {
  try {
    await repo.delete(req);
    return res.json({ success: true });
  } catch (e: any) {
    res
      .status(400)
      .json({ success: false, error: ["could not update data", e.message] });
  }
};
export const removeAssetFromSchool: RequestHandler = async (req, res, next) => {
  try {
    await repo.removeAssetFromSchool(req);
    return res.json({ success: true });
  } catch (e: any) {
    res
      .status(400)
      .json({ success: false, error: ["could not update data", e.message] });
  }
};
export const getAssetsList: RequestHandler = async (req, res, next) => {
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
      // console.log(searchValue)

      // Search logic
      let searchCondition = {};
      if (searchValue) {
        searchCondition = {
          [Op.or]: [
            { model: { [Op.like]: `%${searchValue}%` } },
            { serial_no: { [Op.like]: `%${searchValue}%` } },
          ],
        };
      }
      if (
        req.body.school_id &&
        (user.user_type == 1 || user.user_type == 5 || user.user_type == 3)
      ) {
        let outerSearchResults = await Asset.findAll({
          attributes: ["id", "model", "serial_no", "added_on"],
          where:
            searchValue !== null
              ? {
                  [Op.or]: {
                    model: { [Op.like]: `%${searchValue}%` },
                    serial_no: { [Op.like]: `%${searchValue}%` },
                    added_on: { [Op.like]: `%${searchValue}%` },
                  },
                }
              : {},
        });
        let outerSearchCondition =
          outerSearchResults.length > 0 ? { [Op.not]: null } : null;
        const { count, rows } = await Asset.findAndCountAll({
          include: [{
            model: AssetType,
            required: true,
            attributes: ["name"],
            where:
              outerSearchCondition == null
                ? { name: { [Op.like]: `%${searchValue}%` } }
                : {},
            order: [["name", orderDir]],
            include: [
              {
                model: AssetCategory,
                required: true,
                attributes: ["id", "name"],
                where: req.body.categoryId ? { id: req.body.categoryId } : {},
              },
            ],
            
          },
          // {
          //   model: Grievance,
          //   attributes: ["id", "status"],
          // }
        ],
          
          where:
            outerSearchCondition != null && req.body.project
              ? {
                  ...searchCondition,

                  school_id: { [Op.eq]: req.body.school_id },
                  project: req.body.project,
                }
              : outerSearchCondition != null
              ? {
                  ...searchCondition,
                  school_id: { [Op.eq]: req.body.school_id },
                }
              : req.body.project
              ? {
                  school_id: { [Op.eq]: req.body.school_id },
                  project: req.body.project,
                }
              : {
                  school_id: { [Op.eq]: req.body.school_id },
                },

          order: [
            ["added_on", orderDir],
            ["serial_no", orderDir],
          ],
          offset: start,
          limit: length,
        });

        

        // Formatting the response for datatables.net
        const data = rows
          .filter((asset: any) => asset.dataValues.AssetType)
          .map((asset: any) => ({
            id: asset.id,
            name:
              asset.dataValues.AssetType &&
              asset.dataValues.AssetType.dataValues.name,
            model: asset.model,
            serial_no: asset.serial_no,
            added_on: asset.added_on, // Format date if necessary
            project: asset.project,
            category:
              asset.dataValues.AssetType?.dataValues.AssetCategory?.dataValues
                .name,
            // status: asset.dataValues.Grievance?.dataValues.status
          }));

        

        res.json({
          draw: draw,
          recordsTotal: count,
          recordsFiltered: count,
          data: data,
          searchCondition: searchCondition,
          searchValue: searchValue,
        });
      } else if (user.user_type == 6) {
        let outerSearchResults = await Asset.findAll({
          attributes: ["id", "model", "serial_no", "added_on"],
          where:
            searchValue !== null
              ? {
                  [Op.or]: {
                    model: { [Op.like]: `%${searchValue}%` },
                    serial_no: { [Op.like]: `%${searchValue}%` },
                    added_on: { [Op.like]: `%${searchValue}%` },
                  },
                }
              : {},
        });
        let outerSearchCondition =
          outerSearchResults.length > 0 ? { [Op.not]: null } : null;
        const { count, rows } = await Asset.findAndCountAll({
          include: [
            {
              model: AssetType,
              required: false,
              attributes: ["id", "name"],
              where:
                outerSearchCondition == null
                  ? { name: { [Op.like]: `%${searchValue}%` } }
                  : {},
              order: [["name", orderDir]],
              include: [
                {
                  model: AssetCategory,
                  attributes: ["id", "name"],
                },
              ],
            },
          ],
          where:
            outerSearchCondition != null
              ? { ...searchCondition, project: user.project }
              : { project: user.project },
          order: [
            ["added_on", orderDir],
            ["serial_no", orderDir],
          ],
          offset: start,
          limit: length,
        });
        // Formatting the response for datatables.net

        const data = rows
          .filter((asset: any) => asset.dataValues.AssetType)
          .map((asset: any) => ({
            id: asset.id,
            name:
              asset.dataValues.AssetType &&
              asset.dataValues.AssetType.dataValues.name,
            model: asset.model,
            serial_no: asset.serial_no,
            added_on: asset.added_on, // Format date if necessary
            project: asset.project,
            category:
              asset.dataValues.AssetType?.dataValues.AssetCategory?.dataValues
                .name,
          }));

        res.json({
          draw: draw,
          recordsTotal: count,
          recordsFiltered: count,
          data: data,
          searchCondition: searchCondition,
          searchValue: searchValue,
        });
      } else if (user.user_type == 1 || user.user_type == 5) {
        let outerSearchResults = await Asset.findAll({
          attributes: ["id", "model", "serial_no", "added_on"],
          where:
            searchValue !== null
              ? {
                  [Op.or]: {
                    model: { [Op.like]: `%${searchValue}%` },
                    serial_no: { [Op.like]: `%${searchValue}%` },
                    added_on: { [Op.like]: `%${searchValue}%` },
                  },
                }
              : {},
        });
        let outerSearchCondition =
          outerSearchResults.length > 0 ? { [Op.not]: null } : null;

        const { count, rows } = await Asset.findAndCountAll({
          include: [
            {
              model: AssetType,
              required: true,
              attributes: ["id", "name"],
              where:
                outerSearchCondition == null
                  ? { name: { [Op.like]: `%${searchValue}%` } }
                  : {},
              order: [["name", orderDir]],
              include: [
                {
                  model: AssetCategory,
                  required: true,
                  attributes: ["id", "name"],
                  where: req.body.categoryId ? { id: req.body.categoryId } : {},
                },
              ],
              
            },
            // {
            //   model: Grievance,
            //   attributes: ["id", "status"],
            // }
          ],
          where:
            outerSearchCondition != null && req.body.project
              ? { project: req.body.project, ...searchCondition }
              : req.body.project
              ? { project: req.body.project }
              : outerSearchCondition != null
              ? { ...searchCondition }
              : {},
          order: [
            ["added_on", orderDir],
            ["serial_no", orderDir],
          ],
          offset: start,
          limit: length,
        });
        const data = rows
          .filter((asset: any) => asset.dataValues.AssetType)
          .map((asset: any) => ({
            id: asset.id,
            name:
              asset.dataValues.AssetType &&
              asset.dataValues.AssetType.dataValues.name,
            model: asset.model,
            serial_no: asset.serial_no,
            added_on: asset.added_on,
            project: asset.project,
            category:
              asset.dataValues.AssetType?.dataValues.AssetCategory?.dataValues
                .name,    
            // status: asset.dataValues.Grievance?.dataValues.status
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
        res.status(404).send("Assets not found!");
      }
    }
  } catch (error) {
    res.status(500).send("Error while fetching assets" + JSON.stringify(error));
  }
};
export const serialNoUniqueness: RequestHandler = async (req, res, next) => {
  try {
    let user: any;
    let decodedToken: any;
    if (req.headers.authorization) {
      const jwtString = req.headers.authorization.split(" ")[1];
      decodedToken = jwt.decode(jwtString);
      user = await User.findOne({ where: { id: decodedToken.id } });
    }
    if (user) {
      const data = await Asset.findOne({
        where: { serial_no: req.body.serial_no },
      });
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

export const getExcelforAsset: RequestHandler = async (req, res, next) => {
  try {
    let user: any;
    let decodedToken: any;
    if (req.headers.authorization) {
      const jwtString = req.headers.authorization.split(" ")[1];
      decodedToken = jwt.decode(jwtString);
      user = await User.findOne({ where: { id: decodedToken.id } });
    }
    if (user) {
      const orderDir = (req.body.order as any)?.[0]?.dir || "DESC";

    if (
      req.body.school_id &&
      (user.user_type == 1 || user.user_type == 5 || user.user_type == 3)
    ){
      const excelData = await Asset.findAll({
        include: {
          model: AssetType,
          required: true,
          attributes: ["name"],
          order: [["name", orderDir]],
          include: [
            {
              model: AssetCategory,
              required: true,
              attributes: ["id", "name"],
            },
          ],
        },
        where: {
          school_id: { [Op.eq]: req.body.school_id },
        },

        order: [
          ["added_on", orderDir],
          ["serial_no", orderDir],
        ],
      });

const dataForExcel = excelData
        .filter((asset: any) => asset.dataValues.AssetType)
        .map((asset: any) => ({
          // id: asset.id,
          name:
            asset.dataValues.AssetType &&
            asset.dataValues.AssetType.dataValues.name,
          model: asset.model,
          serial_no: asset.serial_no,
          added_on: asset.added_on, // Format date if necessary
          project: asset.project == 1 ? "IFP" : "KYAN",
          category:
            asset.dataValues.AssetType?.dataValues.AssetCategory?.dataValues
              .name,
        }));

        res.json({
          excel: dataForExcel,

        });

    }else if (user.user_type == 1) {
      const excelData = await Asset.findAll({
          include: [
            {
              model: AssetType,
              required: true,
              attributes: ["id", "name"],             
              order: [["name", orderDir]],
              include: [
                {
                  model: AssetCategory,
                  required: true,
                  attributes: ["id", "name"]
                },
              ],
            },
          ],        
          order: [
            ["added_on", orderDir],
            ["serial_no", orderDir],
          ],
        });

 const dataForExcel = excelData
          .filter((asset: any) => asset.dataValues.AssetType)
          .map((asset: any) => ({
            name:
              asset.dataValues.AssetType &&
              asset.dataValues.AssetType.dataValues.name,
            model: asset.model,
            serial_no: asset.serial_no,
            added_on: asset.added_on,
            project: asset.project == 1 ? "IFP" : "KYAN",
            category:
              asset.dataValues.AssetType?.dataValues.AssetCategory?.dataValues
                .name,
          }));
          res.json({
            excel: dataForExcel,

          });

    }
  }
  }catch (e: any) {
    res.status(500).send("Error while fetching assets" + JSON.stringify(e));

  }
}
