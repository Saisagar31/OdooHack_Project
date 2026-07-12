// TransitOps Client Application Controller

document.addEventListener("DOMContentLoaded", () => {
  // Application State
  let currentUser = null;
  let currentTheme = "dark";
  let activeTab = "dashboard";
  let costRevenueChart = null;
  let statusMixChart = null;
  let walkthroughStep = 0; // 0: Not started

  // DOM Elements
  const authView = document.getElementById("auth-view");
  const appView = document.getElementById("app-view");
  const loginForm = document.getElementById("login-form");
  const loginEmailInput = document.getElementById("login-email");
  const loginPasswordInput = document.getElementById("login-password");
  const quickRoleButtons = document.querySelectorAll(".btn-role-quick");

  const sidebarNavItems = document.querySelectorAll(".nav-item");
  const viewPanels = document.querySelectorAll(".view-panel");
  const pageTitle = document.getElementById("page-title");
  
  const userAvatar = document.getElementById("user-avatar");
  const userDisplayName = document.getElementById("user-display-name");
  const userDisplayRole = document.getElementById("user-display-role");
  const btnLogout = document.getElementById("btn-logout");

  const themeToggle = document.getElementById("theme-toggle");
  const alertsBtn = document.getElementById("alerts-btn");
  const alertsBadge = document.getElementById("alerts-badge");
  const alertsDropdown = document.getElementById("alerts-dropdown");
  const alertsList = document.getElementById("alerts-list");
  const clearAlertsBtn = document.getElementById("clear-alerts");
  
  const toastContainer = document.getElementById("toast-container");

  // Load active session from sessionStorage (for page persistence)
  const savedUser = sessionStorage.getItem("transitops_user");
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      initAppSession(currentUser);
    } catch (e) {
      sessionStorage.removeItem("transitops_user");
    }
  }

  // ==================== AUTHENTICATION & RBAC ====================

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;
    
    try {
      const user = window.TransitOpsDB.login(email, password);
      sessionStorage.setItem("transitops_user", JSON.stringify(user));
      currentUser = user;
      initAppSession(currentUser);
      showToast(`Welcome back, ${user.name}!`, "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  });

  // Quick Role Logins
  quickRoleButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const email = btn.getAttribute("data-email");
      loginEmailInput.value = email;
      loginPasswordInput.value = "password123";
      loginForm.dispatchEvent(new Event("submit"));
    });
  });

  btnLogout.addEventListener("click", () => {
    sessionStorage.removeItem("transitops_user");
    currentUser = null;
    appView.style.display = "none";
    authView.style.display = "flex";
    showToast("Signed out successfully.", "success");
  });

  function initAppSession(user) {
    authView.style.display = "none";
    appView.style.display = "grid";

    // Setup profile view
    const initials = user.name.split(" ").map(n => n[0]).join("").substring(0, 2);
    userAvatar.textContent = initials;
    userDisplayName.textContent = user.name;
    userDisplayRole.textContent = user.role.replace("_", " ");

    // Enforce Role-Based Access Control (RBAC) visually
    applyRBAC(user.role);

    // Initial renders
    switchTab("dashboard");
    checkComplianceAlerts();
    lucide.createIcons();
  }

  function applyRBAC(role) {
    // Enable everything for manager
    document.querySelectorAll(".rbac-mgr, .rbac-drv, .rbac-safety, .rbac-fin").forEach(el => el.style.display = "");

    if (role === "driver") {
      // Driver can see, but cannot add vehicles/drivers, or do financials
      document.querySelectorAll(".rbac-mgr, .rbac-safety, .rbac-fin").forEach(el => el.style.display = "none");
      document.querySelectorAll(".rbac-drv").forEach(el => el.style.display = "");
    } else if (role === "safety_officer") {
      // Safety officer manages drivers and compliance
      document.querySelectorAll(".rbac-mgr, .rbac-drv, .rbac-fin").forEach(el => el.style.display = "none");
      document.querySelectorAll(".rbac-safety").forEach(el => el.style.display = "");
    } else if (role === "financial_analyst") {
      // Financial analyst manages expenses and reports
      document.querySelectorAll(".rbac-mgr, .rbac-drv, .rbac-safety").forEach(el => el.style.display = "none");
      document.querySelectorAll(".rbac-fin").forEach(el => el.style.display = "");
    }
  }

  function checkRBACAction(allowedRoles, actionName) {
    if (!currentUser) return false;
    if (currentUser.role === "fleet_manager") return true; // Manager can do everything
    
    if (!allowedRoles.includes(currentUser.role)) {
      showToast(`Access Denied: Role '${currentUser.role.replace("_", " ")}' does not have permission to ${actionName}.`, "error");
      return false;
    }
    return true;
  }

  // ==================== TOAST & UI HELPERS ====================

  function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    let icon = "check-circle-2";
    if (type === "warning") icon = "alert-triangle";
    if (type === "error") icon = "alert-circle";

    toast.innerHTML = `
      <i data-lucide="${icon}"></i>
      <span>${message}</span>
    `;
    toastContainer.appendChild(toast);
    lucide.createIcons();

    // Auto-remove
    setTimeout(() => {
      toast.style.animation = "slideInRight 0.3s reverse forwards";
      toast.addEventListener("animationend", () => {
        toast.remove();
      });
    }, 4000);
  }

  // ==================== VIEW NAVIGATION ====================

  sidebarNavItems.forEach(item => {
    item.addEventListener("click", () => {
      const tab = item.getAttribute("data-tab");
      switchTab(tab);
    });
  });

  // KPI card redirects to list views
  document.querySelectorAll(".kpi-card[data-tab-redirect]").forEach(card => {
    card.addEventListener("click", () => {
      const tab = card.getAttribute("data-tab-redirect");
      const filter = card.getAttribute("data-filter-redirect");
      switchTab(tab);
      if (filter) {
        if (tab === "vehicles") {
          document.getElementById("vehicle-filter-status").value = filter;
          renderVehiclesTable();
        } else if (tab === "trips") {
          document.getElementById("trip-filter-status").value = filter;
          renderTripsTable();
        } else if (tab === "drivers") {
          document.getElementById("driver-filter-status").value = filter;
          renderDriversTable();
        }
      }
    });
  });

  function switchTab(tab) {
    activeTab = tab;
    
    // Update Sidebar Navigation state
    sidebarNavItems.forEach(item => {
      if (item.getAttribute("data-tab") === tab) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    // Update views visibility
    viewPanels.forEach(panel => {
      if (panel.id === `${tab}-view`) {
        panel.classList.add("active");
      } else {
        panel.classList.remove("active");
      }
    });

    // Update Header Title
    let titleStr = tab.charAt(0).toUpperCase() + tab.slice(1);
    if (tab === "reports") titleStr = "Reports & Analytics";
    if (tab === "maintenance") titleStr = "Maintenance Logs";
    pageTitle.textContent = titleStr;

    // Refresh view specific components
    if (tab === "dashboard") {
      updateDashboardKPIs();
      renderDashboardCharts();
    } else if (tab === "vehicles") {
      renderVehiclesTable();
    } else if (tab === "drivers") {
      renderDriversTable();
    } else if (tab === "trips") {
      renderTripsTable();
    } else if (tab === "maintenance") {
      renderMaintenanceTable();
    } else if (tab === "expenses") {
      renderExpensesTable();
    } else if (tab === "reports") {
      renderReportsView();
    }

    lucide.createIcons();
  }

  // ==================== THEME TOGGLER ====================

  themeToggle.addEventListener("click", () => {
    const html = document.documentElement;
    if (currentTheme === "dark") {
      html.setAttribute("data-theme", "light");
      currentTheme = "light";
      themeToggle.innerHTML = '<i data-lucide="moon"></i>';
    } else {
      html.setAttribute("data-theme", "dark");
      currentTheme = "dark";
      themeToggle.innerHTML = '<i data-lucide="sun"></i>';
    }
    lucide.createIcons();
    // Re-render charts for appropriate grid colors
    if (activeTab === "dashboard") {
      renderDashboardCharts();
    }
  });

  // ==================== ALERTS CENTER & REMINDERS ====================

  alertsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    alertsDropdown.classList.toggle("active");
  });

  document.addEventListener("click", () => {
    alertsDropdown.classList.remove("active");
  });

  alertsDropdown.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  clearAlertsBtn.addEventListener("click", () => {
    showToast("Safety notifications marked read.", "success");
    alertsBadge.style.display = "none";
    alertsList.innerHTML = `<div class="reminder-item" style="border-left-color: var(--color-success)">No active safety warnings. All items reviewed.</div>`;
  });

  function checkComplianceAlerts() {
    const drivers = window.TransitOpsDB.getDrivers();
    const today = new Date();
    const alertItems = [];

    drivers.forEach(d => {
      const expiryDate = new Date(d.license_expiry);
      const timeDiff = expiryDate - today;
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

      if (d.status === "Suspended") {
        alertItems.push({
          type: "danger",
          title: `Driver Suspended: ${d.name}`,
          desc: `Driver profile status is set to Suspended. Cannot operate vehicles.`,
          id: d.id
        });
      } else if (daysDiff < 0) {
        alertItems.push({
          type: "danger",
          title: `EXPIRED License: ${d.name}`,
          desc: `License CDL expired on ${d.license_expiry}. Status: ${d.status}.`,
          id: d.id
        });
      } else if (daysDiff <= 30) {
        alertItems.push({
          type: "warning",
          title: `License Expiring Soon: ${d.name}`,
          desc: `License CDL category expires in ${daysDiff} days (${d.license_expiry}).`,
          id: d.id
        });
      }
    });

    // Update banner in Driver Registry
    const expiredBanner = document.getElementById("drivers-expired-banner");
    if (alertItems.some(item => item.type === "danger" || item.type === "warning")) {
      expiredBanner.style.display = "flex";
    } else {
      expiredBanner.style.display = "none";
    }

    // Populate dropdown
    if (alertItems.length > 0) {
      alertsBadge.style.display = "flex";
      alertsBadge.textContent = alertItems.length;
      
      alertsList.innerHTML = alertItems.map(item => `
        <div class="reminder-item ${item.type === "danger" ? "expired" : ""}">
          <div class="reminder-desc">${item.title}</div>
          <div style="color:var(--text-muted); font-size: 0.7rem; margin-bottom: 4px;">${item.desc}</div>
          <a href="#" class="send-reminder-email" data-driver-id="${item.id}" style="color: var(--color-primary); text-decoration: none; font-weight:600; display: inline-flex; align-items:center; gap:4px;">
            <i data-lucide="mail" style="width:10px;height:10px;display:inline-block;"></i> Send Email Reminder
          </a>
        </div>
      `).join("");

      // Add click listeners to simulated email triggers
      alertsList.querySelectorAll(".send-reminder-email").forEach(link => {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const driverId = link.getAttribute("data-driver-id");
          const driver = drivers.find(d => d.id === driverId);
          if (driver) {
            showToast(`Simulated email alert successfully dispatched to ${driver.name} (${driver.contact}).`, "success");
          }
        });
      });
    } else {
      alertsBadge.style.display = "none";
      alertsList.innerHTML = `<div class="reminder-item" style="border-left-color: var(--color-success)">No active compliance issues. All systems operating.</div>`;
    }
  }

  // ==================== DASHBOARD RENDERS ====================

  function updateDashboardKPIs() {
    const kpis = window.TransitOpsDB.getFleetKPIs();
    
    document.getElementById("kpi-active-vehicles").textContent = kpis.activeVehicles;
    document.getElementById("kpi-available-vehicles").textContent = kpis.availableVehicles;
    document.getElementById("kpi-in-maintenance").textContent = kpis.inShopVehicles;
    document.getElementById("kpi-active-trips").textContent = kpis.activeTrips;
    document.getElementById("kpi-pending-trips").textContent = kpis.pendingTrips;
    document.getElementById("kpi-drivers-on-duty").textContent = kpis.driversOnDuty;
    document.getElementById("kpi-utilization").textContent = `${kpis.fleetUtilization}%`;
  }

  function renderDashboardCharts() {
    const vehicles = window.TransitOpsDB.getVehicles();
    const typeFilter = document.getElementById("dash-filter-type").value;
    const regionFilter = document.getElementById("dash-filter-region").value;

    // Filter vehicles for chart context
    let filteredVehicles = vehicles;
    if (typeFilter !== "All") {
      filteredVehicles = filteredVehicles.filter(v => v.type === typeFilter);
    }
    // Simple filter by region (based on trips matching Chicago, Detroit, Milwaukee depots)
    // We can mock region matching or filter simply.
    // If Chicago region selected, keep vehicles that have Chicago depot trips.
    if (regionFilter !== "All") {
      const trips = window.TransitOpsDB.getTrips();
      const matchingVehicleIds = new Set(
        trips.filter(t => t.source.toLowerCase().includes(regionFilter.toLowerCase()))
             .map(t => t.vehicle_id)
      );
      filteredVehicles = filteredVehicles.filter(v => matchingVehicleIds.has(v.id));
    }

    // Chart Data calculations
    const vehicleNames = filteredVehicles.map(v => v.id);
    const costs = filteredVehicles.map(v => window.TransitOpsDB.getVehicleTotalCost(v.id));
    const revenues = filteredVehicles.map(v => {
      const trips = window.TransitOpsDB.getTrips().filter(t => t.vehicle_id === v.id && t.status === "Completed");
      return trips.reduce((sum, t) => sum + (t.revenue || 0), 0);
    });

    const statusCounts = { Available: 0, "On Trip": 0, "In Shop": 0, Retired: 0 };
    filteredVehicles.forEach(v => {
      if (statusCounts[v.status] !== undefined) statusCounts[v.status]++;
    });

    const isDark = currentTheme === "dark";
    const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";
    const textColor = isDark ? "#94a3b8" : "#64748b";

    // Chart 1: Costs vs Revenue Bar Chart
    if (costRevenueChart) costRevenueChart.destroy();
    const ctx1 = document.getElementById("cost-revenue-chart").getContext("2d");
    costRevenueChart = new Chart(ctx1, {
      type: "bar",
      data: {
        labels: vehicleNames,
        datasets: [
          {
            label: "Total Expenses ($)",
            data: costs,
            backgroundColor: "rgba(239, 68, 68, 0.6)",
            borderColor: "#ef4444",
            borderWidth: 1
          },
          {
            label: "Total Revenue ($)",
            data: revenues,
            backgroundColor: "rgba(16, 185, 129, 0.6)",
            borderColor: "#10b981",
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: textColor, font: { family: "Outfit" } } }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: "Outfit" } }
          },
          y: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: "Outfit" } }
          }
        }
      }
    });

    // Chart 2: Fleet Status Mix Doughnut
    if (statusMixChart) statusMixChart.destroy();
    const ctx2 = document.getElementById("status-mix-chart").getContext("2d");
    statusMixChart = new Chart(ctx2, {
      type: "doughnut",
      data: {
        labels: Object.keys(statusCounts),
        datasets: [{
          data: Object.values(statusCounts),
          backgroundColor: [
            "rgba(16, 185, 129, 0.7)", // Available
            "rgba(245, 158, 11, 0.7)",  // On Trip
            "rgba(99, 102, 241, 0.7)",  // In Shop
            "rgba(239, 68, 68, 0.7)"    // Retired
          ],
          borderColor: isDark ? "#0f172a" : "#ffffff",
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: { color: textColor, font: { family: "Outfit" } }
          }
        }
      }
    });
  }

  // Dashboard Filters change re-renders charts
  document.getElementById("dash-filter-type").addEventListener("change", renderDashboardCharts);
  document.getElementById("dash-filter-region").addEventListener("change", renderDashboardCharts);

  // ==================== VEHICLE REGISTRY RENDERS & CRUD ====================

  const vehicleTableBody = document.getElementById("vehicles-table-body");
  const vehicleSearch = document.getElementById("vehicle-search");
  const vehicleFilterType = document.getElementById("vehicle-filter-type");
  const vehicleFilterStatus = document.getElementById("vehicle-filter-status");
  const vehicleForm = document.getElementById("vehicle-form");
  const vehicleModal = document.getElementById("vehicle-modal");
  const btnAddVehicle = document.getElementById("btn-add-vehicle");

  function renderVehiclesTable() {
    const vehicles = window.TransitOpsDB.getVehicles();
    const searchVal = vehicleSearch.value.toLowerCase();
    const typeVal = vehicleFilterType.value;
    const statusVal = vehicleFilterStatus.value;

    let filtered = vehicles.filter(v => {
      const matchSearch = v.id.toLowerCase().includes(searchVal) || v.name.toLowerCase().includes(searchVal);
      const matchType = typeVal === "All" || v.type === typeVal;
      const matchStatus = statusVal === "All" || v.status === statusVal;
      return matchSearch && matchType && matchStatus;
    });

    vehicleTableBody.innerHTML = filtered.map(v => {
      const opCost = window.TransitOpsDB.getVehicleTotalCost(v.id);
      const docsCount = v.documents ? v.documents.length : 0;
      return `
        <tr>
          <td style="font-family: var(--font-mono); font-weight: 600; color: var(--color-primary);">${v.id}</td>
          <td>${v.name}</td>
          <td>${v.type}</td>
          <td>${v.max_load} kg</td>
          <td>${v.odometer.toLocaleString()} km</td>
          <td>$${v.acquisition_cost.toLocaleString()}</td>
          <td style="font-family: var(--font-mono);">$${opCost.toLocaleString()}</td>
          <td>
            <span class="status-badge ${v.status.toLowerCase().replace(" ", "_")}">${v.status}</span>
          </td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-secondary btn-sm edit-vehicle-btn" data-id="${v.id}"><i data-lucide="edit-3" style="width:12px;"></i></button>
              <button class="btn btn-secondary btn-sm docs-vehicle-btn" data-id="${v.id}"><i data-lucide="files" style="width:12px;"></i> ${docsCount}</button>
              <button class="btn btn-danger btn-sm delete-vehicle-btn rbac-mgr" data-id="${v.id}"><i data-lucide="trash-2" style="width:12px;"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    if (filtered.length === 0) {
      vehicleTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--text-muted);">No vehicles match active search/filters.</td></tr>`;
    }

    lucide.createIcons();

    // Hook listeners
    vehicleTableBody.querySelectorAll(".edit-vehicle-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!checkRBACAction(["fleet_manager"], "modify vehicles")) return;
        const vId = btn.getAttribute("data-id");
        const vehicle = vehicles.find(v => v.id === vId);
        if (vehicle) {
          document.getElementById("vehicle-modal-title").textContent = "Edit Vehicle";
          document.getElementById("vehicle-edit-mode").value = "true";
          document.getElementById("veh-id").value = vehicle.id;
          document.getElementById("veh-id").disabled = true; // reg id cannot be updated
          document.getElementById("veh-name").value = vehicle.name;
          document.getElementById("veh-type").value = vehicle.type;
          document.getElementById("veh-load").value = vehicle.max_load;
          document.getElementById("veh-odo").value = vehicle.odometer;
          document.getElementById("veh-cost").value = vehicle.acquisition_cost;
          document.getElementById("veh-status").value = vehicle.status;
          openModal("vehicle-modal");
        }
      });
    });

    vehicleTableBody.querySelectorAll(".docs-vehicle-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const vId = btn.getAttribute("data-id");
        openDocumentManager("vehicle", vId);
      });
    });

    vehicleTableBody.querySelectorAll(".delete-vehicle-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!checkRBACAction(["fleet_manager"], "delete vehicles")) return;
        const vId = btn.getAttribute("data-id");
        if (confirm(`Are you sure you want to delete vehicle ${vId}?`)) {
          try {
            window.TransitOpsDB.deleteVehicle(vId);
            showToast(`Vehicle ${vId} deleted.`, "success");
            renderVehiclesTable();
          } catch (err) {
            showToast(err.message, "error");
          }
        }
      });
    });
  }

  vehicleSearch.addEventListener("input", renderVehiclesTable);
  vehicleFilterType.addEventListener("change", renderVehiclesTable);
  vehicleFilterStatus.addEventListener("change", renderVehiclesTable);

  btnAddVehicle.addEventListener("click", () => {
    if (!checkRBACAction(["fleet_manager"], "create vehicles")) return;
    document.getElementById("vehicle-modal-title").textContent = "Add Vehicle";
    document.getElementById("vehicle-edit-mode").value = "false";
    document.getElementById("vehicle-form").reset();
    document.getElementById("veh-id").disabled = false;
    openModal("vehicle-modal");
  });

  vehicleForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const isEdit = document.getElementById("vehicle-edit-mode").value === "true";
    
    const id = document.getElementById("veh-id").value;
    const name = document.getElementById("veh-name").value;
    const type = document.getElementById("veh-type").value;
    const max_load = document.getElementById("veh-load").value;
    const odometer = document.getElementById("veh-odo").value;
    const acquisition_cost = document.getElementById("veh-cost").value;
    const status = document.getElementById("veh-status").value;

    try {
      if (isEdit) {
        window.TransitOpsDB.updateVehicle(id, { name, type, max_load, odometer, acquisition_cost, status });
        showToast(`Vehicle ${id} updated successfully.`, "success");
      } else {
        window.TransitOpsDB.addVehicle({ id, name, type, max_load, odometer, acquisition_cost, status });
        showToast(`Vehicle ${id.toUpperCase()} registered successfully.`, "success");
      }
      closeModal("vehicle-modal");
      renderVehiclesTable();
    } catch (err) {
      showToast(err.message, "error");
    }
  });

  // ==================== DRIVERS REGISTRY RENDERS & CRUD ====================

  const driverTableBody = document.getElementById("drivers-table-body");
  const driverSearch = document.getElementById("driver-search");
  const driverFilterStatus = document.getElementById("driver-filter-status");
  const driverForm = document.getElementById("driver-form");
  const driverModal = document.getElementById("driver-modal");
  const btnAddDriver = document.getElementById("btn-add-driver");

  function renderDriversTable() {
    const drivers = window.TransitOpsDB.getDrivers();
    const searchVal = driverSearch.value.toLowerCase();
    const statusVal = driverFilterStatus.value;
    const today = new Date().toISOString().split('T')[0];

    let filtered = drivers.filter(d => {
      const matchSearch = d.name.toLowerCase().includes(searchVal) || d.id.toLowerCase().includes(searchVal);
      // Status mapping shortcut: On Duty means Available or On Trip
      let matchStatus = statusVal === "All";
      if (statusVal === "On Duty") {
        matchStatus = d.status === "Available" || d.status === "On Trip";
      } else if (statusVal !== "All") {
        matchStatus = d.status === statusVal;
      }
      return matchSearch && matchStatus;
    });

    driverTableBody.innerHTML = filtered.map(d => {
      const isExpired = d.license_expiry < today;
      const docsCount = d.documents ? d.documents.length : 0;
      
      let expiryHtml = `<span style="font-family:var(--font-mono);">${d.license_expiry}</span>`;
      if (isExpired) {
        expiryHtml = `<span style="font-family:var(--font-mono); color: var(--color-error); font-weight:700;">${d.license_expiry} (EXPIRED)</span>`;
      }
      
      return `
        <tr>
          <td style="font-family: var(--font-mono); font-weight: 600;">${d.id}</td>
          <td>
            <div style="font-weight: 600;">${d.name}</div>
          </td>
          <td>${d.license_category}</td>
          <td>${expiryHtml}</td>
          <td>${d.contact}</td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <div style="flex:1; background:rgba(255,255,255,0.05); height:6px; border-radius:3px; max-width:80px;">
                <div style="width: ${d.safety_score}%; background: ${d.safety_score >= 85 ? 'var(--color-success)' : d.safety_score >= 70 ? 'var(--color-warning)' : 'var(--color-error)'}; height:100%; border-radius:3px;"></div>
              </div>
              <span style="font-weight:600; font-size:0.8rem; font-family:var(--font-mono);">${d.safety_score}</span>
            </div>
          </td>
          <td>
            <span class="status-badge ${d.status.toLowerCase().replace(" ", "_")}">${d.status}</span>
          </td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-secondary btn-sm edit-driver-btn" data-id="${d.id}"><i data-lucide="edit-3" style="width:12px;"></i></button>
              <button class="btn btn-secondary btn-sm docs-driver-btn" data-id="${d.id}"><i data-lucide="files" style="width:12px;"></i> ${docsCount}</button>
              <button class="btn btn-danger btn-sm delete-driver-btn rbac-mgr rbac-safety" data-id="${d.id}"><i data-lucide="trash-2" style="width:12px;"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    if (filtered.length === 0) {
      driverTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">No drivers match search/filters.</td></tr>`;
    }

    lucide.createIcons();

    // Hook listeners
    driverTableBody.querySelectorAll(".edit-driver-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!checkRBACAction(["fleet_manager", "safety_officer"], "modify drivers")) return;
        const dId = btn.getAttribute("data-id");
        const driver = drivers.find(d => d.id === dId);
        if (driver) {
          document.getElementById("driver-modal-title").textContent = "Edit Driver";
          document.getElementById("driver-edit-mode").value = "true";
          document.getElementById("drv-id").value = driver.id;
          document.getElementById("drv-id").disabled = true; // License number cannot be changed
          document.getElementById("drv-name").value = driver.name;
          document.getElementById("drv-category").value = driver.license_category;
          document.getElementById("drv-expiry").value = driver.license_expiry;
          document.getElementById("drv-contact").value = driver.contact;
          document.getElementById("drv-safety").value = driver.safety_score;
          document.getElementById("drv-status").value = driver.status;
          openModal("driver-modal");
        }
      });
    });

    driverTableBody.querySelectorAll(".docs-driver-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const dId = btn.getAttribute("data-id");
        openDocumentManager("driver", dId);
      });
    });

    driverTableBody.querySelectorAll(".delete-driver-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!checkRBACAction(["fleet_manager", "safety_officer"], "delete drivers")) return;
        const dId = btn.getAttribute("data-id");
        if (confirm(`Are you sure you want to delete driver ${dId}?`)) {
          try {
            window.TransitOpsDB.deleteDriver(dId);
            showToast(`Driver ${dId} profile deleted.`, "success");
            renderDriversTable();
            checkComplianceAlerts();
          } catch (err) {
            showToast(err.message, "error");
          }
        }
      });
    });
  }

  driverSearch.addEventListener("input", renderDriversTable);
  driverFilterStatus.addEventListener("change", renderDriversTable);

  btnAddDriver.addEventListener("click", () => {
    if (!checkRBACAction(["fleet_manager", "safety_officer"], "register drivers")) return;
    document.getElementById("driver-modal-title").textContent = "Add Driver";
    document.getElementById("driver-edit-mode").value = "false";
    document.getElementById("driver-form").reset();
    document.getElementById("drv-id").disabled = false;
    openModal("driver-modal");
  });

  driverForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const isEdit = document.getElementById("driver-edit-mode").value === "true";
    
    const id = document.getElementById("drv-id").value;
    const name = document.getElementById("drv-name").value;
    const license_category = document.getElementById("drv-category").value;
    const license_expiry = document.getElementById("drv-expiry").value;
    const contact = document.getElementById("drv-contact").value;
    const safety_score = document.getElementById("drv-safety").value || 100;
    const status = document.getElementById("drv-status").value;

    try {
      if (isEdit) {
        window.TransitOpsDB.updateDriver(id, { name, license_category, license_expiry, contact, safety_score, status });
        showToast(`Driver ${name} updated successfully.`, "success");
      } else {
        window.TransitOpsDB.addDriver({ id, name, license_category, license_expiry, contact, safety_score, status });
        showToast(`Driver ${name} registered successfully.`, "success");
      }
      closeModal("driver-modal");
      renderDriversTable();
      checkComplianceAlerts();
    } catch (err) {
      showToast(err.message, "error");
    }
  });

  // ==================== TRIP MANAGEMENT RENDERS ====================

  const tripTableBody = document.getElementById("trips-table-body");
  const tripSearch = document.getElementById("trip-search");
  const tripFilterStatus = document.getElementById("trip-filter-status");
  const tripForm = document.getElementById("trip-form");
  const tripModal = document.getElementById("trip-modal");
  const btnAddTrip = document.getElementById("btn-add-trip");

  const completeTripModal = document.getElementById("complete-trip-modal");
  const completeTripForm = document.getElementById("complete-trip-form");

  function renderTripsTable() {
    const trips = window.TransitOpsDB.getTrips();
    const searchVal = tripSearch.value.toLowerCase();
    const statusVal = tripFilterStatus.value;
    const vehicles = window.TransitOpsDB.getVehicles();
    const drivers = window.TransitOpsDB.getDrivers();

    let filtered = trips.filter(t => {
      const matchSearch = t.source.toLowerCase().includes(searchVal) || t.destination.toLowerCase().includes(searchVal);
      const matchStatus = statusVal === "All" || t.status === statusVal;
      return matchSearch && matchStatus;
    });

    tripTableBody.innerHTML = filtered.map(t => {
      const vehicle = vehicles.find(v => v.id === t.vehicle_id);
      const driver = drivers.find(d => d.id === t.driver_id);

      const vehicleName = vehicle ? `${vehicle.id} (${vehicle.name})` : t.vehicle_id;
      const driverName = driver ? driver.name : t.driver_id;
      const datesStr = t.start_date ? `${t.start_date} ${t.end_date ? '→ ' + t.end_date : '(Active)'}` : 'Not Started';
      
      // Control buttons based on trip status
      let actionsHtml = "";
      if (t.status === "Draft") {
        actionsHtml = `
          <button class="btn btn-primary btn-sm dispatch-trip-btn rbac-drv rbac-mgr" data-id="${t.id}"><i data-lucide="navigation"></i> Dispatch</button>
          <button class="btn btn-danger btn-sm cancel-trip-btn rbac-drv rbac-mgr" data-id="${t.id}"><i data-lucide="x-circle"></i> Cancel</button>
        `;
      } else if (t.status === "Dispatched") {
        actionsHtml = `
          <button class="btn btn-success btn-sm complete-trip-btn rbac-drv rbac-mgr" data-id="${t.id}"><i data-lucide="check"></i> Complete</button>
          <button class="btn btn-danger btn-sm cancel-trip-btn rbac-drv rbac-mgr" data-id="${t.id}"><i data-lucide="x-circle"></i> Cancel</button>
        `;
      } else {
        actionsHtml = `<span style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">No Actions Available</span>`;
      }

      return `
        <tr>
          <td style="font-family: var(--font-mono); font-weight: 600; font-size: 0.8rem;">${t.id}</td>
          <td>
            <div style="font-weight:600;">${t.source}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">to ${t.destination}</div>
          </td>
          <td style="font-family: var(--font-mono); font-size: 0.8rem;">${vehicleName}</td>
          <td>${driverName}</td>
          <td>${t.cargo_weight} kg</td>
          <td>${t.planned_distance} km</td>
          <td>$${t.revenue.toLocaleString()}</td>
          <td>
            <span class="status-badge ${t.status.toLowerCase()}">${t.status}</span>
          </td>
          <td style="font-size:0.75rem; color:var(--text-muted);">${datesStr}</td>
          <td>
            <div style="display:flex; gap:6px;">
              ${actionsHtml}
            </div>
          </td>
        </tr>
      `;
    }).join("");

    if (filtered.length === 0) {
      tripTableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:var(--text-muted);">No trips logged.</td></tr>`;
    }

    lucide.createIcons();

    // Hook listeners
    tripTableBody.querySelectorAll(".dispatch-trip-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!checkRBACAction(["fleet_manager", "driver"], "dispatch trips")) return;
        const tripId = btn.getAttribute("data-id");
        try {
          window.TransitOpsDB.dispatchTrip(tripId);
          showToast(`Trip ${tripId} has been successfully dispatched! Vehicle and Driver statuses updated to On Trip.`, "success");
          renderTripsTable();
        } catch (err) {
          showToast(err.message, "error");
        }
      });
    });

    tripTableBody.querySelectorAll(".cancel-trip-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!checkRBACAction(["fleet_manager", "driver"], "cancel trips")) return;
        const tripId = btn.getAttribute("data-id");
        if (confirm(`Are you sure you want to cancel Trip ${tripId}?`)) {
          try {
            window.TransitOpsDB.cancelTrip(tripId);
            showToast(`Trip ${tripId} cancelled. Vehicle & Driver status restored.`, "warning");
            renderTripsTable();
          } catch (err) {
            showToast(err.message, "error");
          }
        }
      });
    });

    tripTableBody.querySelectorAll(".complete-trip-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!checkRBACAction(["fleet_manager", "driver"], "complete trips")) return;
        const tripId = btn.getAttribute("data-id");
        const trip = trips.find(t => t.id === tripId);
        const vehicle = vehicles.find(v => v.id === trip.vehicle_id);

        if (trip && vehicle) {
          document.getElementById("complete-trip-id").value = tripId;
          document.getElementById("complete-odo").value = vehicle.odometer + trip.planned_distance; // Suggestion
          document.getElementById("complete-odo").min = vehicle.odometer + 1;
          document.getElementById("complete-odo").placeholder = `Current: ${vehicle.odometer} km`;
          document.getElementById("complete-fuel").value = Math.round(trip.planned_distance * 0.18); // Estimation
          openModal("complete-trip-modal");
        }
      });
    });
  }

  tripSearch.addEventListener("input", renderTripsTable);
  tripFilterStatus.addEventListener("change", renderTripsTable);

  // Populate Add Trip Dropdowns on modal open
  btnAddTrip.addEventListener("click", () => {
    if (!checkRBACAction(["fleet_manager", "driver"], "create trips")) return;
    
    const vehicles = window.TransitOpsDB.getVehicles();
    const drivers = window.TransitOpsDB.getDrivers();
    const today = new Date().toISOString().split('T')[0];

    // Filter available vehicles (Not retired, not In Shop, not On Trip)
    const availVehicles = vehicles.filter(v => v.status === "Available");
    // Filter compliant drivers (Not suspended, not expired, not On Trip)
    const availDrivers = drivers.filter(d => d.status === "Available" && d.license_expiry >= today);

    const vehicleSelect = document.getElementById("trip-vehicle");
    const driverSelect = document.getElementById("trip-driver");

    vehicleSelect.innerHTML = availVehicles.map(v => `<option value="${v.id}">${v.id} - ${v.name} (Max Cap: ${v.max_load}kg)</option>`).join("");
    if (availVehicles.length === 0) vehicleSelect.innerHTML = `<option value="">No vehicles available</option>`;

    driverSelect.innerHTML = availDrivers.map(d => `<option value="${d.id}">${d.name} (${d.license_category}, Safety: ${d.safety_score})</option>`).join("");
    if (availDrivers.length === 0) driverSelect.innerHTML = `<option value="">No compliant drivers available</option>`;

    document.getElementById("trip-form").reset();
    openModal("trip-modal");
  });

  tripForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const source = document.getElementById("trip-source").value;
    const destination = document.getElementById("trip-dest").value;
    const vehicle_id = document.getElementById("trip-vehicle").value;
    const driver_id = document.getElementById("trip-driver").value;
    const cargo_weight = document.getElementById("trip-weight").value;
    const planned_distance = document.getElementById("trip-dist").value;
    const revenue = document.getElementById("trip-rev").value;

    if (!vehicle_id || !driver_id) {
      showToast("Cannot create trip. Available vehicle and driver must be selected.", "error");
      return;
    }

    try {
      window.TransitOpsDB.addTrip({ source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, revenue });
      showToast("Trip draft created successfully.", "success");
      closeModal("trip-modal");
      renderTripsTable();
    } catch (err) {
      showToast(err.message, "error");
    }
  });

  completeTripForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("complete-trip-id").value;
    const odo = document.getElementById("complete-odo").value;
    const fuel = document.getElementById("complete-fuel").value;

    try {
      window.TransitOpsDB.completeTrip(id, odo, fuel);
      showToast(`Trip ${id} completed. Vehicle & driver status set to Available. Fuel expense auto-logged.`, "success");
      closeModal("complete-trip-modal");
      renderTripsTable();
    } catch (err) {
      showToast(err.message, "error");
    }
  });

  // ==================== MAINTENANCE LOGS RENDERS ====================

  const maintenanceTableBody = document.getElementById("maintenance-table-body");
  const maintenanceSearch = document.getElementById("maintenance-search");
  const maintenanceForm = document.getElementById("maintenance-form");
  const maintenanceModal = document.getElementById("maintenance-modal");
  const btnAddMaintenance = document.getElementById("btn-add-maintenance");

  function renderMaintenanceTable() {
    const logs = window.TransitOpsDB.getMaintenanceLogs();
    const searchVal = maintenanceSearch.value.toLowerCase();
    
    let filtered = logs.filter(l => {
      return l.vehicle_id.toLowerCase().includes(searchVal) || l.description.toLowerCase().includes(searchVal);
    });

    maintenanceTableBody.innerHTML = filtered.map(l => {
      let actionHtml = "";
      if (l.status === "Open") {
        actionHtml = `<button class="btn btn-success btn-sm close-maintenance-btn rbac-mgr" data-id="${l.id}"><i data-lucide="check"></i> Close Service</button>`;
      } else {
        actionHtml = `<span style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">Closed & Logged</span>`;
      }

      return `
        <tr>
          <td style="font-family: var(--font-mono); font-weight:600; font-size:0.8rem;">${l.id}</td>
          <td style="font-family: var(--font-mono); font-weight:600; color:var(--color-primary);">${l.vehicle_id}</td>
          <td>${l.description}</td>
          <td style="font-family: var(--font-mono); font-weight:600;">$${l.cost.toLocaleString()}</td>
          <td>${l.date}</td>
          <td>
            <span class="status-badge ${l.status.toLowerCase()}">${l.status}</span>
          </td>
          <td>
            ${actionHtml}
          </td>
        </tr>
      `;
    }).join("");

    if (filtered.length === 0) {
      maintenanceTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No maintenance logs found.</td></tr>`;
    }

    lucide.createIcons();

    // Hook listeners
    maintenanceTableBody.querySelectorAll(".close-maintenance-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!checkRBACAction(["fleet_manager"], "manage maintenance")) return;
        const mId = btn.getAttribute("data-id");
        try {
          window.TransitOpsDB.closeMaintenanceLog(mId);
          showToast(`Maintenance log ${mId} closed. Vehicle status restored to Available.`, "success");
          renderMaintenanceTable();
        } catch (err) {
          showToast(err.message, "error");
        }
      });
    });
  }

  maintenanceSearch.addEventListener("input", renderMaintenanceTable);

  btnAddMaintenance.addEventListener("click", () => {
    if (!checkRBACAction(["fleet_manager"], "log maintenance")) return;
    
    // Populate vehicles dropdown (exclude Retired and On Trip)
    const vehicles = window.TransitOpsDB.getVehicles();
    const fitVehicles = vehicles.filter(v => v.status !== "Retired" && v.status !== "On Trip");
    const mntVehicleSelect = document.getElementById("mnt-vehicle");

    mntVehicleSelect.innerHTML = fitVehicles.map(v => `<option value="${v.id}">${v.id} - ${v.name} (Odo: ${v.odometer}km)</option>`).join("");
    if (fitVehicles.length === 0) mntVehicleSelect.innerHTML = `<option value="">No valid vehicles found</option>`;

    document.getElementById("maintenance-form").reset();
    document.getElementById("mnt-date").value = new Date().toISOString().split('T')[0];
    openModal("maintenance-modal");
  });

  maintenanceForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const vehicle_id = document.getElementById("mnt-vehicle").value;
    const description = document.getElementById("mnt-desc").value;
    const cost = document.getElementById("mnt-cost").value;
    const date = document.getElementById("mnt-date").value;

    if (!vehicle_id) {
      showToast("Cannot log maintenance: no valid vehicle selected.", "error");
      return;
    }

    try {
      window.TransitOpsDB.addMaintenanceLog({ vehicle_id, description, cost, date });
      showToast(`Maintenance logged successfully. Vehicle ${vehicle_id} set to In Shop.`, "success");
      closeModal("maintenance-modal");
      renderMaintenanceTable();
    } catch (err) {
      showToast(err.message, "error");
    }
  });

  // ==================== EXPENSE RENDERS ====================

  const expensesTableBody = document.getElementById("expenses-table-body");
  const expenseSearch = document.getElementById("expense-search");
  const expenseFilterType = document.getElementById("expense-filter-type");
  const expenseForm = document.getElementById("expense-form");
  const expenseModal = document.getElementById("expense-modal");
  const btnAddExpense = document.getElementById("btn-add-expense");
  const expTypeSelect = document.getElementById("exp-type");
  const expLitersGroup = document.getElementById("exp-liters-group");

  // Show liters field only if fuel
  expTypeSelect.addEventListener("change", () => {
    if (expTypeSelect.value === "Fuel") {
      expLitersGroup.style.display = "flex";
    } else {
      expLitersGroup.style.display = "none";
    }
  });

  function renderExpensesTable() {
    const expenses = window.TransitOpsDB.getFuelExpenses();
    const searchVal = expenseSearch.value.toLowerCase();
    const typeVal = expenseFilterType.value;

    let filtered = expenses.filter(e => {
      const matchSearch = e.vehicle_id.toLowerCase().includes(searchVal) || e.notes.toLowerCase().includes(searchVal);
      const matchType = typeVal === "All" || e.type === typeVal;
      return matchSearch && matchType;
    });

    expensesTableBody.innerHTML = filtered.map(e => {
      return `
        <tr>
          <td style="font-family: var(--font-mono); font-size: 0.8rem;">${e.id}</td>
          <td style="font-family: var(--font-mono); font-weight:600; color:var(--color-primary);">${e.vehicle_id}</td>
          <td style="font-family: var(--font-mono); font-size: 0.8rem;">${e.trip_id || '<span style="color:var(--text-muted)">N/A</span>'}</td>
          <td><span class="status-badge ${e.type.toLowerCase()}">${e.type}</span></td>
          <td style="font-family: var(--font-mono); font-weight:600;">$${e.amount.toLocaleString()}</td>
          <td>${e.liters > 0 ? e.liters + ' L' : '<span style="color:var(--text-muted)">-</span>'}</td>
          <td>${e.date}</td>
          <td style="font-size:0.85rem; color:var(--text-muted);">${e.notes}</td>
          <td>
            <button class="btn btn-danger btn-sm delete-expense-btn rbac-fin rbac-mgr" data-id="${e.id}"><i data-lucide="trash-2" style="width:12px;"></i></button>
          </td>
        </tr>
      `;
    }).join("");

    if (filtered.length === 0) {
      expensesTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--text-muted);">No expenses recorded.</td></tr>`;
    }

    lucide.createIcons();

    // Hook listeners
    expensesTableBody.querySelectorAll(".delete-expense-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!checkRBACAction(["fleet_manager", "financial_analyst"], "delete expenses")) return;
        const eId = btn.getAttribute("data-id");
        if (confirm(`Delete expense record ${eId}?`)) {
          window.TransitOpsDB.deleteFuelExpense(eId);
          showToast(`Expense ${eId} removed.`, "success");
          renderExpensesTable();
        }
      });
    });
  }

  expenseSearch.addEventListener("input", renderExpensesTable);
  expenseFilterType.addEventListener("change", renderExpensesTable);

  btnAddExpense.addEventListener("click", () => {
    if (!checkRBACAction(["fleet_manager", "financial_analyst"], "record expenses")) return;

    const vehicles = window.TransitOpsDB.getVehicles();
    const trips = window.TransitOpsDB.getTrips();

    const expVeh = document.getElementById("exp-vehicle");
    const expTrip = document.getElementById("exp-trip");

    expVeh.innerHTML = vehicles.map(v => `<option value="${v.id}">${v.id} - ${v.name}</option>`).join("");
    expTrip.innerHTML = '<option value="">Not linked to trip</option>' + 
      trips.filter(t => t.status === "Dispatched" || t.status === "Completed")
           .map(t => `<option value="${t.id}">${t.id} - ${t.source} to ${t.destination}</option>`).join("");

    document.getElementById("expense-form").reset();
    document.getElementById("exp-date").value = new Date().toISOString().split('T')[0];
    expLitersGroup.style.display = "flex"; // Default is fuel category
    openModal("expense-modal");
  });

  expenseForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const vehicle_id = document.getElementById("exp-vehicle").value;
    const type = document.getElementById("exp-type").value;
    const liters = document.getElementById("exp-liters").value;
    const amount = document.getElementById("exp-amount").value;
    const trip_id = document.getElementById("exp-trip").value;
    const date = document.getElementById("exp-date").value;
    const notes = document.getElementById("exp-notes").value;

    try {
      window.TransitOpsDB.addFuelExpense({ vehicle_id, type, liters, amount, trip_id, date, notes });
      showToast("Expense logged successfully.", "success");
      closeModal("expense-modal");
      renderExpensesTable();
    } catch (err) {
      showToast(err.message, "error");
    }
  });

  // ==================== REPORTS VIEW GENERATION ====================

  const reportsTableBody = document.getElementById("reports-table-body");
  const repFleetRoi = document.getElementById("rep-fleet-roi");
  const repFuelEfficiency = document.getElementById("rep-fuel-efficiency");
  const repTotalCost = document.getElementById("rep-total-cost");
  const repTotalRevenue = document.getElementById("rep-total-revenue");
  
  const btnExportCSV = document.getElementById("btn-export-csv");
  const btnExportPDF = document.getElementById("btn-export-pdf");

  function renderReportsView() {
    const vehicles = window.TransitOpsDB.getVehicles();
    const trips = window.TransitOpsDB.getTrips();
    const expenses = window.TransitOpsDB.getFuelExpenses();

    // Summary calculations
    let totalRevenue = trips.filter(t => t.status === "Completed").reduce((sum, t) => sum + (t.revenue || 0), 0);
    let totalCost = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Fleet averages
    let activeVehCount = vehicles.filter(v => v.status !== "Retired").length;
    let totalRoiSum = 0;
    let validRoiCount = 0;
    let totalDistanceSum = 0;
    let totalFuelSum = 0;

    vehicles.forEach(v => {
      const roi = parseFloat(window.TransitOpsDB.getVehicleROI(v.id));
      if (v.status !== "Retired") {
        totalRoiSum += roi;
        validRoiCount++;
      }

      // Fuel logic
      const completedTrips = trips.filter(t => t.vehicle_id === v.id && t.status === "Completed");
      completedTrips.forEach(t => {
        totalDistanceSum += t.planned_distance;
        totalFuelSum += t.fuel_consumed_liters;
      });
    });

    const avgRoi = validRoiCount > 0 ? (totalRoiSum / validRoiCount).toFixed(1) : 0;
    const avgFuelEfficiency = totalFuelSum > 0 ? (totalDistanceSum / totalFuelSum).toFixed(2) : 0;

    repFleetRoi.textContent = `${avgRoi}%`;
    repFuelEfficiency.textContent = `${avgFuelEfficiency} km/L`;
    repTotalCost.textContent = `$${totalCost.toLocaleString()}`;
    repTotalRevenue.textContent = `$${totalRevenue.toLocaleString()}`;
    document.getElementById("report-generation-time").textContent = new Date().toLocaleString();

    // Render Table
    reportsTableBody.innerHTML = vehicles.map(v => {
      const completedTrips = trips.filter(t => t.vehicle_id === v.id && t.status === "Completed");
      const distance = completedTrips.reduce((sum, t) => sum + t.planned_distance, 0);
      const vehicleExpenses = window.TransitOpsDB.getVehicleTotalCost(v.id);
      const revenue = completedTrips.reduce((sum, t) => sum + (t.revenue || 0), 0);
      const fuelEff = window.TransitOpsDB.getVehicleFuelEfficiency(v.id);
      const roi = window.TransitOpsDB.getVehicleROI(v.id);

      return `
        <tr>
          <td style="font-family: var(--font-mono); font-weight: 600; color:var(--color-primary);">${v.id}</td>
          <td>${v.name}</td>
          <td>${distance.toLocaleString()} km</td>
          <td style="font-family: var(--font-mono);">$${vehicleExpenses.toLocaleString()}</td>
          <td style="font-family: var(--font-mono);">$${revenue.toLocaleString()}</td>
          <td>${fuelEff > 0 ? fuelEff + ' km/L' : '<span style="color:var(--text-muted)">N/A</span>'}</td>
          <td style="font-family: var(--font-mono); font-weight:700; color: ${roi >= 0 ? 'var(--color-success)' : 'var(--color-error)'};">${roi}%</td>
          <td>
            <span class="status-badge ${v.status.toLowerCase().replace(" ", "_")}">${v.status}</span>
          </td>
        </tr>
      `;
    }).join("");

    lucide.createIcons();
  }

  // Export CSV Action
  btnExportCSV.addEventListener("click", () => {
    const vehicles = window.TransitOpsDB.getVehicles();
    const trips = window.TransitOpsDB.getTrips();

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Registration No,Model,Total Distance (km),Total Expenses ($),Total Revenue ($),Fuel Efficiency (km/L),ROI (%),Status\n";

    vehicles.forEach(v => {
      const completedTrips = trips.filter(t => t.vehicle_id === v.id && t.status === "Completed");
      const distance = completedTrips.reduce((sum, t) => sum + t.planned_distance, 0);
      const vehicleExpenses = window.TransitOpsDB.getVehicleTotalCost(v.id);
      const revenue = completedTrips.reduce((sum, t) => sum + (t.revenue || 0), 0);
      const fuelEff = window.TransitOpsDB.getVehicleFuelEfficiency(v.id);
      const roi = window.TransitOpsDB.getVehicleROI(v.id);

      csvContent += `${v.id},${v.name},${distance},${vehicleExpenses},${revenue},${fuelEff},${roi},${v.status}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `transitops_roi_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV report generated and downloaded.", "success");
  });

  // Export PDF Report using html2pdf
  btnExportPDF.addEventListener("click", () => {
    const element = document.getElementById("pdf-report-area");
    
    // Customize PDF properties
    const opt = {
      margin:       0.5,
      filename:     `transitops_analytics_${new Date().toISOString().split('T')[0]}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, backgroundColor: currentTheme === "dark" ? "#0f172a" : "#ffffff" },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(element).save()
      .then(() => showToast("PDF performance report generated and downloaded.", "success"))
      .catch(err => showToast("Failed to compile PDF: " + err, "error"));
  });

  // ==================== DOCUMENT MANAGER SYSTEM ====================

  const docModal = document.getElementById("document-modal");
  const docModalTitle = document.getElementById("document-modal-title");
  const docUploadForm = document.getElementById("doc-upload-form");
  const docEntitySelectType = document.getElementById("doc-entity-type");
  const docEntitySelectId = document.getElementById("doc-entity-id");
  const simulatedDocsContainer = document.getElementById("simulated-docs-container");

  function openDocumentManager(entityType, entityId) {
    docEntitySelectType.value = entityType;
    docEntitySelectId.value = entityId;
    docModalTitle.textContent = `Documents: ${entityId} (${entityType.toUpperCase()})`;

    renderDocumentsList(entityType, entityId);
    openModal("document-modal");
  }

  function renderDocumentsList(type, id) {
    let docs = [];
    if (type === "vehicle") {
      const v = window.TransitOpsDB.getVehicles().find(v => v.id === id);
      docs = v ? v.documents : [];
    } else {
      const d = window.TransitOpsDB.getDrivers().find(d => d.id === id);
      docs = d ? d.documents : [];
    }

    if (!docs || docs.length === 0) {
      simulatedDocsContainer.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:20px; border:1px dashed var(--border-color); border-radius:10px;">No simulated documents attached.</div>`;
      return;
    }

    simulatedDocsContainer.innerHTML = `
      <div class="document-list">
        ${docs.map((doc, idx) => `
          <div class="document-item">
            <a href="#" class="view-mock-file" data-file="${doc}"><i data-lucide="file-text"></i> ${doc}</a>
            <button class="document-delete delete-mock-doc" data-idx="${idx}">&times;</button>
          </div>
        `).join("")}
      </div>
    `;

    lucide.createIcons();

    // Hook simulated file viewer
    simulatedDocsContainer.querySelectorAll(".view-mock-file").forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const fName = link.getAttribute("data-file");
        showToast(`Simulated opening of file resource '${fName}' in a secure document container.`, "success");
      });
    });

    // Hook deletes
    simulatedDocsContainer.querySelectorAll(".delete-mock-doc").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!checkRBACAction(["fleet_manager", "safety_officer"], "manage compliance documents")) return;
        const idx = parseInt(btn.getAttribute("data-idx"));
        try {
          if (type === "vehicle") {
            const v = window.TransitOpsDB.getVehicles().find(veh => veh.id === id);
            v.documents.splice(idx, 1);
            window.TransitOpsDB.updateVehicle(id, { documents: v.documents });
          } else {
            const d = window.TransitOpsDB.getDrivers().find(drv => drv.id === id);
            d.documents.splice(idx, 1);
            window.TransitOpsDB.updateDriver(id, { documents: d.documents });
          }
          showToast("Document deleted.", "success");
          renderDocumentsList(type, id);
          if (type === "vehicle") renderVehiclesTable();
          else renderDriversTable();
        } catch (err) {
          showToast(err.message, "error");
        }
      });
    });
  }

  docUploadForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!checkRBACAction(["fleet_manager", "safety_officer"], "upload compliance documents")) return;
    
    const type = docEntitySelectType.value;
    const id = docEntitySelectId.value;
    const docName = document.getElementById("doc-name").value.trim();

    try {
      if (type === "vehicle") {
        const v = window.TransitOpsDB.getVehicles().find(veh => veh.id === id);
        const docs = v.documents || [];
        docs.push(docName);
        window.TransitOpsDB.updateVehicle(id, { documents: docs });
        renderVehiclesTable();
      } else {
        const d = window.TransitOpsDB.getDrivers().find(drv => drv.id === id);
        const docs = d.documents || [];
        docs.push(docName);
        window.TransitOpsDB.updateDriver(id, { documents: docs });
        renderDriversTable();
      }
      showToast(`Successfully uploaded ${docName} to ${id}.`, "success");
      document.getElementById("doc-name").value = "";
      renderDocumentsList(type, id);
    } catch (err) {
      showToast(err.message, "error");
    }
  });

  // ==================== WORKFLOW WALKTHROUGH CONSOLE ====================

  const btnRunWorkflow = document.getElementById("btn-run-workflow");
  const btnResetWorkflow = document.getElementById("btn-reset-workflow");
  const walkthroughLog = document.getElementById("walkthrough-log");

  btnResetWorkflow.addEventListener("click", () => {
    window.TransitOpsDB.reset();
    walkthroughStep = 0;
    // Reset steps UI styling
    document.querySelectorAll(".step-card").forEach(c => {
      c.className = "step-card";
    });
    walkthroughLog.textContent = "Database restored to seeds. Workflow ready.";
    showToast("Database and logs reset to original seed state.", "success");
    
    if (activeTab === "dashboard") {
      updateDashboardKPIs();
      renderDashboardCharts();
    }
  });

  btnRunWorkflow.addEventListener("click", async () => {
    if (walkthroughStep >= 6) {
      walkthroughLog.textContent = "Workflow completed! Click Reset State to test again.";
      return;
    }

    btnRunWorkflow.disabled = true;
    btnResetWorkflow.disabled = true;

    try {
      // Step 1: Register vehicle 'Van-05' (500kg, Available)
      if (walkthroughStep === 0) {
        updateStepUI("step-1", "active");
        walkthroughLog.textContent = "Step 1: Registering vehicle 'Van-05'...";
        await sleep(1000);
        
        window.TransitOpsDB.addVehicle({
          id: "Van-05",
          name: "Chevrolet Express Cargo",
          type: "Van",
          max_load: 500,
          odometer: 12000,
          acquisition_cost: 28000,
          status: "Available"
        });
        
        updateStepUI("step-1", "completed");
        walkthroughLog.textContent = "SUCCESS: 'Van-05' registered (500kg limit, status: Available).";
        showToast("Step 1 Complete: Van-05 registered.", "success");
        walkthroughStep = 1;
      }
      
      // Step 2: Register driver 'Alex' with a valid driving license
      else if (walkthroughStep === 1) {
        updateStepUI("step-2", "active");
        walkthroughLog.textContent = "Step 2: Registering driver 'Alex'...";
        await sleep(1000);

        // Add 1 year to license validity
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 1);
        const expiryStr = expiry.toISOString().split('T')[0];

        window.TransitOpsDB.addDriver({
          id: "DL-ALEX99",
          name: "Alex",
          license_category: "Class C Standard",
          license_expiry: expiryStr,
          contact: "+1 (555) 444-2222",
          safety_score: 95,
          status: "Available"
        });

        updateStepUI("step-2", "completed");
        walkthroughLog.textContent = "SUCCESS: Driver 'Alex' registered with valid CDL expiry: " + expiryStr;
        showToast("Step 2 Complete: Driver Alex registered.", "success");
        walkthroughStep = 2;
      }

      // Step 3: Create a trip with cargo weight = 450kg
      else if (walkthroughStep === 2) {
        updateStepUI("step-3", "active");
        walkthroughLog.textContent = "Step 3: Creating Draft Trip with Cargo Weight = 450 kg...";
        await sleep(1000);

        window.TransitOpsDB.addTrip({
          source: "Chicago Depot",
          destination: "Gary Indiana Hub",
          vehicle_id: "VAN-05",
          driver_id: "DL-ALEX99",
          cargo_weight: 450,
          planned_distance: 60,
          revenue: 150
        });

        updateStepUI("step-3", "completed");
        walkthroughLog.textContent = "SUCCESS: Draft Trip created. Cargo weight (450kg) verified ≤ Van-05 capacity (500kg).";
        showToast("Step 3 Complete: Draft Trip created.", "success");
        walkthroughStep = 3;
      }

      // Step 4 & 5: Dispatch the trip (validates and changes vehicle/driver to On Trip)
      else if (walkthroughStep === 3) {
        updateStepUI("step-4-5", "active");
        walkthroughLog.textContent = "Step 4: Dispatching the trip...";
        await sleep(1000);

        // Find the trip we just created
        const trips = window.TransitOpsDB.getTrips();
        const trip = trips.find(t => t.vehicle_id === "VAN-05" && t.status === "Draft");
        
        if (trip) {
          window.TransitOpsDB.dispatchTrip(trip.id);
          
          // Verify status
          const vehicle = window.TransitOpsDB.getVehicles().find(v => v.id === "VAN-05");
          const driver = window.TransitOpsDB.getDrivers().find(d => d.id === "DL-ALEX99");

          updateStepUI("step-4-5", "completed");
          walkthroughLog.textContent = `SUCCESS: Trip dispatched! Van-05 status: '${vehicle.status}', Alex status: '${driver.status}'.`;
          showToast("Step 4 Complete: Trip Dispatched & status set to On Trip.", "success");
          walkthroughStep = 4;
        } else {
          throw new Error("Could not locate the draft trip.");
        }
      }

      // Step 6 & 7: Complete the trip
      else if (walkthroughStep === 4) {
        updateStepUI("step-6-7", "active");
        walkthroughLog.textContent = "Step 5: Completing trip. Recording fuel and odometer...";
        await sleep(1000);

        const trips = window.TransitOpsDB.getTrips();
        const trip = trips.find(t => t.vehicle_id === "VAN-05" && t.status === "Dispatched");
        
        if (trip) {
          // Completed with 12060 odo and 12 Liters of fuel
          window.TransitOpsDB.completeTrip(trip.id, 12060, 12);
          
          const vehicle = window.TransitOpsDB.getVehicles().find(v => v.id === "VAN-05");
          const driver = window.TransitOpsDB.getDrivers().find(d => d.id === "DL-ALEX99");

          updateStepUI("step-6-7", "completed");
          walkthroughLog.textContent = `SUCCESS: Trip finished. Odo: ${vehicle.odometer}km. Statuses: Vehicle: '${vehicle.status}', Driver: '${driver.status}'.`;
          showToast("Step 5 Complete: Trip Completed. Status restored to Available.", "success");
          walkthroughStep = 5;
        } else {
          throw new Error("Could not locate dispatched trip.");
        }
      }

      // Step 8: Create a maintenance record
      else if (walkthroughStep === 5) {
        updateStepUI("step-8", "active");
        walkthroughLog.textContent = "Step 6: Creating active maintenance (Oil Change) for Van-05...";
        await sleep(1000);

        window.TransitOpsDB.addMaintenanceLog({
          vehicle_id: "VAN-05",
          description: "Engine Oil Change & Air Filter",
          cost: 85,
          date: new Date().toISOString().split('T')[0]
        });

        const vehicle = window.TransitOpsDB.getVehicles().find(v => v.id === "VAN-05");

        updateStepUI("step-8", "completed");
        walkthroughLog.textContent = `SUCCESS: Maintenance logged. Van-05 status set to '${vehicle.status}'. It is hidden from dispatch select lists.`;
        showToast("Step 6 Complete: Vehicle put in maintenance (In Shop).", "success");
        walkthroughStep = 6;
        btnRunWorkflow.textContent = "Workflow Completed";
      }

      // Refresh data models in UI
      if (activeTab === "dashboard") {
        updateDashboardKPIs();
        renderDashboardCharts();
      }
      checkComplianceAlerts();

    } catch (err) {
      walkthroughLog.textContent = `ERROR: ${err.message}`;
      showToast(err.message, "error");
    } finally {
      btnRunWorkflow.disabled = false;
      btnResetWorkflow.disabled = false;
    }
  });

  function updateStepUI(stepId, state) {
    const el = document.getElementById(stepId);
    if (el) {
      el.className = `step-card ${state}`;
    }
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== MODAL OVERLAY TRANSITIONS ====================

  // Helper to open modal
  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add("active");
  }

  // Helper to close modal
  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove("active");
  }

  // Close modals when close buttons clicked
  document.querySelectorAll("[data-close-modal]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modalId = btn.getAttribute("data-close-modal");
      closeModal(modalId);
    });
  });

  // Close modals when clicking outside content
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeModal(overlay.id);
      }
    });
  });

});
