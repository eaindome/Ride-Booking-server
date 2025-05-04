/**
 * Centralized ride status management utility
 * Handles all status transitions, validation, and related logic
 */

// Status constants
const STATUSES = {
  DRIVER_ON_WAY: "Driver on the way",
  DRIVER_ARRIVED: "Driver arrived",
  RIDE_STARTED: "Ride started",
  RIDE_COMPLETED: "Ride completed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  EN_ROUTE: "en route",
};

/**
 * Get the next valid status in the automatic progression
 * @param {string} currentStatus - The ride's current status
 * @returns {string|null} The next status, or null if no valid transition exists
 */
const getNextAutomaticStatus = (currentStatus) => {
  const statusMap = {
    [STATUSES.PENDING]: STATUSES.IN_PROGRESS,
    [STATUSES.EN_ROUTE]: STATUSES.IN_PROGRESS,
    [STATUSES.DRIVER_ON_WAY]: STATUSES.DRIVER_ARRIVED,
    [STATUSES.DRIVER_ARRIVED]: STATUSES.RIDE_STARTED,
    [STATUSES.RIDE_STARTED]: STATUSES.COMPLETED,
    [STATUSES.RIDE_COMPLETED]: STATUSES.COMPLETED,
    [STATUSES.IN_PROGRESS]: STATUSES.COMPLETED,
  };

  return statusMap[currentStatus] || null;
};

/**
 * Get valid manual status transitions from a given status
 * @param {string} currentStatus - The ride's current status
 * @returns {string[]} Array of valid status values that users can manually set
 */
const getValidManualTransitions = (currentStatus) => {
  const transitionMap = {
    [STATUSES.DRIVER_ON_WAY]: [STATUSES.DRIVER_ARRIVED, STATUSES.CANCELLED],
    [STATUSES.DRIVER_ARRIVED]: [STATUSES.RIDE_STARTED, STATUSES.CANCELLED],
    [STATUSES.RIDE_STARTED]: [
      STATUSES.RIDE_COMPLETED,
      STATUSES.COMPLETED,
      STATUSES.CANCELLED,
    ],
    [STATUSES.RIDE_COMPLETED]: [STATUSES.COMPLETED],
  };

  return transitionMap[currentStatus] || [];
};

/**
 * Check if a status transition is valid for manual updates
 * @param {string} fromStatus - The current status
 * @param {string} toStatus - The requested new status
 * @returns {boolean} True if the transition is valid
 */
const isValidManualTransition = (fromStatus, toStatus) => {
  const validTransitions = getValidManualTransitions(fromStatus);
  return validTransitions.includes(toStatus);
};

/**
 * Get minimum time (in minutes) a ride should remain in given status
 * @param {string} status - The ride status
 * @param {boolean} isTestEnv - Whether running in test environment
 * @returns {number} Time in minutes
 */
const getMinTimeForStatus = (status, isTestEnv = false) => {
  // Define minimum times for each status (in minutes)
  const minTimePerStatus = {
    [STATUSES.DRIVER_ON_WAY]: isTestEnv ? 0.1 : 1, // 1 minute minimum as driver on the way
    [STATUSES.DRIVER_ARRIVED]: isTestEnv ? 0.1 : 0.5, // 30 seconds minimum as arrived
    [STATUSES.RIDE_STARTED]: isTestEnv ? 0.1 : 0.1, // 6 seconds minimum for the ride
    default: isTestEnv ? 0.1 : 0.1, // 6 seconds for other statuses
  };

  return minTimePerStatus[status] || minTimePerStatus.default;
};

/**
 * Update the ETA based on status change
 * @param {Object} ride - The ride object
 * @param {string} newStatus - The new status
 * @returns {string} Updated ETA value
 */
const getUpdatedETA = (ride, newStatus) => {
  switch (newStatus) {
    case STATUSES.DRIVER_ARRIVED:
      return "Driver has arrived";
    case STATUSES.RIDE_STARTED:
      return ride.ride_duration || "In progress";
    case STATUSES.RIDE_COMPLETED:
    case STATUSES.COMPLETED:
      return "Completed";
    default:
      return ride.eta || "Updating...";
  }
};

/**
 * Check if enough time has passed for a status transition
 * @param {string} lastUpdatedTimestamp - ISO timestamp of last update
 * @param {string} currentStatus - Current ride status
 * @param {boolean} isTestEnv - Whether in test environment
 * @returns {boolean} True if enough time has passed
 */
const hasEnoughTimePassed = (
  lastUpdatedTimestamp,
  currentStatus,
  isTestEnv = false
) => {
  const lastUpdateTime = new Date(lastUpdatedTimestamp).getTime();
  const currentTime = Date.now();
  const elapsedMinutes = (currentTime - lastUpdateTime) / (60 * 1000);

  // Get the minimum time required for the current status
  const requiredMinTime = getMinTimeForStatus(currentStatus, isTestEnv);

  return elapsedMinutes >= requiredMinTime;
};

/**
 * Determine if a ride is active
 * @param {Object} ride - The ride object
 * @returns {boolean} True if ride is active
 */
const isActiveRide = (ride) => {
  return (
    ride.status !== STATUSES.COMPLETED && ride.status !== STATUSES.CANCELLED
  );
};

module.exports = {
  STATUSES,
  getNextAutomaticStatus,
  getValidManualTransitions,
  isValidManualTransition,
  getMinTimeForStatus,
  getUpdatedETA,
  hasEnoughTimePassed,
  isActiveRide,
};
