import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// API Base URL - should be configured via environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Token storage key
const TOKEN_KEY = 'auth_token';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		'Content-Type': 'application/json',
	},
	timeout: 30000, // 30 seconds
});

// Request interceptor - auto attach JWT token
apiClient.interceptors.request.use(
	(config: InternalAxiosRequestConfig) => {
		// Get token from localStorage (only in browser)
		if (typeof window !== 'undefined') {
			const token = localStorage.getItem(TOKEN_KEY);
			if (token && config.headers) {
				config.headers.Authorization = `Bearer ${token}`;
			}
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	},
);

// Response interceptor - handle 401 and redirect to login
apiClient.interceptors.response.use(
	(response) => response,
	(error: AxiosError) => {
		if (error.response?.status === 401) {
			// Clear token
			if (typeof window !== 'undefined') {
				localStorage.removeItem(TOKEN_KEY);
				// Redirect to login page
				window.location.href = '/login';
			}
		}
		return Promise.reject(error);
	},
);

// Token management utilities
export const authToken = {
	set: (token: string) => {
		if (typeof window !== 'undefined') {
			localStorage.setItem(TOKEN_KEY, token);
			// Also set as cookie for middleware to read
			document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
		}
	},
	get: () => {
		if (typeof window !== 'undefined') {
			return localStorage.getItem(TOKEN_KEY);
		}
		return null;
	},
	remove: () => {
		if (typeof window !== 'undefined') {
			localStorage.removeItem(TOKEN_KEY);
			// Also remove cookie
			document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
		}
	},
};

// API Response types
export interface ApiResponse<T = unknown> {
	success: boolean;
	data?: T;
	message?: string;
	error?: string;
}

// User types
export interface User {
	id: string;
	email: string;
	name: string;
	roleId: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
	scopeIds?: string[];
	role?: Role;
	menus?: Menu[];
}

export interface Role {
	id: string;
	name: string;
	description: string | null;
	createdAt: string;
	updatedAt: string;
	permissions?: Permission[];
}

export interface Menu {
	id: string;
	name: string;
	path: string;
	icon: string;
	selectorValue: string | null;
	order: number;
	parentId: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface Permission {
	id: string;
	name: string;
	description: string | null;
	resource: string | null;
	action: string | null;
	createdAt: string;
	updatedAt: string;
}

// IoT Platform types
export interface Tenant {
	id: string;
	name: string;
	code: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface Scope {
	id: string;
	tenantId: string;
	name: string;
	code: string;
	scopeType: string;
	address: string | null;
	city: string | null;
	province: string | null;
	region: string | null;
	latitude: number | null;
	longitude: number | null;
	metadata: unknown;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
	tenant?: Tenant;
}

export interface Device {
	id: string;
	scopeId: string;
	name: string;
	serialNo: string;
	locationName: string | null;
	locationType: string | null;
	latitude: number | null;
	longitude: number | null;
	firmwareVersion: string | null;
	status: string;
	deviceStatus: string | null;
	cpuTemp: number | null;
	cpuUsage: number | null;
	memoryUsedMb: number | null;
	memoryTotalMb: number | null;
	memoryUsagePercent: number | null;
	diskUsedGb: number | null;
	diskTotalGb: number | null;
	diskUsagePercent: number | null;
	uptime: string | null;
	loadAverage: number | null;
	internetStatus: string | null;
	powerStatus: string | null;
	lastSeenAt: string | null;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
	scope?: Scope;
	modules?: DeviceModule[];
}

export interface DeviceHealth {
	deviceId: string;
	deviceName: string;
	serialNo: string;
	scopeId: string;
	scopeName: string;
	region: string;
	currentStatus: string;
	uptime: string | null;
	lastSeenAt: string | null;
	offlineSinceAt: string | null;
	lastOfflineAt: string | null;
	offlineCount: number;
	internetStatus: string | null;
	powerStatus: string | null;
}

export interface DeviceHealthHistoryItem {
	id: string;
	topic: string;
	timestamp: string;
	status: string | null;
	internetStatus: string | null;
	powerStatus: string | null;
	dvrStatus: string | null;
	vpnStatus: string | null;
	inferenceStatus: string | null;
	mobileSignal: number | null;
	mobileQuality: string | null;
	operator: string | null;
	downloadMbps: number | null;
	uploadMbps: number | null;
	pingMs: number | null;
	firmwareVersion: string | null;
	uptime: string | null;
	cpuUsage: number | null;
	memoryUsagePercent: number | null;
	diskUsagePercent: number | null;
	payload: unknown;
}

export interface DeviceHealthHistoryData {
	device: {
		id: string;
		name: string;
		serialNo: string;
		firmwareVersion: string | null;
		currentStatus: string;
		lastSeenAt: string | null;
		scopeId: string;
		scopeName: string;
		region: string;
	};
	history: DeviceHealthHistoryItem[];
}

export interface DeviceModule {
	id: string;
	deviceId: string;
	moduleType: string;
	config: unknown;
	isActive: boolean;
	createdAt: string;
	device?: Device;
}

export interface MqttConfig {
	id: string;
	deviceId: string;
	brokerUrl: string;
	clientId: string;
	username: string | null;
	password: string | null;
	topicSubscribe: string;
	topicRole: string;
	parserKey: string | null;
	topicPublish: string | null;
	qos: number;
	isActive: boolean;
	createdAt: string;
	device?: Device;
}

export interface MqttMessage {
	id: string;
	deviceId: string;
	topic: string;
	payload: unknown;
	qos: number;
	retained: boolean;
	timestamp: string;
	createdAt: string;
	device?: Device;
}

export interface DeviceMetric {
	id: string;
	deviceId: string;
	scopeId: string;
	moduleType: string;
	metricKey: string;
	metricValue: number;
	unit: string | null;
	timestamp: string;
	createdAt: string;
	module?: DeviceModule;
}

export interface AlertEvent {
	id: string;
	deviceId: string;
	scopeId: string;
	actionId: string | null;
	moduleType: string;
	alertType: string;
	severity: string;
	title: string;
	description: string | null;
	metadata: unknown;
	timestamp: string;
	createdAt: string;
	action?: AlertAction | null;
	device?: Device;
}

export interface AlertAction {
	id: string;
	key: string;
	label: string;
	color: string;
	moduleType: string;
	isDefault: boolean;
	isActive: boolean;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

export interface EnergyConfig {
	id: string;
	scopeId: string;
	config?: {
		startPoint?: {
			startAt: string;
			initialKwh: number;
		};
		tariff?: {
			mode: "flat" | "tou";
			flatPricePerKwh?: number;
			timezone?: string;
			touPeriods?: Array<{
				id?: string;
				label: string;
				startTime: string;
				endTime: string;
				pricePerKwh: number;
			}>;
		};
		consumptionThresholds?: Array<{
			id?: string;
			period: string;
			thresholds: Array<{ value: number; severity: string }>;
		}>;
		costThresholds?: Array<{
			id?: string;
			period: string;
			thresholds: Array<{ value: number; severity: string }>;
		}>;
	};
	pricePerKwh: number;
	maxLoadKw: number | null;
	capacityVa: number | null;
	upperLimitKwh: number | null;
	validFrom: string;
	createdAt: string;
	scope?: Scope;
}

export interface EnergyOverviewData {
	date: string;
	range: {
		from: string;
		to: string;
		days: number;
		isSingleDay: boolean;
		label: string;
	};
	selection: {
		tenantId: string | null;
		tenantName: string | null;
		scopeId: string | null;
		scopeName: string | null;
		scopeCount: number;
		isAggregated: boolean;
	};
	globalKpi: {
		totalEnergy: number;
		totalCost: number;
		activeOutlets: number;
		alertOutlets: number;
		devicesOnline: number;
		devicesOffline: number;
		avgVoltage: number;
		avgCurrent: number;
		avgPower: number;
		peakPower: number;
	};
	regionData: Array<{
		region: string;
		kWh: number;
		cost: number;
		outlets: number;
	}>;
	outletLocations: Array<{
		id: string;
		name: string;
		tenantId: string;
		tenantName: string;
		region: string;
		city: string | null;
		province: string | null;
		address: string | null;
		lat: number | null;
		lng: number | null;
		status: string;
		usage: number;
		cost: number;
		devicesOnline: number;
		devicesOffline: number;
		devices: Array<{ id: string; name: string; online: boolean }>;
	}>;
	peakHours: Array<{
		hour: string;
		powerKw: number;
		samples: number;
	}>;
	hourlyEnergy: Array<{
		hour: string;
		kWh: number;
		samples: number;
	}>;
	hourlyEnergyDays: number;
	monthlyEnergyUse: Array<{
		timestamp: string;
		label: string;
		kWh: number;
	}>;
	trendSeries: {
		energy: Array<{ timestamp: string; label: string; kWh: number }>;
		power: Array<{ timestamp: string; label: string; value: number }>;
		voltage: Array<{ timestamp: string; label: string; value: number }>;
		current: Array<{ timestamp: string; label: string; value: number }>;
	};
	startingPoint: {
		appliedScopes: number;
		items: Array<{
			scopeId: string;
			startAt: string;
			initialKwh: number;
		}>;
	};
}

export interface EnergyPeakHoursData {
	generatedAt: string;
	scopeCount: number;
	summary: {
		peakHour: string | null;
		peakPowerKw: number;
		averagePowerKw: number;
		totalSamples: number;
	};
	chart: Array<{
		hour: string;
		powerKw: number;
		samples: number;
	}>;
	table: Array<{
		rank: number;
		hour: string;
		powerKw: number;
		samples: number;
		percentOfPeak: number;
	}>;
}

export interface EnergyOutletSummary {
	scopeId: string;
	status: string;
	totalUsage: number;
	totalCost: number;
	scope: {
		name: string;
		region: string | null;
	};
}

export interface EnergyOutletDetail {
	id: string;
	name: string;
	region: string | null;
	city: string | null;
	address: string | null;
	period: {
		from: string;
		to: string;
		days: number;
		isSingleDay: boolean;
		label: string;
	};
	kpiData: {
		totalUsage: number;
		totalCost: number;
		averageDailyUsage: number;
		averageDailyCost: number;
		latestDailyUsage: number;
		latestDailyCost: number;
		activeDevices: number;
		totalAlerts: number;
	};
	hourlyData: Array<{ hour: string; usage: number }>;
	sectionData: Array<{ name: string; value: number; kWh: number; color?: string }>;
	comparisonData: {
		currentPeriod: { current: number; previous: number; change: number };
		dailyAverage: { current: number; previous: number; change: number };
	};
	peakPower: number;
	maxLoad: number | null;
	status: string;
	devices: Array<{
		id: string;
		name: string;
		serialNo: string;
		locationName: string | null;
		locationType: string | null;
		status: string;
		lastSeenAt: string | null;
		moduleTypes: string[];
		latestPowerKw: number;
		metricCount: number;
		alertCount: number;
	}>;
	alertHistory: Array<{
		id: string;
		type: string;
		severity: string;
		message: string;
		timestamp: string;
		deviceName: string;
		locationName: string | null;
	}>;
	powerSeries: Array<{
		timestamp: string;
		deviceId: string;
		deviceName: string;
		powerKw: number;
	}>;
	startingPoint?: {
		startAt: string;
		initialKwh: number;
	} | null;
	analytics?: {
		peakPowerKw?: number;
		peakPowerAt?: string | null;
		avgPowerKw?: number;
		avgVoltageV?: number;
		avgCurrentA?: number;
		avgPfSigma?: number;
		totalEnergyKwh?: number;
		totalKvarh?: number;
		peakHour?: number | null;
		peakHourAvgKw?: number;
		overallAvgKwPerHour?: number;
		peakHourAvgKwh?: number;
		overallAvgKwhPerHour?: number;
		totalKvarhDelta: number;
		avgFrequencyHz: number | null;
	};
}

export interface HistoryRow {
	timestamp: string;
	pf_a: number | null;
	pf_b: number | null;
	pf_c: number | null;
	pf_sigma: number | null;
	voltage_l1: number | null;
	voltage_l2: number | null;
	voltage_l3: number | null;
	voltage_ab: number | null;
	voltage_bc: number | null;
	voltage_ca: number | null;
	current_l1: number | null;
	current_l2: number | null;
	current_l3: number | null;
	current_total: number | null;
	power_l1: number | null;
	power_l2: number | null;
	power_l3: number | null;
	power_total: number | null;
	reactive_l1: number | null;
	reactive_l2: number | null;
	reactive_l3: number | null;
	reactive_sigma: number | null;
	va_a: number | null;
	va_b: number | null;
	va_c: number | null;
	va_sigma: number | null;
	energy_total: number | null;
	kvarh: number | null;
	frequency: number | null;
}

export interface HistoryPageData {
	rows: HistoryRow[];
	nextCursor: string | null;
	total: number | null;
}

export interface EnergyDashboardFilters {
	date?: string;
	from?: string;
	to?: string;
	tenantId?: string;
	scopeId?: string;
	includeHeavy?: boolean;
}

export interface HourlyDailyEnergyDay {
	date: string;
	label: string;
	weekday: string;
	hours: Array<{
		hour: number;
		label: string;
		energyKwh: number;
		hasData: boolean;
	}>;
	totalKwh: number;
	peakHour: number | null;
	peakHourKwh: number;
}

export interface HourlyDailyEnergyData {
	days: HourlyDailyEnergyDay[];
	meta: {
		from: string;
		to: string;
		scopeId: string;
		peakHour: number | null;
		peakHourLabel: string | null;
		avgDailyKwh: number;
	};
}

export interface CalibrationHistoryRow {
	id: string;
	scopeId: string;
	pqDeviceId: string;
	pqDeviceName: string;
	firmwareVersion: string | null;
	date: string;
	intervalLabel: string;
	periodStartAt: string | null;
	prevReadingAt: string | null;
	intervalDays: number;
	readingAt: string;
	plnEnergyKwh: number;
	protectCubeEnergyKwh: number;
	protectCubeSampleAt: string | null;
	protectCubeSampleOffsetSeconds: number | null;
	protectCubeSampleSource: 'raw';
	deltaPln: number;
	deltaPq: number;
	gapKwh: number;
	gapPercent: number;
	accuracyPercent: number;
	ctRatio: number | null;
	note: string | null;
	createdBy: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface CalibrationHistoryData {
	rows: CalibrationHistoryRow[];
	summary: {
		avgGapKwh: number;
		avgGapPercent: number;
		avgAccuracyPercent: number;
		totalRows: number;
	};
}

export interface ExportProcessedHourBucket {
	timestamp: string;
	label: string;
	energyKwh: number | null;
	avgKvarh: number | null;
	avgPowerKw: number | null;
	avgVoltL1: number | null;
	avgVoltL2: number | null;
	avgVoltL3: number | null;
	avgCurrL1: number | null;
	avgCurrL2: number | null;
	avgCurrL3: number | null;
	avgCurrTotal: number | null;
	avgPf: number | null;
	avgFreq: number | null;
}

export interface ExportProcessedDayBucket extends ExportProcessedHourBucket {
	hours: ExportProcessedHourBucket[];
}

export interface ExportProcessedData {
	scope: {
		id: string;
		name: string;
		region: string | null;
		city: string | null;
		address: string | null;
		capacityVa: number | null;
	};
	devices: Array<{
		id: string;
		name: string;
		serialNo: string;
		locationName: string | null;
		locationType: string | null;
		status: string;
		lastSeenAt: string | null;
		moduleTypes: string[];
	}>;
	period: {
		from: string;
		to: string;
		label: string;
		isSingleDay: boolean;
	};
	analytics: {
		peakLabel: string | null;
		peakPowerKw: number;
		totalEnergyKwh: number;
		totalKvarh: number;
		avgEnergyKwh: number;
		avgPowerKw: number;
		avgVoltageV: number;
		avgCurrentA: number;
		avgPf: number;
		avgFreqHz: number;
	};
	hourlyBuckets: ExportProcessedHourBucket[];
	dailyBuckets: ExportProcessedDayBucket[];
}

export interface ExportRawRow {
	timestamp: string;
	pf_a: number | null;
	pf_b: number | null;
	pf_c: number | null;
	pf_sigma: number | null;
	voltage_l1: number | null;
	voltage_l2: number | null;
	voltage_l3: number | null;
	voltage_ab: number | null;
	voltage_bc: number | null;
	voltage_ca: number | null;
	current_l1: number | null;
	current_l2: number | null;
	current_l3: number | null;
	current_total: number | null;
	power_l1: number | null;
	power_l2: number | null;
	power_l3: number | null;
	power_total: number | null;
	reactive_l1: number | null;
	reactive_l2: number | null;
	reactive_l3: number | null;
	reactive_sigma: number | null;
	va_a: number | null;
	va_b: number | null;
	va_c: number | null;
	va_sigma: number | null;
	energy_total: number | null;
	kvarh: number | null;
	frequency: number | null;
}

export interface ExportRawData {
	rows: ExportRawRow[];
	scope: {
		id: string;
		name: string;
		region: string | null;
		city: string | null;
		address: string | null;
		capacityVa: number | null;
	};
	devices: Array<{
		id: string;
		name: string;
		serialNo: string;
		locationName: string | null;
		locationType: string | null;
		status: string;
		lastSeenAt: string | null;
		moduleTypes: string[];
	}>;
	period: { from: string; to: string };
}

export interface LoginResponse {
	token: string;
	user: User;
}

// Auth API
export const authApi = {
	login: async (email: string, password: string): Promise<ApiResponse<LoginResponse>> => {
		const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', {
			email,
			password,
		});
		// Auto-save token on successful login
		if (response.data.success && response.data.data?.token) {
			authToken.set(response.data.data.token);
		}
		return response.data;
	},

	getCurrentUser: async (): Promise<ApiResponse<User>> => {
		const response = await apiClient.get<ApiResponse<User>>('/auth/me');
		return response.data;
	},

	logout: () => {
		authToken.remove();
		if (typeof window !== 'undefined') {
			window.location.href = '/login';
		}
	},

	changePassword: async (oldPassword: string, newPassword: string): Promise<ApiResponse<void>> => {
		const response = await apiClient.post<ApiResponse<void>>('/auth/change-password', { oldPassword, newPassword });
		return response.data;
	},
};

// Users API
export const usersApi = {
	getAll: async (): Promise<ApiResponse<User[]>> => {
		const response = await apiClient.get<ApiResponse<User[]>>('/users');
		return response.data;
	},

	getById: async (id: string): Promise<ApiResponse<User>> => {
		const response = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
		return response.data;
	},

	create: async (data: {
		email: string;
		password: string;
		name: string;
		roleId: string;
		scopeIds: string[];
	}): Promise<ApiResponse<User>> => {
		const response = await apiClient.post<ApiResponse<User>>('/users', data);
		return response.data;
	},

	update: async (
		id: string,
		data: {
			email?: string;
			password?: string;
			name?: string;
			roleId?: string;
			isActive?: boolean;
			scopeIds?: string[];
		},
	): Promise<ApiResponse<User>> => {
		const response = await apiClient.put<ApiResponse<User>>(`/users/${id}`, data);
		return response.data;
	},

	delete: async (id: string): Promise<ApiResponse<void>> => {
		const response = await apiClient.delete<ApiResponse<void>>(`/users/${id}`);
		return response.data;
	},
};

// Roles API
export const rolesApi = {
	getAll: async (): Promise<ApiResponse<Role[]>> => {
		const response = await apiClient.get<ApiResponse<Role[]>>('/roles');
		return response.data;
	},

	getById: async (id: string): Promise<ApiResponse<Role>> => {
		const response = await apiClient.get<ApiResponse<Role>>(`/roles/${id}`);
		return response.data;
	},

	create: async (data: { name: string; description?: string }): Promise<ApiResponse<Role>> => {
		const response = await apiClient.post<ApiResponse<Role>>('/roles', data);
		return response.data;
	},

	update: async (id: string, data: { name?: string; description?: string }): Promise<ApiResponse<Role>> => {
		const response = await apiClient.put<ApiResponse<Role>>(`/roles/${id}`, data);
		return response.data;
	},

	delete: async (id: string): Promise<ApiResponse<void>> => {
		const response = await apiClient.delete<ApiResponse<void>>(`/roles/${id}`);
		return response.data;
	},

	assignPermission: async (roleId: string, permissionId: string): Promise<ApiResponse<void>> => {
		const response = await apiClient.post<ApiResponse<void>>(`/roles/${roleId}/permissions`, { permissionId });
		return response.data;
	},

	revokePermission: async (roleId: string, permissionId: string): Promise<ApiResponse<void>> => {
		const response = await apiClient.delete<ApiResponse<void>>(`/roles/${roleId}/permissions/${permissionId}`);
		return response.data;
	},
};

export const menusApi = {
	getAll: async (): Promise<ApiResponse<Menu[]>> => {
		const response = await apiClient.get<ApiResponse<Menu[]>>('/menus');
		return response.data;
	},

	getById: async (id: string): Promise<ApiResponse<Menu>> => {
		const response = await apiClient.get<ApiResponse<Menu>>(`/menus/${id}`);
		return response.data;
	},

	create: async (data: {
		name: string;
		path: string;
		icon: string;
		selectorValue?: string;
		order?: number;
		parentId?: string;
	}): Promise<ApiResponse<Menu>> => {
		const response = await apiClient.post<ApiResponse<Menu>>('/menus', data);
		return response.data;
	},

	update: async (
		id: string,
		data: {
			name?: string;
			path?: string;
			icon?: string;
			selectorValue?: string;
			order?: number;
			parentId?: string;
		},
	): Promise<ApiResponse<Menu>> => {
		const response = await apiClient.put<ApiResponse<Menu>>(`/menus/${id}`, data);
		return response.data;
	},

	delete: async (id: string): Promise<ApiResponse<void>> => {
		const response = await apiClient.delete<ApiResponse<void>>(`/menus/${id}`);
		return response.data;
	},

	getRoles: async (menuId: string): Promise<ApiResponse<string[]>> => {
		const response = await apiClient.get<ApiResponse<string[]>>(`/menus/${menuId}/roles`);
		return response.data;
	},

	assignRole: async (menuId: string, roleId: string): Promise<ApiResponse<void>> => {
		const response = await apiClient.post<ApiResponse<void>>(`/menus/${menuId}/roles`, {
			roleId,
		});
		return response.data;
	},

	revokeRole: async (menuId: string, roleId: string): Promise<ApiResponse<void>> => {
		const response = await apiClient.delete<ApiResponse<void>>(`/menus/${menuId}/roles/${roleId}`);
		return response.data;
	},
};

// Permissions API
export const permissionsApi = {
	getAll: async (): Promise<ApiResponse<Permission[]>> => {
		const response = await apiClient.get<ApiResponse<Permission[]>>('/permissions');
		return response.data;
	},

	getById: async (id: string): Promise<ApiResponse<Permission>> => {
		const response = await apiClient.get<ApiResponse<Permission>>(`/permissions/${id}`);
		return response.data;
	},

	create: async (data: {
		name: string;
		description?: string;
		resource?: string;
		action?: string;
	}): Promise<ApiResponse<Permission>> => {
		const response = await apiClient.post<ApiResponse<Permission>>('/permissions', data);
		return response.data;
	},

	update: async (
		id: string,
		data: {
			name?: string;
			description?: string;
			resource?: string;
			action?: string;
		},
	): Promise<ApiResponse<Permission>> => {
		const response = await apiClient.put<ApiResponse<Permission>>(`/permissions/${id}`, data);
		return response.data;
	},

	delete: async (id: string): Promise<ApiResponse<void>> => {
		const response = await apiClient.delete<ApiResponse<void>>(`/permissions/${id}`);
		return response.data;
	},
};

// Admin-only route example
export const adminApi = {
	checkAdminAccess: async (): Promise<ApiResponse<{ message: string; user: unknown }>> => {
		const response = await apiClient.get<ApiResponse<{ message: string; user: unknown }>>('/admin-only');
		return response.data;
	},
};

// =====================
// IoT Platform APIs
// =====================

// Tenants API
export const tenantsApi = {
	getAll: async (): Promise<ApiResponse<Tenant[]>> => {
		const response = await apiClient.get<ApiResponse<Tenant[]>>('/tenants');
		return response.data;
	},
	getById: async (id: string): Promise<ApiResponse<Tenant>> => {
		const response = await apiClient.get<ApiResponse<Tenant>>(`/tenants/${id}`);
		return response.data;
	},
	create: async (data: { name: string; code: string; isActive?: boolean }): Promise<ApiResponse<Tenant>> => {
		const response = await apiClient.post<ApiResponse<Tenant>>('/tenants', data);
		return response.data;
	},
	update: async (
		id: string,
		data: { name?: string; code?: string; isActive?: boolean },
	): Promise<ApiResponse<Tenant>> => {
		const response = await apiClient.put<ApiResponse<Tenant>>(`/tenants/${id}`, data);
		return response.data;
	},
	delete: async (id: string): Promise<ApiResponse<void>> => {
		const response = await apiClient.delete<ApiResponse<void>>(`/tenants/${id}`);
		return response.data;
	},
};

// Scopes API
export const scopesApi = {
	getAll: async (tenantId?: string): Promise<ApiResponse<Scope[]>> => {
		const params = tenantId ? { tenantId } : {};
		const response = await apiClient.get<ApiResponse<Scope[]>>('/scopes', { params });
		return response.data;
	},
	getById: async (id: string): Promise<ApiResponse<Scope>> => {
		const response = await apiClient.get<ApiResponse<Scope>>(`/scopes/${id}`);
		return response.data;
	},
	create: async (data: {
		tenantId: string;
		name: string;
		code: string;
		scopeType: string;
		address?: string;
		city?: string;
		province?: string;
		region?: string;
		latitude?: number;
		longitude?: number;
		metadata?: unknown;
		isActive?: boolean;
	}): Promise<ApiResponse<Scope>> => {
		const response = await apiClient.post<ApiResponse<Scope>>('/scopes', data);
		return response.data;
	},
	update: async (
		id: string,
		data: {
			tenantId?: string;
			name?: string;
			code?: string;
			scopeType?: string;
			address?: string | null;
			city?: string | null;
			province?: string | null;
			region?: string | null;
			latitude?: number | null;
			longitude?: number | null;
			metadata?: unknown;
			isActive?: boolean;
		},
	): Promise<ApiResponse<Scope>> => {
		const response = await apiClient.put<ApiResponse<Scope>>(`/scopes/${id}`, data);
		return response.data;
	},
	delete: async (id: string): Promise<ApiResponse<void>> => {
		const response = await apiClient.delete<ApiResponse<void>>(`/scopes/${id}`);
		return response.data;
	},
};

// Devices API
export const devicesApi = {
	getAll: async (scopeId?: string): Promise<ApiResponse<Device[]>> => {
		const params = scopeId ? { scopeId } : {};
		const response = await apiClient.get<ApiResponse<Device[]>>('/devices', { params });
		return response.data;
	},
	getHealth: async (scopeId?: string): Promise<ApiResponse<DeviceHealth[]>> => {
		const params = scopeId ? { scopeId } : {};
		const response = await apiClient.get<ApiResponse<DeviceHealth[]>>('/devices/health', { params });
		return response.data;
	},
	getHealthHistory: async (deviceId: string, limit?: number): Promise<ApiResponse<DeviceHealthHistoryData>> => {
		const params = limit ? { limit } : {};
		const response = await apiClient.get<ApiResponse<DeviceHealthHistoryData>>(
			`/devices/health/${deviceId}/history`,
			{
				params,
			},
		);
		return response.data;
	},
	getById: async (id: string): Promise<ApiResponse<Device>> => {
		const response = await apiClient.get<ApiResponse<Device>>(`/devices/${id}`);
		return response.data;
	},
	create: async (data: {
		scopeId: string;
		name: string;
		serialNo: string;
		locationName?: string;
		locationType?: string;
		latitude?: number | null;
		longitude?: number | null;
		firmwareVersion?: string;
		status?: string;
		isActive?: boolean;
	}): Promise<ApiResponse<Device>> => {
		const response = await apiClient.post<ApiResponse<Device>>('/devices', data);
		return response.data;
	},
	update: async (
		id: string,
		data: {
			scopeId?: string;
			name?: string;
			serialNo?: string;
			locationName?: string | null;
			locationType?: string | null;
			latitude?: number | null;
			longitude?: number | null;
			firmwareVersion?: string;
			status?: string;
			deviceStatus?: string | null;
			cpuTemp?: number | null;
			cpuUsage?: number | null;
			memoryUsedMb?: number | null;
			memoryTotalMb?: number | null;
			memoryUsagePercent?: number | null;
			diskUsedGb?: number | null;
			diskTotalGb?: number | null;
			diskUsagePercent?: number | null;
			uptime?: string | null;
			loadAverage?: number | null;
			internetStatus?: string | null;
			powerStatus?: string | null;
			isActive?: boolean;
		},
	): Promise<ApiResponse<Device>> => {
		const response = await apiClient.put<ApiResponse<Device>>(`/devices/${id}`, data);
		return response.data;
	},
	delete: async (id: string): Promise<ApiResponse<void>> => {
		const response = await apiClient.delete<ApiResponse<void>>(`/devices/${id}`);
		return response.data;
	},
};

// Device Modules API
export const deviceModulesApi = {
	getAll: async (deviceId?: string): Promise<ApiResponse<DeviceModule[]>> => {
		const params = deviceId ? { deviceId } : {};
		const response = await apiClient.get<ApiResponse<DeviceModule[]>>('/device-modules', { params });
		return response.data;
	},
	getById: async (id: string): Promise<ApiResponse<DeviceModule>> => {
		const response = await apiClient.get<ApiResponse<DeviceModule>>(`/device-modules/${id}`);
		return response.data;
	},
	create: async (data: {
		deviceId: string;
		moduleType: string;
		config?: unknown;
		isActive?: boolean;
	}): Promise<ApiResponse<DeviceModule>> => {
		const response = await apiClient.post<ApiResponse<DeviceModule>>('/device-modules', data);
		return response.data;
	},
	update: async (id: string, data: { config?: unknown; isActive?: boolean }): Promise<ApiResponse<DeviceModule>> => {
		const response = await apiClient.put<ApiResponse<DeviceModule>>(`/device-modules/${id}`, data);
		return response.data;
	},
	delete: async (id: string): Promise<ApiResponse<void>> => {
		const response = await apiClient.delete<ApiResponse<void>>(`/device-modules/${id}`);
		return response.data;
	},
};

// MQTT Configs API
export const mqttConfigsApi = {
	getAll: async (deviceId?: string): Promise<ApiResponse<MqttConfig[]>> => {
		const params = deviceId ? { deviceId } : {};
		const response = await apiClient.get<ApiResponse<MqttConfig[]>>('/mqtt-configs', { params });
		return response.data;
	},
	getById: async (id: string): Promise<ApiResponse<MqttConfig>> => {
		const response = await apiClient.get<ApiResponse<MqttConfig>>(`/mqtt-configs/${id}`);
		return response.data;
	},
	create: async (data: {
		deviceId: string;
		brokerUrl: string;
		clientId: string;
		username?: string;
		password?: string;
		topicSubscribe: string;
		topicRole?: string;
		parserKey?: string;
		topicPublish?: string;
		qos?: number;
		isActive?: boolean;
	}): Promise<ApiResponse<MqttConfig>> => {
		const response = await apiClient.post<ApiResponse<MqttConfig>>('/mqtt-configs', data);
		return response.data;
	},
	update: async (
		id: string,
		data: {
			brokerUrl?: string;
			clientId?: string;
			username?: string;
			password?: string;
			topicSubscribe?: string;
			topicRole?: string;
			parserKey?: string;
			topicPublish?: string;
			qos?: number;
			isActive?: boolean;
		},
	): Promise<ApiResponse<MqttConfig>> => {
		const response = await apiClient.put<ApiResponse<MqttConfig>>(`/mqtt-configs/${id}`, data);
		return response.data;
	},
	delete: async (id: string): Promise<ApiResponse<void>> => {
		const response = await apiClient.delete<ApiResponse<void>>(`/mqtt-configs/${id}`);
		return response.data;
	},
};

// MQTT Messages API
export const mqttMessagesApi = {
	getAll: async (filters?: {
		deviceId?: string;
		topic?: string;
		from?: string;
		to?: string;
		limit?: number;
	}): Promise<ApiResponse<MqttMessage[]>> => {
		const response = await apiClient.get<ApiResponse<MqttMessage[]>>('/mqtt-messages', { params: filters });
		return response.data;
	},
};

// Device Metrics API
export const deviceMetricsApi = {
	getAll: async (filters?: {
		deviceId?: string;
		scopeId?: string;
		scopeIds?: string[];
		moduleType?: string;
		metricKey?: string;
		from?: string;
		to?: string;
		limit?: number;
	}): Promise<ApiResponse<DeviceMetric[]>> => {
		const response = await apiClient.get<ApiResponse<DeviceMetric[]>>('/device-metrics', { params: filters });
		return response.data;
	},
	getLatest: async (
		scopeId: string,
		moduleType?: string,
	): Promise<
		ApiResponse<
			Array<{
				deviceId: string;
				scopeId: string;
				moduleType: string;
				metricKey: string;
				metricValue: number;
				unit: string | null;
				timestamp: string;
			}>
		>
	> => {
		const response = await apiClient.get('/device-metrics/latest', {
			params: { scopeId, ...(moduleType ? { moduleType } : {}) },
		});
		return response.data;
	},
	getAggregated: async (params: {
		scopeId?: string;
		moduleType?: string;
		from: string;
		to: string;
		interval?: 'hour' | 'day';
	}): Promise<
		ApiResponse<Array<{ timestamp: string; metricKey: string; avg: number; min: number; max: number }>>
	> => {
		const response = await apiClient.get('/device-metrics/aggregated', { params });
		return response.data;
	},
	getMidnightReadings: async (params: {
		scopeId?: string;
		from: string;
		to: string;
	}): Promise<
		ApiResponse<Array<{ timestamp: string; metricKey: string; avg: number; min: number; max: number }>>
	> => {
		const response = await apiClient.get('/device-metrics/midnight-readings', { params });
		return response.data;
	},
	getPaginated: async (params: {
		scopeId: string;
		moduleType?: string;
		from?: string;
		to?: string;
		page?: number;
		pageSize?: number;
	}): Promise<
		ApiResponse<DeviceMetric[]> & { total: number; page: number; pageSize: number; totalPages: number }
	> => {
		const response = await apiClient.get('/device-metrics/paginated', { params });
		return response.data;
	},
	getPaginatedGrouped: async (params: {
		scopeId: string;
		moduleType?: string;
		from?: string;
		to?: string;
		page?: number;
		pageSize?: number;
	}): Promise<
		ApiResponse<Array<{ timestamp: string; metricKey: string; metricValue: number }>> & {
			total: number;
			page: number;
			pageSize: number;
			totalPages: number;
		}
	> => {
		const response = await apiClient.get('/device-metrics/paginated-grouped', { params });
		return response.data;
	},
	create: async (data: {
		deviceId: string;
		scopeId?: string;
		moduleType: string;
		metricKey: string;
		metricValue: number;
		unit?: string;
		timestamp: string;
	}): Promise<ApiResponse<DeviceMetric>> => {
		const response = await apiClient.post<ApiResponse<DeviceMetric>>('/device-metrics', data);
		return response.data;
	},
	createBatch: async (
		data: Array<{
			deviceId: string;
			scopeId?: string;
			moduleType: string;
			metricKey: string;
			metricValue: number;
			unit?: string;
			timestamp: string;
		}>,
	): Promise<ApiResponse<{ count: number }>> => {
		const response = await apiClient.post<ApiResponse<{ count: number }>>('/device-metrics/batch', data);
		return response.data;
	},
};

// Alert Events API
export const alertEventsApi = {
	getAll: async (filters?: {
		deviceId?: string;
		scopeId?: string;
		moduleType?: string;
		severity?: string;
		actionKey?: string;
		excludeActionKey?: string;
		from?: string;
		to?: string;
		limit?: number;
	}): Promise<ApiResponse<AlertEvent[]>> => {
		const response = await apiClient.get<ApiResponse<AlertEvent[]>>('/alert-events', { params: filters });
		return response.data;
	},
	getById: async (id: string): Promise<ApiResponse<AlertEvent>> => {
		const response = await apiClient.get<ApiResponse<AlertEvent>>(`/alert-events/${id}`);
		return response.data;
	},
	create: async (data: {
		deviceId: string;
		scopeId?: string;
		moduleType: string;
		alertType: string;
		severity: string;
		title: string;
		description?: string;
		metadata?: unknown;
		timestamp: string;
	}): Promise<ApiResponse<AlertEvent>> => {
		const response = await apiClient.post<ApiResponse<AlertEvent>>('/alert-events', data);
		return response.data;
	},
	updateAction: async (
		id: string,
		data: { actionId?: string; actionKey?: string },
	): Promise<ApiResponse<AlertEvent>> => {
		const response = await apiClient.patch<ApiResponse<AlertEvent>>(`/alert-events/${id}/action`, data);
		return response.data;
	},
	bulkUpdateAction: async (data: {
		actionKey: string;
		filterActionKey?: string;
	}): Promise<ApiResponse<{ updatedCount: number }>> => {
		const response = await apiClient.patch<ApiResponse<{ updatedCount: number }>>('/alert-events/bulk-action', data);
		return response.data;
	},
	deleteOne: async (id: string): Promise<ApiResponse<void>> => {
		const response = await apiClient.delete<ApiResponse<void>>(`/alert-events/${id}`);
		return response.data;
	},
	bulkDelete: async (ids: string[]): Promise<ApiResponse<{ deletedCount: number }>> => {
		const response = await apiClient.delete<ApiResponse<{ deletedCount: number }>>('/alert-events/bulk-delete', { data: { ids } });
		return response.data;
	},
};

export const alertActionsApi = {
	getAll: async (moduleType?: string): Promise<ApiResponse<AlertAction[]>> => {
		const params = moduleType ? { moduleType } : {};
		const response = await apiClient.get<ApiResponse<AlertAction[]>>('/alert-actions', { params });
		return response.data;
	},
	create: async (data: {
		key: string;
		label: string;
		color: string;
		moduleType: string;
		isDefault?: boolean;
		isActive?: boolean;
		sortOrder?: number;
	}): Promise<ApiResponse<AlertAction>> => {
		const response = await apiClient.post<ApiResponse<AlertAction>>('/alert-actions', data);
		return response.data;
	},
	update: async (
		id: string,
		data: {
			key?: string;
			label?: string;
			color?: string;
			moduleType?: string;
			isDefault?: boolean;
			isActive?: boolean;
			sortOrder?: number;
		},
	): Promise<ApiResponse<AlertAction>> => {
		const response = await apiClient.put<ApiResponse<AlertAction>>(`/alert-actions/${id}`, data);
		return response.data;
	},
	delete: async (id: string): Promise<ApiResponse<void>> => {
		const response = await apiClient.delete<ApiResponse<void>>(`/alert-actions/${id}`);
		return response.data;
	},
};

// Energy Configs API
export const energyConfigsApi = {
	getAll: async (scopeId?: string): Promise<ApiResponse<EnergyConfig[]>> => {
		const params = scopeId ? { scopeId } : {};
		const response = await apiClient.get<ApiResponse<EnergyConfig[]>>('/energy-configs', { params });
		return response.data;
	},
	getById: async (id: string): Promise<ApiResponse<EnergyConfig>> => {
		const response = await apiClient.get<ApiResponse<EnergyConfig>>(`/energy-configs/${id}`);
		return response.data;
	},
	create: async (data: {
		scopeId: string;
		pricePerKwh?: number;
		maxLoadKw?: number;
		capacityVa?: number;
		upperLimitKwh?: number;
		config?: {
			startPoint?: {
				startAt: string;
				initialKwh: number;
			};
			tariff?: {
				mode: "flat" | "tou";
				flatPricePerKwh?: number;
				timezone?: string;
				touPeriods?: Array<{
					id?: string;
					label: string;
					startTime: string;
					endTime: string;
					pricePerKwh: number;
				}>;
			};
			consumptionThresholds?: Array<{
				id?: string;
				period: string;
				thresholds: Array<{ value: number; severity: string }>;
			}>;
			costThresholds?: Array<{
				id?: string;
				period: string;
				thresholds: Array<{ value: number; severity: string }>;
			}>;
		};
		validFrom: string;
	}): Promise<ApiResponse<EnergyConfig>> => {
		const response = await apiClient.post<ApiResponse<EnergyConfig>>('/energy-configs', data);
		return response.data;
	},
	update: async (
		id: string,
		data: {
			pricePerKwh?: number;
			maxLoadKw?: number;
			capacityVa?: number;
			upperLimitKwh?: number;
			config?: {
				startPoint?: {
					startAt: string;
					initialKwh: number;
				};
				tariff?: {
					mode: "flat" | "tou";
					flatPricePerKwh?: number;
					timezone?: string;
					touPeriods?: Array<{
						id?: string;
						label: string;
						startTime: string;
						endTime: string;
						pricePerKwh: number;
					}>;
				};
				consumptionThresholds?: Array<{
					id?: string;
					period: string;
					thresholds: Array<{ value: number; severity: string }>;
				}>;
				costThresholds?: Array<{
					id?: string;
					period: string;
					thresholds: Array<{ value: number; severity: string }>;
				}>;
			};
			validFrom?: string;
		},
	): Promise<ApiResponse<EnergyConfig>> => {
		const response = await apiClient.put<ApiResponse<EnergyConfig>>(`/energy-configs/${id}`, data);
		return response.data;
	},
	delete: async (id: string): Promise<ApiResponse<void>> => {
		const response = await apiClient.delete<ApiResponse<void>>(`/energy-configs/${id}`);
		return response.data;
	},
};

export const energyDashboardApi = {
	getOverview: async (filters?: EnergyDashboardFilters): Promise<ApiResponse<EnergyOverviewData>> => {
		const params = filters || {};
		const response = await apiClient.get<ApiResponse<EnergyOverviewData>>('/energy-dashboard/overview', { params });
		return response.data;
	},
	getPeakHours: async (): Promise<ApiResponse<EnergyPeakHoursData>> => {
		const response = await apiClient.get<ApiResponse<EnergyPeakHoursData>>('/energy-dashboard/peak-hours');
		return response.data;
	},
	getOutlets: async (filters?: EnergyDashboardFilters): Promise<ApiResponse<EnergyOutletSummary[]>> => {
		const params = filters || {};
		const response = await apiClient.get<ApiResponse<EnergyOutletSummary[]>>('/energy-dashboard/outlets', {
			params,
		});
		return response.data;
	},
	getOutletDetail: async (
		scopeId: string,
		filters?: EnergyDashboardFilters,
	): Promise<ApiResponse<EnergyOutletDetail>> => {
		const params = filters || {};
		const response = await apiClient.get<ApiResponse<EnergyOutletDetail>>(`/energy-dashboard/outlets/${scopeId}`, {
			params,
		});
		return response.data;
	},
	getOutletHistory: async (
		scopeId: string,
		filters?: EnergyDashboardFilters & { cursor?: string; pageSize?: number; search?: string },
	): Promise<ApiResponse<HistoryPageData>> => {
		const params = filters || {};
		const response = await apiClient.get<ApiResponse<HistoryPageData>>(
			`/energy-dashboard/outlets/${scopeId}/history`,
			{ params },
		);
		return response.data;
	},
	getHourlyDailyEnergy: async (
		scopeId: string,
		from: string,
		to: string,
	): Promise<ApiResponse<HourlyDailyEnergyData>> => {
		const response = await apiClient.get<ApiResponse<HourlyDailyEnergyData>>(
			`/energy-dashboard/outlets/${scopeId}/hourly-energy`,
			{ params: { from, to } },
		);
		return response.data;
	},
	getDailyCalibration: async (
		scopeId: string,
		filters?: { from?: string; to?: string },
	): Promise<ApiResponse<CalibrationHistoryData>> => {
		const response = await apiClient.get<ApiResponse<CalibrationHistoryData>>('/energy-dashboard/daily', {
			params: { scopeId, ...(filters || {}) },
		});
		return response.data;
	},
	getCalibrationHistory: async (
		scopeId: string,
		filters?: { from?: string; to?: string },
	): Promise<ApiResponse<CalibrationHistoryData>> => {
		const response = await apiClient.get<ApiResponse<CalibrationHistoryData>>('/energy-dashboard/calibration', {
			params: { scopeId, ...(filters || {}) },
		});
		return response.data;
	},
	createCalibration: async (data: {
		scopeId: string;
		timestamp: string;
		kwhPln: number;
		kwhPq?: number | null;
		pqDeviceId?: string;
		ctRatio?: number;
		note?: string;
		startTimestamp?: string;
	}): Promise<ApiResponse<{ id: string }>> => {
		const response = await apiClient.post<ApiResponse<{ id: string }>>('/energy-dashboard/calibration', data);
		return response.data;
	},
	updateCalibration: async (
		id: string,
		data: {
			timestamp?: string;
			kwhPln?: number;
			kwhPq?: number | null;
			pqDeviceId?: string;
			ctRatio?: number | null;
			note?: string | null;
			scopeId?: string;
			startTimestamp?: string | null;
		},
	): Promise<ApiResponse<{ id: string }>> => {
		const response = await apiClient.put<ApiResponse<{ id: string }>>(`/energy-dashboard/calibration/${id}`, data);
		return response.data;
	},
	deleteCalibration: async (id: string): Promise<ApiResponse<void>> => {
		const response = await apiClient.delete<ApiResponse<void>>(`/energy-dashboard/calibration/${id}`);
		return response.data;
	},
	getExportRaw: async (scopeId: string, from: string, to: string): Promise<ApiResponse<ExportRawData>> => {
		const response = await apiClient.get<ApiResponse<ExportRawData>>(
			`/energy-dashboard/outlets/${scopeId}/export/raw`,
			{ params: { from, to } },
		);
		return response.data;
	},

	getExportProcessed: async (
		scopeId: string,
		from: string,
		to: string,
	): Promise<ApiResponse<ExportProcessedData>> => {
		const response = await apiClient.get<ApiResponse<ExportProcessedData>>(
			`/energy-dashboard/outlets/${scopeId}/export/processed`,
			{ params: { from, to } },
		);
		return response.data;
	},
};

// Severity Config API
export interface SeverityConfig {
	id: string;
	tenantId: string | null;
	key: string;
	label: string;
	color: string;
	priority: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export const severityConfigsApi = {
	getAll: async (): Promise<ApiResponse<SeverityConfig[]>> => {
		const response = await apiClient.get<ApiResponse<SeverityConfig[]>>('/severity-configs');
		return response.data;
	},
	getByKey: async (key: string): Promise<ApiResponse<SeverityConfig>> => {
		const response = await apiClient.get<ApiResponse<SeverityConfig>>(`/severity-configs/${key}`);
		return response.data;
	},
	create: async (data: {
		key: string;
		label: string;
		color: string;
		priority: number;
	}): Promise<ApiResponse<SeverityConfig>> => {
		const response = await apiClient.post<ApiResponse<SeverityConfig>>('/severity-configs', data);
		return response.data;
	},
	update: async (
		id: string,
		data: {
			label?: string;
			color?: string;
			priority?: number;
			isActive?: boolean;
		},
	): Promise<ApiResponse<SeverityConfig>> => {
		const response = await apiClient.patch<ApiResponse<SeverityConfig>>(`/severity-configs/${id}`, data);
		return response.data;
	},
	delete: async (id: string): Promise<ApiResponse<void>> => {
		const response = await apiClient.delete<ApiResponse<void>>(`/severity-configs/${id}`);
		return response.data;
	},
};

// ====================
// TARIFF MANAGEMENT
// ====================

export interface TariffPeriod {
	id: string;
	label: string;
	startTime: string;
	endTime: string;
	pricePerKwh: number;
}

export interface TariffConfig {
	mode: 'flat' | 'tou';
	effectiveFrom: string;
	effectiveTo?: string;
	flat?: {
		pricePerKwh: number;
	};
	tou?: {
		periods: TariffPeriod[];
	};
}

export const tariffsApi = {
	getActive: async (scopeId: string): Promise<ApiResponse<TariffConfig | null>> => {
		const response = await apiClient.get<ApiResponse<TariffConfig | null>>(`/tariffs/${scopeId}`);
		return response.data;
	},
	getHistory: async (scopeId: string): Promise<ApiResponse<TariffConfig[]>> => {
		const response = await apiClient.get<ApiResponse<TariffConfig[]>>(`/tariffs/${scopeId}/history`);
		return response.data;
	},
	update: async (scopeId: string, config: TariffConfig): Promise<ApiResponse<void>> => {
		const response = await apiClient.patch<ApiResponse<void>>(`/tariffs/${scopeId}`, config);
		return response.data;
	},
	calculatePrice: async (scopeId: string, consumption: number): Promise<ApiResponse<{ consumption: number; price: number }>> => {
		const response = await apiClient.post<ApiResponse<{ consumption: number; price: number }>>(`/tariffs/${scopeId}/calculate-price`, {
			consumption,
		});
		return response.data;
	},
};

export default apiClient;
