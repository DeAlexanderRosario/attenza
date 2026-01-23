import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3001/ws');

ws.on('open', () => {
    console.log('Connected to server');

    // 1. Authenticate
    ws.send(JSON.stringify({
        type: 'authenticate',
        deviceId: 'device_a205'
    }));
});

ws.on('message', (data) => {
    const response = JSON.parse(data.toString());
    console.log('Server response:', response);

    if (response.type === 'authenticated') {
        console.log('Auth success, starting scan tests...');

        // Test Cases:
        // Note: These depend on the DB state. 
        // 33:CA:F6:39 - Rahul (Student)
        // 3:F4:F4:39 - (Teacher?)

        const testScans = [
            { rfidTag: 'UNKNOWN_TAG', label: 'Unknown Tag (Expect 404)' },
            { rfidTag: '33:CA:F6:39', label: 'Student Scan (Expect 200 or 405)' },
            { rfidTag: '3:F4:F4:39', label: 'Teacher Scan (Expect 201 or 202)' }
        ];

        let i = 0;
        const interval = setInterval(() => {
            if (i >= testScans.length) {
                clearInterval(interval);
                console.log('Tests completed.');
                process.exit(0);
            }
            const scan = testScans[i++];
            console.log(`\nTesting: ${scan.label}`);
            ws.send(JSON.stringify({
                type: 'rfid_scan',
                rfidTag: scan.rfidTag,
                deviceId: 'device_a205'
            }));
        }, 2000);
    }
});

ws.on('error', (err) => console.error('WS Error:', err));
