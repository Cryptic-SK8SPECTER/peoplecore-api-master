const nodemailer = require('nodemailer');
const pug = require('pug');
const { htmlToText } = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.nome.split(' ')[0];
    this.url = url;
    this.from = `Peoplecore <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // G-EMAIL
      return nodemailer.createTransport({
        service: process.env.SERVICE,
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASSWORD,
        },
      });
    }

    // Mailtrap Sandbox
    return nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT * 1,
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      },
    });
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
      'Token de recuperação (válido por 10 min)',
    );
  }

  async sendWelcomeWithPassword(password) {
    const html = pug.renderFile(
      `${__dirname}/../views/email/welcomeWithPassword.pug`,
      {
        firstName: this.firstName,
        email: this.to,
        password,
        url: process.env.CLIENT_URL || 'https://peoplecore.app',
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
