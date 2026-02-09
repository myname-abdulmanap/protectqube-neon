# Electricity Monitoring Dashboard – Functional UI Description

## Overview
This dashboard represents an IoT-based electricity monitoring system for retail and restaurant outlets.
It consists of two main dashboard types:
1. Single Outlet Dashboard (Operational View)
2. Regional / Multi-Outlet Dashboard (Head Office View)

The dashboard is designed using a card-based layout and modular components.
The system focuses on electricity usage (kWh), power load (kW), estimated cost (IDR), and operational alerts.

---

## 1. Single Outlet Electricity Dashboard

### Purpose
Used by outlet managers to monitor real-time electricity usage, detect overloads, and control operational cost.

---

### Header Section
- Dashboard title
- Current date
- Outlet name
- Notification icon showing active alerts

---

### KPI Summary Cards
Four key metric cards displayed at the top:
1. Today Usage (kWh)
2. Estimated Cost Today (IDR)
3. This Month Usage (kWh)
4. Estimated Monthly Cost (IDR)

Each card shows:
- Metric title
- Numeric value
- Unit (kWh or IDR)

---

### Real-Time Power Monitoring
- Gauge or indicator showing current power usage (kW)
- Displays load status:
  - NORMAL LOAD
  - OVERLOAD
- Shows peak power usage for the current day

---

### Hourly Energy Usage
- Bar chart displaying electricity usage per hour
- Time range from morning until evening
- Peak hour visually indicated
- Contextual time labels (e.g. lunch and dinner)
- Tooltip shows exact kW value per hour

---

### Energy Consumption by Section
- Donut or pie chart showing electricity usage distribution by area:
  - Kitchen
  - Dining Area
  - Signage & Lighting
- Displays percentage and kWh values
- Includes legend for each section

---

### Usage Comparison
- Comparison metrics:
  - Today vs Yesterday
  - This Month vs Last Month
- Displays percentage increase or decrease

---

### Alerts & Notifications
- Real-time alert list including:
  - OVERLOAD (peak load)
  - OVERLOAD (excessive load in kitchen)
  - ABNORMAL usage
  - DEVICE OFFLINE
- Each alert includes:
  - Timestamp
  - Severity level
  - Short description

---

## 2. Regional / Multi-Outlet Electricity Dashboard

### Purpose
Used by head office or operations teams to monitor electricity usage across multiple outlets and regions.

---

### Global KPI Summary
Four main indicators:
1. Total Energy Consumption This Month (kWh)
2. Estimated Total Cost This Month (IDR)
3. Active Outlets Count
4. Outlets with Active Alerts

---

### Region Comparison
- Bar chart comparing electricity usage by region:
  - Jakarta
  - West Java
  - Central Java
  - East Java
- Each region displays:
  - Total kWh
  - Estimated cost

---

### Outlet Status Overview
- Map visualization of Indonesia
- Each outlet has a status indicator:
  - Normal
  - High Usage
  - Alert
- Displays total outlet count per region

---

### Top Outlets by Region
- Table showing highest electricity usage outlets
- Columns:
  - Region
  - Outlet Name
  - Usage (kWh)

---

### Low Usage Outlets by Region
- Table showing lowest electricity usage outlets
- Columns:
  - Region
  - Outlet Name
  - Usage (kWh)
  - Estimated Cost (IDR)

---

### Monthly Energy Usage Trend
- Line chart showing monthly electricity usage
- Displays:
  - kWh consumption trend
  - Estimated cost trend
  - Actual cost trend

---

### Regional Alerts Log
- Centralized alert list from all outlets
- Includes:
  - Outlet or region name
  - Alert type
  - Time of occurrence
  - Impact estimation

---

## Technical Notes for Implementation

- Framework: Next.js (App Router)
- Language: TypeScript
- Component Architecture: Reusable dashboard widgets
- Charts: Recharts or Chart.js
- Map Visualization: react-simple-maps or Leaflet
- Data Source: Dummy JSON (can be replaced with real IoT data)
- Designed for scalability from single outlet to multi-region monitoring

---

## Intended Outcome
This dashboard enables:
- Monitoring electricity usage at outlet and regional level
- Early detection of abnormal power usage
- Operational cost awareness
- Centralized alert monitoring
- Integration with IoT-based electricity meters
