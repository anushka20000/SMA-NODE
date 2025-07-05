import { Request, Response } from "express";
import jsonwebtoken from "jsonwebtoken";
import { get } from "lodash";
import { config } from "../config/jwt-config";
import { User } from "../models/User";

export const jwtAuthMiddleware = (req: Request, res: Response, next: () => any) => {

    const authorizationToken = get(req, "headers.authorization", "");

    if (authorizationToken === "") {
        // ERROR MESSAGES SHOULD BE MORE VERBOSE IN DEV AND MORE OBSCURE ON PROD
        res.send({ status: "AUTH_ERROR", data: "INVALID_DATA" });
        return;
    }
    if (authorizationToken.startsWith("Bearer ") === false) {
  
        res.send({ status: "AUTH_ERROR", data: "INVALID_FORMAT" });
        return;
    }
    const token = authorizationToken.replace("Bearer ", "");
    try {
        const decodedData: any = jsonwebtoken.verify(token, config.jwt.SECRET);
        //@ts-ignore
        req.user = decodedData;

        User.findByPk(decodedData.id).then((user: any) => {
      
            if(user.dataValues.type == 2) {
                next();
                return;
            }
            else {
                res.status(403).send({ status: "AUTH_ERROR", data: "INVALID_TOKEN" });
            }
        })
    } catch (err) {
        res.send({ status: "AUTH_ERROR", data: "INVALID_TOKEN" });
    }
};