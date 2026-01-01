const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  // Auth APIs
  async login(councilId: string, password: string) {
    const response = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ councilId, password }),
    });
    return response;
  }

  // Admin APIs
  async createUser(councilId: string, password: string, role: string) {
    return this.request('/api/admin/create-user', {
      method: 'POST',
      body: JSON.stringify({ councilId, password, role }),
    });
  }

  async getUserStats() {
    return this.request('/api/admin/user-stats');
  }

  async bulkCreateUsers(formData: FormData) {
    const response = await fetch(`${API_URL}/api/admin/bulk-create-users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Upload failed');
    }

    return response.json();
  }

  // Profile APIs
  async createProfile(profileData: any) {
    const formData = new FormData();
    
    // Add all form fields
    Object.keys(profileData).forEach(key => {
      if (profileData[key] !== null && profileData[key] !== undefined) {
        formData.append(key, profileData[key]);
      }
    });

    const response = await fetch(`${API_URL}/api/profiles/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Profile creation failed');
    }

    return response.json();
  }

  async updateProfile(profileData: any) {
    return this.request('/api/profiles/update', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async getMyProfile() {
    return this.request('/api/profiles/my-profile');
  }

  // Attendance APIs
  async punchIn() {
    return this.request('/api/attendance/punch-in', {
      method: 'POST',
    });
  }

  async punchOut() {
    return this.request('/api/attendance/punch-out', {
      method: 'POST',
    });
  }

  async getMyAttendance() {
    return this.request('/api/attendance/my-attendance');
  }

  // Reports APIs
  async submitReport(formData: FormData) {
    const response = await fetch(`${API_URL}/api/reports/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Report submission failed');
    }

    return response.json();
  }

  async getMyReports() {
    return this.request('/api/reports/my-reports');
  }

  // Leave APIs
  async applyLeave(formData: FormData) {
    const response = await fetch(`${API_URL}/api/leaves/apply`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Leave application failed');
    }

    return response.json();
  }

  async getMyLeaves() {
    return this.request('/api/leaves/my-leaves');
  }

  // Committee Head APIs
  async getCommitteeInsights() {
    return this.request('/api/head/committee-insights');
  }

  async approveLeaveByHead(leaveId: number) {
    return this.request(`/api/head/approve-leave/${leaveId}`, {
      method: 'PUT',
    });
  }

  // GS APIs
  async getAllCommitteesInsights() {
    return this.request('/api/gs/all-committees-insights');
  }

  async approveLeaveByGS(leaveId: number) {
    return this.request(`/api/gs/approve-leave/${leaveId}`, {
      method: 'PUT',
    });
  }
}

export const apiClient = new ApiClient();