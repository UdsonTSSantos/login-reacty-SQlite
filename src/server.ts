import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: 'http://localhost:5173', // Altere para a URL de produção do seu React
  credentials: true
}));

app.use(express.json());

// Registro de Rotas
app.use('/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`🔒 Servidor seguro rodando na porta ${PORT}`);
});
