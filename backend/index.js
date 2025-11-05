import app from './src/App.js';
import {connectDB} from './db.js';
connectDB();
const PORT = process.env.PORT || 3000;


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});