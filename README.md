# Ride Booking Server
A full-featured ride booking application backend with REST API, WebSockets for real-time updates, and comprehensive testing.

# Table of Contents
* Setup Instructions
    * Prerequisites
    * Installation
    * Configuration*
    * Running the Server
    * Development Mode
    * Running Tests
* API Documentation
    * Authentication
    * Ride Management
    * Location Services
* WebSocket Implementation
    * Available Events
    * Usage Examples
* Testing
    * Authentication Tests
    * Ride Management Tests
    * WebSocket Tests

## Setup Instructions
### Prerequisites
Before setting up the application, make sure you have the following installed:

* Node.js (version 14 or higher)
* npm (comes with Node.js)

### Installation
1. Download the project:
    * Either download the zip file and extract it
    * Or clone the repository using Git:
        ```bash
        git clone https://github.com/eaindome/Ride-Booking-server.git   
        cd Ride-Booking-server 
        ``` 

2. Install dependencies:
    * Open your terminal or command prompt
    * Navigate to the project folder
    * Run the installation command:
    `npm install`
    * This will install all the required packages (Express, Socket.io, etc.)

### Configuration
1. Create a configuration file:
    * Copy the .env.example file and rename it to .env
    * Or create a new file named .env in the root directory
2. Add your environment variables:
    * Open the .env file in any text editor
    * Fill in the following information:
    ```env
    PORT=5000
    JWT_SECRET=choose_a_secure_random_string
    JWT_EXPIRES_IN=1d
    BCRYPT_SALT_ROUNDS=10
    STATUS_UPDATE_INTERVAL=5000
    FRONTEND_URL=http://localhost:8081
    ```

### Running the Server
To start the server:
1. Open a terminal or command prompt
2. Navigate to the project folder
3. Type the following command and press Enter:
    `npm start`
4. You should see a message like: **"Server running on port 5000"**
5. The server is now running and ready to accept connections

### Development Mode
If you're making changes to the code and want the server to automatically restart:
1. Use the development mode:
    `npm run dev`
2. The server will restart whenever you save changes to any file

### Running Tests
To verify everything is working correctly:
1. Run the test suite:
    `npm test`
2. You should see the test results showing passing tests

## API Documentation
The server provides a RESTful API for authentication, ride booking, and location services. All API routes are prefixed with /api.

### Authentication
Authentication uses JSON Web Tokens (JWT) for secure access.

* *Register a New User*
    * *Endpoint:* **POST /api/auth/signup**
    * *Purpose:* Creates a new user account for the ride booking application
    * *How it works:* Takes user details, validates them, ensures email isn't already in use, securely hashes the password, and returns a JWT token
    * *Request Body:*
        ```json
        {
            "name": "John Doe",
            "email": "john@example.com",
            "password": "password123"
        }
        ```
    * *Response* (201 Created):
        ```json
        {
            "message": "User registered successfully",
            "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "user": {
                "id": 1683026578943,
                "name": "John Doe",
                "email": "john@example.com"
            }
        }
        ```
    * *Error Responses:*
        * 400: Validation error (name too short, invalid email, password too short)
        * 409: Email already exists
        * 500: Server error

* *Login*
    * *Endpoint:* **POST /api/auth/login**
    * *Purpose:* Authenticates existing users and provides access tokens
    * *How it works:* Verifies user credentials against stored data, uses bcrypt to compare hashed passwords, and issues a JWT token upon successful verification
    * *Request Body:*
    ```json
        {
            "email": "john@example.com",
            "password": "password123"
        }
    ```
    * *Response* (200 OK):
    ```json
        {
            "message": "Login successful",
            "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "user": {
                "id": 1683026578943,
                "name": "John Doe",
                "email": "john@example.com"
            }
        }
    ```
    * *Error Responses:*
        * 400: Validation error (invalid email format, missing password)
        * 401: Invalid email or password
        * 500: Server error

### Ride Management
All ride management endpoints require authentication. Include the JWT token in the request header:
`Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

* *Create a New Ride*
    * *Endpoint:* **POST /api/rides**
    * *Purpose:* Books a new ride with automatic driver assignment
    * *How it works:* Finds the nearest available driver based on user location, calculates ride cost based on distance, provides ETA and ride duration estimates, and creates a new ride record
    * *Request Body:*
    ```json
        {
            "destination": "Central Park, New York",
            "pickup_location": "Times Square",
            "pickup_coordinates": [-73.9812, 40.7602]
        }
    ```
    * *Response (201 Created):*
    ```json
        {
            "id": 1683026789456,
            "userId": 1683026578943,
            "destination": "Central Park, New York",
            "pickup_location": "Times Square",
            "dropoff_location": "Central Park, New York",
            "status": "Driver on the way",
            "lastUpdated": "2023-05-02T15:33:09.456Z",
            "date": "2023-05-02T15:33:09.456Z",
            "cost": 12,
            "distance": 2.1,
            "pickup_coordinates": [-73.9812, 40.7602],
            "destination_coordinates": [-73.9654, 40.7829],
            "driver": {
                "id": 1,
                "name": "John Smith",
                "rating": 4.8,
                "location": "Manhattan, New York"
            },
            "vehicle": {
                "model": "Toyota Camry",
                "color": "Black",
                "plate": "NYC-1234"
            },
            "eta": "7 minutes",
            "ride_duration": "5 minutes",
            "estimated_arrival": "2023-05-02T15:40:09.456Z"
        }
    ```
    * *Error Responses:*
        * 400: Validation error (destination too short)
        * 500: Server error

* *Get Ride Status*
    * *Endpoint:* **GET /api/rides/status**
    * *Purpose:* Retrieves the latest status of a user's active ride
    * *How it works:* Finds the most recent active ride for the authenticated user, intelligently updates the ride status based on elapsed time, and applies realistic timing between status transitions
    * *Response* (200 OK):
    ```json
        {
            "id": 1683026789456,
            "status": "Driver arrived",
            "lastUpdated": "2023-05-02T15:38:09.456Z",
            "eta": "Driver has arrived",
            // ... other ride details
        }
    ```
    * *Error Responses:*
        * 404: No active ride found
        * 500: Server error

* *Update Ride Status (User-Controlled)*
    * *Endpoint:* **PUT /api/rides/:id/status**
    * *Purpose:* Allows users to manually update their ride status
    * *How it works:* Validates that the requested status transition is allowed (follows logical sequence), ensures users can only update their own rides, and prevents modifications to completed or cancelled rides
    * *Request Body:*
    ```json
        {
            "status": "Ride started"
        }
    ```
    * *Response* (200 OK):
    ```json
        {
            "id": 1683026789456,
            "status": "Ride started",
            "lastUpdated": "2023-05-02T15:40:09.456Z",
            "eta": "5 minutes",
            // ... other ride details
        }
    ```
    * *Error Responses:*
        * 400: Invalid status transition
        * 403: Cannot update someone else's ride
        * 404: Ride not found
        * 500: Server error

* *Cancel a Ride*
    * *Endpoint:* **DELETE /api/rides/:id**
    * *Purpose:* Allows users to cancel an active ride
    * *How it works:* Verifies the ride belongs to the requesting user, checks if the ride is eligible for cancellation (not already completed), and updates the ride status to "cancelled"
    * *Response* (200 OK):
    ```json
        {
            "message": "Ride cancelled successfully"
        }
    ```
    * *Error Responses:*
        * 400: Cannot cancel a completed ride
        * 403: Cannot cancel someone else's ride
        * 404: Ride not found
        * 500: Server error

* *Get Ride History*
    * *Endpoint:* **GET /api/rides/history**
    * *Purpose:* Retrieves the user's past rides with optional filtering
    * *How it works:* Gets all rides for the authenticated user, applies status filtering if requested, and sorts rides by date (most recent first)
    * *Query Parameters:*
        * status: Filter by ride status (completed, in_progress, cancelled)
    * *Response* (200 OK):
    ```json
        [
            {
                "id": 1683026789456,
                "userId": 1683026578943,
                "destination": "Central Park, New York",
                "status": "completed",
                "date": "2023-05-02T15:33:09.456Z",
                // ... other ride details
            },
            // ... more rides
        ]
    ```
    * *Error Responses:*
        * 404: No rides found
        * 500: Server error

### Location Services
* *Search Places*
    * *Endpoint:* **GET /api/rides/places**
    * *Purpose:* Searches for locations using geographic data
    * *How it works:* First checks a local cache for common locations to reduce API calls, uses a rotating pool of user agents when calling the Nominatim API to avoid rate limits, and falls back to mock data for reliability
    * *Query Parameters:*
        * query: The search term (e.g., "New York", "Eiffel Tower")
    * *Response* (200 OK):
    ```json
        [
            {
                "id": "123456",
                "place_name": "New York City, NY, USA",
                "geometry": {
                "coordinates": [-74.0060, 40.7128]
                },
                "address": "New York City, NY, USA"
            },
            // ... more places
        ]
    ```
    * *Error Responses:*
        * 400: Missing or invalid search query
        * 404: No places found
        * 500: Server error

### WebSocket Implementation
The application uses Socket.IO for real-time ride status updates. This allows users to receive immediate notifications when their ride status changes without having to poll the server.

*Available Events*
* *Client to Server*
    * **joinRide**
        * *Purpose:* Allows a client to subscribe to updates for a specific ride
        * *How it works:* Creates a room for each ride where status updates are broadcast, validates the ride ID and existence, and immediately sends the current ride status upon joining
        * *Parameters:*
            * `rideId:` The ID of the ride to join
            ```javascript
            // Client-side example
            socket.emit("joinRide", rideId);
            ```
* *Server to Client*
    * ***statusUpdate***
        * *Purpose:* Notifies clients about ride status changes
        * *How it works:* Automatically emitted to all clients in the ride's room whenever the ride status changes, either from periodic server updates or manual user actions
        * *Data:*
            Complete ride object with updated status
            ```javascript
            // Client-side example
            socket.on("statusUpdate", (updatedRide) => {
            console.log("New status:", updatedRide.status);
            // Update UI with new ride information
            });
            ```

    * ***error***
        * *Purpose:* Notifies the client about errors during WebSocket operations
        * *How it works:* Sent when an operation like joining a ride fails, providing clear error messages
        * *Data:*
            * Error message object
            ```javascript
            // Client-side example
            socket.on("error", (error) => {
            console.error("WebSocket error:", error.message);
            // Display error to user
            });
            ```
        * *Usage Examples*
            * *Complete Client Implementation*
            ```javascript
            import { io } from "socket.io-client";

            // Connect to the server
            const socket = io("http://localhost:5000");

            // Handle connection events
            socket.on("connect", () => {
            console.log("Connected to server");
            
            // Join a specific ride once connected
            socket.emit("joinRide", "1683026789456");
            });

            // Listen for status updates
            socket.on("statusUpdate", (ride) => {
            console.log(`Ride status updated to: ${ride.status}`);
            updateRideInfoInUI(ride);
            });

            // Handle errors
            socket.on("error", (error) => {
            console.error(`Socket error: ${error.message}`);
            showErrorToUser(error.message);
            });

            // Handle disconnection
            socket.on("disconnect", () => {
            console.log("Disconnected from server");
            showDisconnectedMessage();
            });
            ```

### Testing
The application includes comprehensive unit tests for all major components to ensure reliability and correct functionality.

*Authentication Tests*
Tests cover user registration and login scenarios:
* Successful user registration with valid data
* Registration validation errors (name too short, invalid email, password too short)
* Preventing duplicate email registration
* Successful login with correct credentials
* Login validation (missing email/password, invalid format)
* Authentication failures with incorrect credentials

*Ride Management Tests*
* Tests validate all ride-related functionality:
* Creating a new ride with valid destination
* Validation errors during ride creation
* Fetching ride status and automatic status progression
* Retrieving ride history with and without filters
* Cancelling rides and proper error handling
* Manually updating ride status and validating status transitions

*WebSocket Tests*
* Tests ensure the real-time communication works correctly:
* Joining a ride room and receiving initial status
* Error handling for invalid ride IDs
* Error handling for non-existent rides
* Real-time status update broadcasts

To run all tests:
`npm test`

For continuous testing during development:
`npm run test:watch`

This server implements an in-memory database for simplicity in the demo version. In a production environment, you would replace this with a real database like MongoDB, PostgreSQL, or MySQL.
