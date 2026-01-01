require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initSocket } = require('./socket'); // <-- socket setup

const PORT = Number(process.env.PORT) || 5005;

// ✅ Create HTTP server manually
const server = http.createServer(app);

// ✅ Initialize WebSocket
initSocket(server);

// ✅ Start listening
server.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log(`📱 Frontend: http://localhost:3000`);
});

// ✅ Proper error handling
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} already in use`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});
