const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlNjRiMmJjZS1kMmIxLTQ3NjQtOGFjMi0wZTUzNWM0MGYwOTgiLCJlbWFpbCI6InBhdGllbnRAZXhhbXBsZS5jb20iLCJyb2xlIjoicGF0aWVudCIsImlhdCI6MTYxODQ5Mjg0MCwiZXhwIjoxNjE4NDkzNzQwfQ.junk";
const payloadBase64 = token.split('.')[1];
try {
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
    console.log("Decoded payload:", payload);
} catch (e) {
    console.error("Decoding failed:", e.message);
}
