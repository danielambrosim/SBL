import { exportarUsuariosParaCSV } from './exportarUsuarios';
import fs from 'fs';
import { transporter } from '../services/emailService'; // Ajuste o path se estiver diferente

export async function enviarCSVParaMim() {
  const filePath = await exportarUsuariosParaCSV();
  const fileContent = fs.readFileSync(filePath);

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: 'danielcolodete242623@gmail.com', // Substitua pelo SEU email real!
    subject: 'Relatório CSV de Usuários',
    text: 'Segue em anexo o CSV com os usuários cadastrados.',
    attachments: [
      {
        filename: 'usuarios_leilao.csv',
        content: fileContent,
      }
    ]
  });
}