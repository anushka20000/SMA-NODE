const nodemailer = require("nodemailer");


const options = {
    host: process.env.SMTP_HOST,
    port: process.env.EMAIL_PORT,
    secure: true,
    encryptionMode: 'ssl',
    auth: {
        user: process.env.AUTH_NAME,
        pass: process.env.AUTH_PASSWORD,
    }
}

const transporter = nodemailer.createTransport(options)
export default transporter

