import { WebSocket } from 'ws';

const port = 3001;
const ws = new WebSocket(`ws://localhost:${port}/ws`);

ws.on('open', () => {
    console.log('Connected to server');
    
    // 1. Authenticate as Device
    ws.send(JSON.stringify({
        type: 'authenticate',
        deviceId: 'device_a205'
    }));
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log('Received:', msg);

    if (msg.type === 'authenticated') {
        console.log('Authentication successful. Sending test scan...');
        
        // 2. Simulate Student Scan
        // Assuming a student ID and a room 'Room-CSE-1' (normalized from a205)
        ws.send(JSON.stringify({
            type: 'rfid_scan',
            rfidTag: 'TEST_TAG_STUDENT_1',
            deviceId: 'device_a205'
        }));
    }
});

ws.on('error', (err) => {
    console.error('WS Error:', err);
});
