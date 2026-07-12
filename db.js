// TransitOps Database and Business Logic Layer
// Persisted in localStorage

const DB_KEY = 'transitops_db_state';

// Default Seed Data
const DEFAULT_STATE = {
  users: [
    { id: 'u1', name: 'Fleet Manager', email: 'manager@transitops.com', password: 'password123', role: 'fleet_manager' },
    { id: 'u2', name: 'Alex Dispatcher', email: 'driver@transitops.com', password: 'password123', role: 'driver' },
    { id: 'u3', name: 'Safety Officer', email: 'safety@transitops.com', password: 'password123', role: 'safety_officer' },
    { id: 'u4', name: 'Financial Analyst', email: 'finance@transitops.com', password: 'password123', role: 'financial_analyst' }
  ],
  vehicles: [
    { id: 'TRK-01', name: 'Volvo FH16 Heavy', type: 'Truck', max_load: 12000, odometer: 150000, acquisition_cost: 135000, status: 'Available', documents: ['registration_2026.pdf', 'insurance_policy.pdf'] },
    { id: 'VAN-02', name: 'Ford Transit Cargo', type: 'Van', max_load: 1800, odometer: 85000, acquisition_cost: 45000, status: 'Available', documents: ['insurance_policy.pdf'] },
    { id: 'SED-03', name: 'Tesla Model Y Fleet', type: 'Sedan', max_load: 450, odometer: 32000, acquisition_cost: 52000, status: 'Available', documents: [] },
    { id: 'TRK-04', name: 'Kenworth T680 Semi', type: 'Semi', max_load: 18000, odometer: 310000, acquisition_cost: 165000, status: 'Retired', documents: [] }
  ],
  drivers: [
    { id: 'DL-98721', name: 'John Doe', license_category: 'Class A CDL', license_expiry: '2027-12-15', contact: '+1 (555) 234-5678', safety_score: 95, status: 'Available', documents: ['john_license.jpg'] },
    { id: 'DL-44321', name: 'Sarah Smith', license_category: 'Class B CDL', license_expiry: '2026-09-20', contact: '+1 (555) 876-5432', safety_score: 88, status: 'Available', documents: [] },
    { id: 'DL-11002', name: 'Mike Johnson', license_category: 'Class C Standard', license_expiry: '2025-05-10', contact: '+1 (555) 345-6789', safety_score: 72, status: 'Available', documents: [] }, // Expired
    { id: 'DL-55443', name: 'Robert Miller', license_category: 'Class A CDL', license_expiry: '2028-01-30', contact: '+1 (555) 901-2345', safety_score: 45, status: 'Suspended', documents: [] } // Suspended
  ],
  trips: [
    { id: 'TRIP-101', source: 'Chicago Depot', destination: 'Detroit Hub', vehicle_id: 'VAN-02', driver_id: 'DL-44321', cargo_weight: 1200, planned_distance: 450, status: 'Completed', start_date: '2026-07-01', end_date: '2026-07-02', final_odometer: 85450, fuel_consumed_liters: 75, revenue: 1125 },
    { id: 'TRIP-102', source: 'Chicago Depot', destination: 'Milwaukee Sort', vehicle_id: 'TRK-01', driver_id: 'DL-98721', cargo_weight: 9500, planned_distance: 150, status: 'Draft', start_date: '2026-07-10', end_date: '', final_odometer: 0, fuel_consumed_liters: 0, revenue: 375 }
  ],
  maintenance: [
    { id: 'MNT-201', vehicle_id: 'SED-03', description: 'Battery coolant service & tire rotation', cost: 650, date: '2026-06-15', status: 'Closed' }
  ],
  expenses: [
    { id: 'EXP-301', vehicle_id: 'VAN-02', trip_id: 'TRIP-101', type: 'Fuel', amount: 150, liters: 75, date: '2026-07-02', notes: 'Fuel fillup during Trip-101' },
    { id: 'EXP-302', vehicle_id: 'SED-03', trip_id: '', type: 'Maintenance', amount: 650, liters: 0, date: '2026-06-15', notes: 'Linked to MNT-201 service' },
    { id: 'EXP-303', vehicle_id: 'VAN-02', trip_id: 'TRIP-101', type: 'Toll', amount: 35, liters: 0, date: '2026-07-01', notes: 'I-94 Expressway Tolls' }
  ]
};

// Initialize State
function loadDB() {
  const data = localStorage.getItem(DB_KEY);
  if (!data) {
    saveDB(DEFAULT_STATE);
    return DEFAULT_STATE;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error("Error parsing DB state, resetting to default", e);
    saveDB(DEFAULT_STATE);
    return DEFAULT_STATE;
  }
}

function saveDB(state) {
  localStorage.setItem(DB_KEY, JSON.stringify(state));
}

// Global DB Reference
let db = loadDB();

// Helper to generate IDs
function generateId(prefix) {
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}

// Core Operations
const DB = {
  reset() {
    db = JSON.parse(JSON.stringify(DEFAULT_STATE));
    saveDB(db);
    return db;
  },

  // Auth Operations
  login(email, password) {
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) throw new Error("Invalid email or password.");
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  },

  // Vehicles
  getVehicles() {
    return db.vehicles;
  },
  
  addVehicle(vehicle) {
    // Rule: Vehicle Registration must be unique
    const exists = db.vehicles.some(v => v.id.toUpperCase() === vehicle.id.toUpperCase());
    if (exists) throw new Error(`Vehicle with registration number ${vehicle.id} already exists.`);
    
    const newVehicle = {
      id: vehicle.id.toUpperCase().trim(),
      name: vehicle.name.trim(),
      type: vehicle.type,
      max_load: Number(vehicle.max_load),
      odometer: Number(vehicle.odometer),
      acquisition_cost: Number(vehicle.acquisition_cost),
      status: vehicle.status || 'Available',
      documents: vehicle.documents || []
    };
    db.vehicles.push(newVehicle);
    saveDB(db);
    return newVehicle;
  },

  updateVehicle(id, updatedFields) {
    const idx = db.vehicles.findIndex(v => v.id === id);
    if (idx === -1) throw new Error("Vehicle not found.");
    
    // Merge updates
    db.vehicles[idx] = {
      ...db.vehicles[idx],
      name: updatedFields.name !== undefined ? updatedFields.name.trim() : db.vehicles[idx].name,
      type: updatedFields.type !== undefined ? updatedFields.type : db.vehicles[idx].type,
      max_load: updatedFields.max_load !== undefined ? Number(updatedFields.max_load) : db.vehicles[idx].max_load,
      odometer: updatedFields.odometer !== undefined ? Number(updatedFields.odometer) : db.vehicles[idx].odometer,
      acquisition_cost: updatedFields.acquisition_cost !== undefined ? Number(updatedFields.acquisition_cost) : db.vehicles[idx].acquisition_cost,
      status: updatedFields.status !== undefined ? updatedFields.status : db.vehicles[idx].status,
      documents: updatedFields.documents !== undefined ? updatedFields.documents : db.vehicles[idx].documents
    };
    saveDB(db);
    return db.vehicles[idx];
  },

  deleteVehicle(id) {
    // Ensure not assigned to any active trip
    const activeTrip = db.trips.some(t => t.vehicle_id === id && t.status === 'Dispatched');
    if (activeTrip) throw new Error("Cannot delete a vehicle currently on an active trip.");
    
    db.vehicles = db.vehicles.filter(v => v.id !== id);
    saveDB(db);
  },

  // Drivers
  getDrivers() {
    // Dynamically check license expiry and status mapping
    const today = new Date().toISOString().split('T')[0];
    db.drivers.forEach(d => {
      // License check warning triggers locally in app.js
    });
    return db.drivers;
  },

  addDriver(driver) {
    const exists = db.drivers.some(d => d.id.toUpperCase() === driver.id.toUpperCase());
    if (exists) throw new Error(`Driver with license number ${driver.id} already exists.`);
    
    const newDriver = {
      id: driver.id.toUpperCase().trim(),
      name: driver.name.trim(),
      license_category: driver.license_category,
      license_expiry: driver.license_expiry, // YYYY-MM-DD
      contact: driver.contact.trim(),
      safety_score: Number(driver.safety_score) || 100,
      status: driver.status || 'Available',
      documents: driver.documents || []
    };
    db.drivers.push(newDriver);
    saveDB(db);
    return newDriver;
  },

  updateDriver(id, updatedFields) {
    const idx = db.drivers.findIndex(d => d.id === id);
    if (idx === -1) throw new Error("Driver not found.");

    db.drivers[idx] = {
      ...db.drivers[idx],
      name: updatedFields.name !== undefined ? updatedFields.name.trim() : db.drivers[idx].name,
      license_category: updatedFields.license_category !== undefined ? updatedFields.license_category : db.drivers[idx].license_category,
      license_expiry: updatedFields.license_expiry !== undefined ? updatedFields.license_expiry : db.drivers[idx].license_expiry,
      contact: updatedFields.contact !== undefined ? updatedFields.contact.trim() : db.drivers[idx].contact,
      safety_score: updatedFields.safety_score !== undefined ? Number(updatedFields.safety_score) : db.drivers[idx].safety_score,
      status: updatedFields.status !== undefined ? updatedFields.status : db.drivers[idx].status,
      documents: updatedFields.documents !== undefined ? updatedFields.documents : db.drivers[idx].documents
    };
    saveDB(db);
    return db.drivers[idx];
  },

  deleteDriver(id) {
    const activeTrip = db.trips.some(t => t.driver_id === id && t.status === 'Dispatched');
    if (activeTrip) throw new Error("Cannot delete a driver currently on an active trip.");

    db.drivers = db.drivers.filter(d => d.id !== id);
    saveDB(db);
  },

  // Trips
  getTrips() {
    return db.trips;
  },

  addTrip(trip) {
    const vehicle = db.vehicles.find(v => v.id === trip.vehicle_id);
    const driver = db.drivers.find(d => d.id === trip.driver_id);

    if (!vehicle) throw new Error("Selected vehicle does not exist.");
    if (!driver) throw new Error("Selected driver does not exist.");

    // Rule: Retired or In Shop vehicles must never appear in the dispatch selection
    if (vehicle.status === 'Retired' || vehicle.status === 'In Shop') {
      throw new Error(`Vehicle status is '${vehicle.status}'. It cannot be assigned to a trip.`);
    }

    // Rule: Drivers with expired licenses or Suspended status cannot be assigned to trips.
    const today = new Date().toISOString().split('T')[0];
    if (driver.license_expiry < today) {
      throw new Error("Cannot assign driver: License has expired.");
    }
    if (driver.status === 'Suspended') {
      throw new Error("Cannot assign driver: Driver status is Suspended.");
    }

    // Rule: Driver or vehicle already marked On Trip cannot be assigned to another trip.
    if (vehicle.status === 'On Trip') {
      throw new Error("Selected vehicle is already On Trip.");
    }
    if (driver.status === 'On Trip') {
      throw new Error("Selected driver is already On Trip.");
    }

    // Rule: Cargo Weight must not exceed the vehicle's maximum load capacity
    if (Number(trip.cargo_weight) > vehicle.max_load) {
      throw new Error(`Cargo Weight (${trip.cargo_weight} kg) exceeds vehicle's maximum load capacity (${vehicle.max_load} kg).`);
    }

    const newTrip = {
      id: generateId('TRIP'),
      source: trip.source.trim(),
      destination: trip.destination.trim(),
      vehicle_id: trip.vehicle_id,
      driver_id: trip.driver_id,
      cargo_weight: Number(trip.cargo_weight),
      planned_distance: Number(trip.planned_distance),
      status: 'Draft',
      start_date: '',
      end_date: '',
      final_odometer: 0,
      fuel_consumed_liters: 0,
      revenue: Number(trip.revenue) || Math.round(Number(trip.planned_distance) * 2.5) // Default revenue rate
    };

    db.trips.push(newTrip);
    saveDB(db);
    return newTrip;
  },

  dispatchTrip(id) {
    const trip = db.trips.find(t => t.id === id);
    if (!trip) throw new Error("Trip not found.");
    if (trip.status !== 'Draft') throw new Error("Only Draft trips can be dispatched.");

    const vehicle = db.vehicles.find(v => v.id === trip.vehicle_id);
    const driver = db.drivers.find(d => d.id === trip.driver_id);

    if (!vehicle || !driver) throw new Error("Assigned vehicle or driver is missing.");

    // Rule check: Double validation on dispatch
    if (vehicle.status === 'On Trip' || vehicle.status === 'In Shop' || vehicle.status === 'Retired') {
      throw new Error("Vehicle is no longer available for dispatch.");
    }
    if (driver.status === 'On Trip' || driver.status === 'Suspended') {
      throw new Error("Driver is no longer available for dispatch.");
    }
    const today = new Date().toISOString().split('T')[0];
    if (driver.license_expiry < today) {
      throw new Error("Driver's license is expired.");
    }

    // Rule: Dispatching a trip automatically changes both vehicle and driver status to On Trip
    trip.status = 'Dispatched';
    trip.start_date = today;
    
    vehicle.status = 'On Trip';
    driver.status = 'On Trip';

    saveDB(db);
    return trip;
  },

  completeTrip(id, finalOdometer, fuelConsumedLiters) {
    const trip = db.trips.find(t => t.id === id);
    if (!trip) throw new Error("Trip not found.");
    if (trip.status !== 'Dispatched') throw new Error("Only Dispatched trips can be completed.");

    const vehicle = db.vehicles.find(v => v.id === trip.vehicle_id);
    const driver = db.drivers.find(d => d.id === trip.driver_id);

    if (!vehicle || !driver) throw new Error("Vehicle or driver not found.");

    if (Number(finalOdometer) <= vehicle.odometer) {
      throw new Error(`Final odometer (${finalOdometer} km) must be greater than current vehicle odometer (${vehicle.odometer} km).`);
    }

    const actualDistance = Number(finalOdometer) - vehicle.odometer;

    // Update trip details
    trip.status = 'Completed';
    trip.end_date = new Date().toISOString().split('T')[0];
    trip.final_odometer = Number(finalOdometer);
    trip.fuel_consumed_liters = Number(fuelConsumedLiters);

    // Update vehicle odometer and return to Available
    vehicle.odometer = Number(finalOdometer);
    vehicle.status = 'Available';

    // Return driver to Available
    driver.status = 'Available';

    // Log fuel expense automatically
    if (Number(fuelConsumedLiters) > 0) {
      const fuelCost = Math.round(Number(fuelConsumedLiters) * 1.85); // Simulated average fuel price ($1.85/L)
      this.addFuelExpense({
        vehicle_id: vehicle.id,
        trip_id: trip.id,
        type: 'Fuel',
        amount: fuelCost,
        liters: Number(fuelConsumedLiters),
        date: trip.end_date,
        notes: `Auto-logged: Completed trip ${trip.id} (${actualDistance} km run).`
      });
    }

    saveDB(db);
    return trip;
  },

  cancelTrip(id) {
    const trip = db.trips.find(t => t.id === id);
    if (!trip) throw new Error("Trip not found.");
    if (trip.status !== 'Dispatched' && trip.status !== 'Draft') {
      throw new Error("Only Draft or Dispatched trips can be cancelled.");
    }

    const vehicle = db.vehicles.find(v => v.id === trip.vehicle_id);
    const driver = db.drivers.find(d => d.id === trip.driver_id);

    // Rule: Cancelling a dispatched trip restores vehicle and driver to Available
    if (trip.status === 'Dispatched') {
      if (vehicle) vehicle.status = 'Available';
      if (driver) driver.status = 'Available';
    }

    trip.status = 'Cancelled';
    saveDB(db);
    return trip;
  },

  // Maintenance
  getMaintenanceLogs() {
    return db.maintenance;
  },

  addMaintenanceLog(log) {
    const vehicle = db.vehicles.find(v => v.id === log.vehicle_id);
    if (!vehicle) throw new Error("Vehicle not found.");
    if (vehicle.status === 'Retired') throw new Error("Cannot maintain a retired vehicle.");
    if (vehicle.status === 'On Trip') throw new Error("Cannot send a vehicle to maintenance while it is on a trip.");

    const logId = generateId('MNT');
    const newLog = {
      id: logId,
      vehicle_id: log.vehicle_id,
      description: log.description.trim(),
      cost: Number(log.cost),
      date: log.date || new Date().toISOString().split('T')[0],
      status: 'Open'
    };

    db.maintenance.push(newLog);

    // Rule: Creating an active maintenance record automatically changes vehicle status to In Shop
    vehicle.status = 'In Shop';

    // Log the maintenance cost in expenses as well
    this.addFuelExpense({
      vehicle_id: log.vehicle_id,
      trip_id: '',
      type: 'Maintenance',
      amount: Number(log.cost),
      liters: 0,
      date: newLog.date,
      notes: `Linked to maintenance ${logId}: ${log.description}`
    });

    saveDB(db);
    return newLog;
  },

  closeMaintenanceLog(id) {
    const log = db.maintenance.find(m => m.id === id);
    if (!log) throw new Error("Maintenance record not found.");
    if (log.status !== 'Open') throw new Error("Maintenance is already closed.");

    log.status = 'Closed';

    // Rule: Closing maintenance restores the vehicle to Available (unless retired)
    const vehicle = db.vehicles.find(v => v.id === log.vehicle_id);
    if (vehicle && vehicle.status !== 'Retired') {
      vehicle.status = 'Available';
    }

    saveDB(db);
    return log;
  },

  // Expenses
  getFuelExpenses() {
    return db.expenses;
  },

  addFuelExpense(expense) {
    const vehicle = db.vehicles.find(v => v.id === expense.vehicle_id);
    if (!vehicle) throw new Error("Vehicle not found.");

    const newExpense = {
      id: generateId('EXP'),
      vehicle_id: expense.vehicle_id,
      trip_id: expense.trip_id || '',
      type: expense.type, // 'Fuel', 'Toll', 'Insurance', 'Maintenance', 'Other'
      amount: Number(expense.amount),
      liters: expense.type === 'Fuel' ? Number(expense.liters) : 0,
      date: expense.date || new Date().toISOString().split('T')[0],
      notes: expense.notes ? expense.notes.trim() : ''
    };

    db.expenses.push(newExpense);
    saveDB(db);
    return newExpense;
  },

  deleteFuelExpense(id) {
    db.expenses = db.expenses.filter(e => e.id !== id);
    saveDB(db);
  },

  // Calculations & Analytics
  getVehicleTotalCost(vehicleId) {
    // Automatically compute total operational cost (Fuel + Maintenance + Tolls + etc) per vehicle
    const vehicleExpenses = db.expenses.filter(e => e.vehicle_id === vehicleId);
    return vehicleExpenses.reduce((sum, e) => sum + e.amount, 0);
  },

  getVehicleFuelEfficiency(vehicleId) {
    // Dynamic Fuel Efficiency: Total Distance Run / Total Fuel Consumed (liters)
    // Distance run is calculated from completed trips
    const completedTrips = db.trips.filter(t => t.vehicle_id === vehicleId && t.status === 'Completed');
    
    // We can compute distance as: actual end odometer - start odometer of vehicle, 
    // or sum of trip distance. Let's sum the trip distance (which is equal to final_odometer - start_odometer if we track it).
    // Let's use the completed trip plan distances or differences in odometer.
    let totalDistance = 0;
    let totalFuel = 0;

    completedTrips.forEach(t => {
      // Calculate distance based on final odometer less vehicle's preceding odometer,
      // or simply sum planned_distance if final_odometer is captured.
      // Let's use planned_distance for completed trips or standard delta.
      totalDistance += t.planned_distance;
      totalFuel += t.fuel_consumed_liters;
    });

    if (totalFuel === 0) return 0;
    return (totalDistance / totalFuel).toFixed(2); // km per Liter
  },

  getVehicleROI(vehicleId) {
    // ROI Formula: (Revenue - (Maintenance + Fuel + Expenses)) / Acquisition Cost
    const vehicle = db.vehicles.find(v => v.id === vehicleId);
    if (!vehicle || vehicle.acquisition_cost === 0) return 0;

    const completedTrips = db.trips.filter(t => t.vehicle_id === vehicleId && t.status === 'Completed');
    const totalRevenue = completedTrips.reduce((sum, t) => sum + (t.revenue || 0), 0);
    const totalExpenses = this.getVehicleTotalCost(vehicleId);

    const roiVal = (totalRevenue - totalExpenses) / vehicle.acquisition_cost;
    return (roiVal * 100).toFixed(1); // percentage
  },

  getFleetKPIs() {
    const totalVehicles = db.vehicles.length;
    const activeVehicles = db.vehicles.filter(v => v.status === 'On Trip').length;
    const availableVehicles = db.vehicles.filter(v => v.status === 'Available').length;
    const inShopVehicles = db.vehicles.filter(v => v.status === 'In Shop').length;
    const retiredVehicles = db.vehicles.filter(v => v.status === 'Retired').length;

    const activeTrips = db.trips.filter(t => t.status === 'Dispatched').length;
    const pendingTrips = db.trips.filter(t => t.status === 'Draft').length;
    const driversOnDuty = db.drivers.filter(d => d.status === 'Available' || d.status === 'On Trip').length;

    // Fleet utilization %: Active Vehicles / Total Non-Retired Vehicles * 100
    const nonRetiredCount = db.vehicles.filter(v => v.status !== 'Retired').length;
    const fleetUtilization = nonRetiredCount > 0 ? ((activeVehicles / nonRetiredCount) * 100).toFixed(1) : 0;

    return {
      activeVehicles,
      availableVehicles,
      inShopVehicles,
      retiredVehicles,
      activeTrips,
      pendingTrips,
      driversOnDuty,
      fleetUtilization
    };
  }
};

// Export to global scope for SPA ease of access
window.TransitOpsDB = DB;
