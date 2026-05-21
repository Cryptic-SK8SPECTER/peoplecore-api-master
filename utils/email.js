const nodemailer = require('nodemailer');
const pug = require('pug');
const { htmlToText } = require('html-to-text');

function createTransport() {
  const gmailUser = process.env.GMAIL_USER || process.env.EMAIL_USER;
  const gmailPass =
    process.env.GMAIL_PASSWORD ||
    process.env.GMAIL_APP_PASSWORD ||
    process.env.EMAIL_PASSWORD;

  if (gmailUser && gmailPass) {
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || process.env.SERVICE || 'gmail',
      auth: { user: gmailUser, pass: gmailPass },
    });
  }

  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD,
      },
    });
  }

  if (process.env.MAIL_HOST) {
    return nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT) || 2525,
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      },
    });
  }

  throw new Error(
    'Envio de email não configurado no servidor. Defina GMAIL_USER + GMAIL_PASSWORD (ou SMTP_HOST + SMTP_USER + SMTP_PASS) no .env da API.',
  );
}

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = (user.nome || user.name || 'Utilizador').split(' ')[0];
    this.url = url;
    const fromAddress = process.env.EMAIL_FROM || gmailUserFromEnv();
    this.from = `PeopleCore <${fromAddress}>`;
  }

  newTransport() {
    return createTransport();
  }

  async send(template, subject) {
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });

    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText(html),
    };

    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'Bem-vindo à People Core!');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Recuperar palavra-passe — PeopleCore',
    );
  }

  async sendWelcomeWithPassword(password) {
    const clientUrl =
      process.env.CLIENT_URL?.replace(/\/$/, '') ||
      'https://peoplecore-master.vercel.app';

    const html = pug.renderFile(
      `${__dirname}/../views/email/welcomeWithPassword.pug`,
      {
        firstName: this.firstName,
        email: this.to,
        password,
        url: clientUrl,
        subject: 'Bem-vindo à People Core! Credenciais de Acesso',
      },
    );

    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: 'Bem-vindo à People Core! Credenciais de Acesso',
      html,
      text: htmlToText(html),
    };

    await this.newTransport().sendMail(mailOptions);
  }
};

function gmailUserFromEnv() {
  return process.env.GMAIL_USER || process.env.EMAIL_USER || 'noreply@peoplecore.app';
}
