import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import patientRoutes from './routes/patientRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import historyRoutes from './routes/historyRoutes.js';
import prescriptionRoutes from './routes/prescriptionRoutes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/patients', reportRoutes);
app.use('/api/v1/patients', historyRoutes);
app.use('/api/v1/patients', prescriptionRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', service: 'Patient Management Service' });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: err.message 
    });
});

export default app;
