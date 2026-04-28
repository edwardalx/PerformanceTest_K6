// 1. Import necessary modules
import http from 'k6/http';
import { check, sleep } from 'k6';

// 2. Configure test options (like number of virtual users)
export const options = {
  vus: 5,  // 1 virtual user
  // duration: '5s', // Run for 5 seconds
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate must be less than 1%
  },
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 users
    { duration: '1m', target: 20 },  // Stay at 20 users
    { duration: '10s', target: 0 },  // Ramp down to 0
  ]
};

// 3. The default function contains the test logic
export default function () {
  // Make a GET request
  const res = http.get('https://campushostels.duckdns.org/api/Properties');
  
  // 4. Validate the response
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  // Pause for 1 second to simulate user think time
  sleep(1);
}