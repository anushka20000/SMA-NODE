import  {RequestHandler} from "express";
import { User } from "../models/User";
import { IssueRepository } from "../repositories/IssueRepository";
import { Issue } from "../models/Issue";
const { Op } = require("sequelize");
import jwt from "jsonwebtoken";

const repo = new IssueRepository()
//GET 
export const getIssueById: RequestHandler = async (req, res, next) => {
  try{
      const data = await repo.list(req)
      return res.json({ success: true, data: data })
  }catch(e:any){
    res.status(404).json({success: false, error: ['could not read data', e.message]})
  }
  };
  
  export const saveIssue: RequestHandler = async(req, res, next)=>{
 
    try{
        const data = await repo.store(req)
        return res.json({success: true, data: data})
    }catch(e:any){
        res.status(400).json({success: false, error: ['could not read data', e.message]})
    }
  };
  export const updateIssue: RequestHandler = async (req, res, next) => {
    try{
      await repo.update(req)
      return res.json({success: true})
    }catch(e:any){
        res.status(400).json({success: false, error: ['could not update data', e.message]})
    }
  };
  export const destroyIssue: RequestHandler = async (req, res, next) => {
    try{
      await repo.delete(req)
      return res.json({success: true})
    }catch(e:any){
      res.status(400).json({success: false, error: ['could not update data', e.message]})
  }
  };
  export const getIssuesList: RequestHandler = async (req, res, next) => {
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
        const searchValue = (req.body.search as any)?.value || '';

        // For ordering (sorting)
        const orderColumnIndex = (req.body.order as any)?.[0]?.column;
        const orderDir = (req.body.order as any)?.[0]?.dir || 'DESC';
        const orderColumnName = (req.body.columns as any)?.[orderColumnIndex]?.data || 'name';

        // Search logic
        let searchCondition = {};
        if (searchValue) {
            searchCondition = {
                [Op.or]: [
                    { id: { [Op.eq]: `${searchValue}` } },
                    { name: { [Op.like]: `%${searchValue}%` } },
                    { model: { [Op.like]: `%${searchValue}%` } },
                    { serial_no: { [Op.like]: `${searchValue}%` } }
                    // Add other fields if necessary
                ]
            };
        }

        // Fetching the assets with pagination, search, and sort
        const { count, rows } = await Issue.findAndCountAll({
            where: searchCondition,
            order: [
                [orderColumnName, orderDir]
            ],
            offset: start,
            limit: length
        });

        // Formatting the response for datatables.net
        const data = rows.map((asset: any) => ({
            id: asset.id,
            name: asset.name,
            model: asset.model,
            serialNumber: asset.serial_no,
            addedOn: asset.added_on // Format date if necessary
        }));

        res.json({
            draw: draw,
            recordsTotal: count,
            recordsFiltered: count,
            data: data,
            searchCondition: searchCondition,
            searchValue: searchValue
        });
      }else {
        res.status(404).send("Issues not found!");
      }
    } catch (error) {
        res.status(500).send('Error while fetching assets');
    }
};
